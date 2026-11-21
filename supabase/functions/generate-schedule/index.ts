import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenAI } from "npm:@ai-sdk/openai";
import { jsonSchema, Output, streamText } from "npm:ai";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./run-id.ts";
import { normalizeSchedule } from "./schedule.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

const SYSTEM_PROMPT = `You are a senior commercial construction scheduler. Read the uploaded drawings and any estimating scope supplied.
Create a realistic contractor review schedule, not a cost estimate and not one task per cost line.
Include mobilization, submittals and procurement when needed, physical work in logical trade order, required inspections, testing, punch list and closeout.
Use the documents for quantities, phasing, specified milestones and constraints. Do not invent plan facts. Clearly identify assumptions.
Use Monday-Friday workdays. Durations are whole workdays and should reflect likely crew productivity, but remain planning assumptions for contractor review.
Only use predecessors that appear earlier in the task list. Allow independent work to overlap using start_offset_days.
Return 12-35 useful activities. Combine minor scope into meaningful activities; split major phases where useful for management.
Return ONLY valid JSON with this exact shape:
{
  "detected_start_date": "YYYY-MM-DD or null when the plans do not state one",
  "assumptions": ["short scheduling assumption"],
  "tasks": [{
    "id": "t1",
    "title": "scope-oriented activity name",
    "phase": "Preconstruction|Site|Structure|Envelope|Interiors|MEP|Closeout",
    "duration_days": 1,
    "start_offset_days": 0,
    "depends_on": ["t0"],
    "source": "sheet, schedule, estimate section, or professional assumption"
  }]
}`;

function toBase64(buf: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < buf.length; i += 0x10000) {
    parts.push(String.fromCharCode.apply(null, buf.subarray(i, i + 0x10000) as unknown as number[]));
  }
  return btoa(parts.join(""));
}

async function appendFile(content: any[], file: any, index: number, total: { bytes: number }, storageOrigin: string) {
  const url = typeof file === "string" ? file : file?.url;
  if (!url) return;
  let parsedUrl: URL;
  try { parsedUrl = new URL(url); } catch { throw new Error("A plan file has an invalid address."); }
  if (parsedUrl.origin !== storageOrigin) throw new Error("Plan files must come from this project's document storage.");
  const name = (typeof file === "string" ? `Plan ${index + 1}` : file?.name) || `Plan ${index + 1}`;
  const fileType = typeof file === "string" ? "" : file?.fileType || "";
  const isPdf = fileType.includes("pdf") || url.toLowerCase().endsWith(".pdf");
  const isImage = fileType.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(url);
  if (!isPdf && !isImage) throw new Error(`${name} is not a supported PDF or image.`);
  content.push({ type: "text", text: `Document ${index + 1}: ${name}` });
  if (isImage && !isPdf) {
    content.push({ type: "image", image: url });
    return;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read ${name}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_FILE_BYTES) throw new Error(`${name} is over the 12 MB per-file limit. Split or compress it first.`);
  if (total.bytes + bytes.length > MAX_TOTAL_BYTES) throw new Error("The plan set is over 30 MB. Upload fewer or smaller files at a time.");
  total.bytes += bytes.length;
  content.push({ type: "file", data: toBase64(bytes), mediaType: "application/pdf", filename: name });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in to generate a schedule." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!supabaseUrl || !anonKey || !apiKey) return json({ error: "The schedule service is not configured." }, 500);
    const auth = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError || !user) return json({ error: "Your session has expired. Sign in again." }, 401);

    const payload = await req.json();
    const files = Array.isArray(payload.files) ? payload.files : [];
    const estimateLines = Array.isArray(payload.estimateLines) ? payload.estimateLines : [];
    if (!files.length && !estimateLines.length) return json({ error: "Add plan documents or estimate scope first." }, 400);
    if (files.length > 20) return json({ error: "Upload no more than 20 plan files at once." }, 400);

    const scopeText = estimateLines.slice(0, 120).map((line: any) =>
      `- ${String(line.section || "General")}: ${String(line.name || "Scope")}${line.quantity ? ` (${Number(line.quantity)} ${line.unit || "units"})` : ""}`
    ).join("\n");
    const content: any[] = [{
      type: "text",
      text: `Project: ${String(payload.projectName || "Construction project")}\n` +
        `Scheduling preference: ${payload.dateMode === "plans" ? "Use a start date explicitly stated in the plans when available; otherwise use the supplied fallback." : "Use the supplied project start date."}\n` +
        `Start date or fallback: ${String(payload.startDate || "")}\n` +
        (scopeText ? `\nESTIMATING SCOPE (context only, do not price):\n${scopeText}` : ""),
    }];
    const total = { bytes: 0 };
    for (let i = 0; i < files.length; i++) await appendFile(content, files[i], i, total, new URL(supabaseUrl).origin);

    const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    const scheduleSchema = jsonSchema({
      type: "object",
      additionalProperties: false,
      properties: {
        detected_start_date: { type: ["string", "null"] },
        assumptions: { type: "array", items: { type: "string" } },
        tasks: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              phase: { type: "string" },
              duration_days: { type: "number" },
              start_offset_days: { type: "number" },
              depends_on: { type: "array", items: { type: "string" } },
              source: { type: "string" },
            },
            required: ["id", "title", "phase", "duration_days", "start_offset_days", "depends_on", "source"],
          },
        },
      },
      required: ["detected_start_date", "assumptions", "tasks"],
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output: Output.object({ schema: scheduleSchema }),
      maxOutputTokens: 16000,
      abortSignal: req.signal,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    for await (const part of result.fullStream) {
      if (part.type === "error") throw part.error;
    }
    const parsed: any = await result.output;
    if (!parsed) return json({ error: "The schedule service returned no activities." }, 502);
    return json(normalizeSchedule(parsed));
  } catch (error: any) {
    console.error("generate-schedule failed", error);
    const status = Number(error?.statusCode || error?.status) || 500;
    const message = status === 402 ? "AI credits are exhausted. Add credits in Settings → Plans & credits."
      : status === 429 ? "The AI service is busy. Try again in a moment."
      : error?.message || "Schedule generation failed.";
    return json({ error: message }, [401, 402, 413, 422, 429].includes(status) ? status : 500);
  }
});
