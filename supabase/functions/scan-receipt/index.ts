import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Reads a receipt photo/PDF and returns vendor, date, total and a suggested job.
 * Uses the same AI keys as parse-repair-invoice (GEMINI_API_KEY first, LOVABLE_API_KEY fallback).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  "Materials", "Labor", "Equipment", "Subcontractors", "Permits", "Travel", "Utilities",
  "Office Supplies", "Insurance", "Professional Services", "Fuel", "Maintenance", "Other",
];

const schema = {
  type: "object",
  properties: {
    vendor: { type: "string", nullable: true },
    date: { type: "string", nullable: true },
    total: { type: "number", nullable: true },
    tax: { type: "number", nullable: true },
    receipt_number: { type: "string", nullable: true },
    category: { type: "string", nullable: true },
    description: { type: "string", nullable: true },
    project_id: { type: "string", nullable: true },
    project_reason: { type: "string", nullable: true },
    confidence: { type: "number" },
  },
  required: ["confidence"],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!geminiKey && !lovableKey) return json({ error: "No AI key configured (GEMINI_API_KEY or LOVABLE_API_KEY)" }, 500);

    const { fileBase64, mimeType, fileName, projects } = await req.json();
    if (!fileBase64 || !mimeType) return json({ error: "Missing file" }, 400);

    const jobs = (projects || [])
      .map((p: any) => `- id=${p.id} | name=${p.name} | client=${p.client || "n/a"} | address=${p.address || "n/a"}`)
      .join("\n");

    const instruction = `You read construction purchase receipts (lumber yards, hardware stores, fuel, rentals, restaurants). The image may be a crumpled, angled phone photo or a thermal receipt. Extract:
- vendor: store or company name as printed.
- date: purchase date as ISO YYYY-MM-DD.
- total: the grand total actually paid in USD, as a number (no symbols). tax: sales tax if shown.
- receipt_number: receipt, invoice, order or transaction number if shown.
- category: exactly one of ${CATEGORIES.join(", ")}.
- description: a short summary of what was bought (e.g. "2x4 studs, deck screws, concrete mix").
- project_id: choose the most likely job from the list below using a job name, PO/job number, delivery address or customer name written on the receipt. If nothing on the receipt points to a job, return null. Never guess randomly.
- project_reason: one short phrase explaining the match, or null.
- confidence: 0-1 for how sure you are about vendor, date and total.

OPEN JOBS:
${jobs || "(none)"}

Never invent values that are not on the receipt.`;

    let raw: string | undefined;
    let lastError: { status: number; text: string } | null = null;

    if (geminiKey) {
      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: instruction }, { inlineData: { mimeType, data: fileBase64 } }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: schema },
          }),
        }
      );
      if (gRes.ok) {
        const g = await gRes.json();
        raw = g?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
      } else {
        lastError = { status: gRes.status, text: await gRes.text() };
      }
    }

    if (!raw && lovableKey) {
      const content: any[] = [{ type: "text", text: instruction }];
      if (String(mimeType).includes("pdf")) {
        content.push({ type: "file", file: { filename: fileName || "receipt.pdf", file_data: `data:${mimeType};base64,${fileBase64}` } });
      } else {
        content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } });
      }
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({ model: "google/gemini-3.6-flash", messages: [{ role: "user", content }], response_format: { type: "json_object" } }),
      });
      if (res.ok) {
        const d = await res.json();
        raw = d?.choices?.[0]?.message?.content ?? "";
      } else {
        lastError = { status: res.status, text: await res.text() };
      }
    }

    if (!raw) {
      const status = lastError?.status === 429 ? 429 : lastError?.status === 402 ? 402 : 500;
      const msg = status === 429
        ? "AI rate limit reached. Wait a minute and try again."
        : status === 402
        ? "AI credits exhausted. Add a Google Gemini API key or top up credits."
        : `Receipt reader failed: ${(lastError?.text || "unknown error").slice(0, 300)}`;
      return json({ error: msg }, status);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    // Only keep a project id the caller actually sent, and a category from the list.
    const ids = new Set((projects || []).map((p: any) => p.id));
    if (parsed.project_id && !ids.has(parsed.project_id)) parsed.project_id = null;
    if (parsed.category && !CATEGORIES.includes(parsed.category)) parsed.category = "Other";

    return json(parsed);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
