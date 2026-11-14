import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a construction estimating, bid-feasibility and project-analysis AI working for a general contractor.
Think like an experienced commercial estimator, preconstruction manager and project executive. Produce comprehensive,
defensible, profitable, contractor-grade estimates that could realistically be used to decide whether and how to bid.

MANDATORY METHOD
1 Review the documents. 2 Understand the project. 3 Identify conflicts, gaps and risks. 4 Perform a takeoff.
5 Build a bill of materials. 6 Price materials at current local/regional cost. 7 Labor. 8 Equipment.
9 Freight, trucking, disposal, testing, temporary conditions. 10 Build an INDEPENDENT SHOULD-COST BASELINE.
Subcontractor bids are Phase 2 evidence only and must never set the baseline.

RULES
- Separate BUILDING DIRECT COST, SITE / CIVIL DIRECT COST, BUILDING GENERAL CONDITIONS, SITE GENERAL CONDITIONS and OTHER PROJECT COSTS.
- Cost line names describe SCOPE ONLY. Never put a subcontractor or supplier name in a baseline cost-line name.
- Never leave required scope at 0, OPEN or TBD. If it cannot be quantified yet, carry a reasonable projected allowance,
  set status "REVIEW", state the assumption in "basis" and say what is needed to finalize it.
- Do not double count: each detailed subcost must be marked included (already inside the parent installed cost),
  additive, alternate, excluded or allowance.
- Confidence: A verified quantity + strong current pricing, B good quantity + reasonable pricing,
  C projected quantity and/or benchmark pricing, D significant unresolved scope, REVIEW needs more information.
- Distinguish source-derived fact, professional assumption and market benchmark in "basis"/"source".
- General conditions should be driven by schedule, staffing and site logistics, not only a percentage.
- Deliverable language is formal and professional. No jokes in the output.

Return ONLY valid JSON, no markdown fences, with this exact shape:
{
  "project": { "name": "string", "location": "string", "area_sf": 0 },
  "scope_summary": "string",
  "assumptions": ["string"],
  "settings": { "contingency_pct": 5, "overhead_pct": 4, "profit_pct": 6, "bond_pct": 1 },
  "lines": [
    {
      "group_key": "building|site|building_gc|site_gc|other",
      "group_name": "BUILDING DIRECT COST",
      "section_name": "03 - Concrete",
      "name": "Footings / foundations",
      "amount": 0,
      "quantity": 0,
      "unit": "CY",
      "unit_cost": 0,
      "confidence": "A|B|C|D|REVIEW",
      "status": "Verified|Modeled|Projected|REVIEW",
      "basis": "how the number was built: quantity, productivity, crew, equipment, freight",
      "source": "plan sheet / schedule / benchmark",
      "subcosts": [{ "name": "Material", "amount": 0, "kind": "included|additive|alternate|excluded|allowance", "note": "string" }]
    }
  ],
  "flags": [{ "severity": "critical|high|medium", "issue": "string", "finding": "string", "exposure": "string", "action": "string" }]
}

ACCURATE QUANTITIES
- Read dimension strings, grid spacing, scale bars, room/door/window/finish/fixture schedules and general notes before quantifying.
- Cross-check: wall LF x height vs. drywall/paint SF, footprint vs. slab SF and roof SF, door schedule counts vs. hardware/frames, fixture schedules vs. plumbing/electrical counts. State the cross-check in "basis".
- Never guess a quantity you can measure. If a sheet is unreadable, say which sheet and carry a REVIEW allowance.

EVERY TRADE COVERED
Walk every CSI division and either price it or say why it does not apply: 01 General Requirements, 02 Existing Conditions/Demo, 03 Concrete, 04 Masonry, 05 Metals, 06 Wood/Plastics, 07 Thermal & Moisture, 08 Openings, 09 Finishes, 10 Specialties, 11 Equipment, 12 Furnishings, 13 Special Construction, 14 Conveying, 21 Fire Suppression, 22 Plumbing, 23 HVAC, 26 Electrical, 27 Communications, 28 Electronic Safety, 31 Earthwork, 32 Exterior Improvements, 33 Utilities.
Return "division_coverage": [{ "division": "09 Finishes", "status": "priced|not_applicable|review", "note": "string" }] listing ALL of them.
A division that the building clearly needs but the drawings do not show must get a REVIEW allowance line, not silence.

Be thorough: 25-70 cost lines across all five groups for a full plan set.

OUTPUT ORDER AND LENGTH (important: long answers can be cut off)
- Write the keys in this order: "project", "scope_summary", "assumptions", "settings", "division_coverage", "flags", and "lines" LAST.
- Keep "basis" under 300 characters and give each line at most 5 subcosts.
- Write the most important / largest-dollar lines first.`;

// Stop reading the model a little before Supabase's function time limit so the lines
// written so far can still be returned (override with ESTIMATE_TIME_BUDGET_SECONDS).
const TIME_BUDGET_MS = (Number(Deno.env.get("ESTIMATE_TIME_BUDGET_SECONDS")) || 135) * 1000;

// Per-file and total caps keep the AI request within gateway and memory limits.
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

function toBase64(buf: Uint8Array): string {
  // Large chunks keep CPU time low on big plan sets.
  const parts: string[] = [];
  const chunk = 0x10000; // 64KB
  for (let i = 0; i < buf.length; i += chunk) {
    parts.push(String.fromCharCode.apply(null, buf.subarray(i, i + chunk) as unknown as number[]));
  }
  return btoa(parts.join(""));
}

async function appendFile(content: any[], url: string, fileType: string, base: string, total: { bytes: number }) {
  const isPdf = (fileType || "").includes("pdf") || url.toLowerCase().endsWith(".pdf");
  const isImage = (fileType || "").startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(url);
  if (isImage && !isPdf) {
    content.push({ type: "image_url", image_url: { url } });
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${base}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const mb = (buf.length / (1024 * 1024)).toFixed(1);
  if (buf.length > MAX_FILE_BYTES) {
    throw new Error(`${base} is ${mb} MB — too large to analyze in one pass. Split that PDF into smaller sections (or export key sheets separately) and upload them as individual files.`);
  }
  if (total.bytes + buf.length > MAX_TOTAL_BYTES) {
    throw new Error(`The plan set is too large in total (over ${Math.round(MAX_TOTAL_BYTES / (1024 * 1024))} MB). Split the set into parts — for example architectural, structural, and MEP — and build the estimate from the key sheets, or upload fewer files at a time.`);
  }
  total.bytes += buf.length;
  content.push({
    type: "file",
    file: { filename: `${base}.pdf`, file_data: `data:${isPdf ? "application/pdf" : fileType || "application/pdf"};base64,${toBase64(buf)}` },
  });
}

const GROUPS: Record<string, string> = {
  building: "BUILDING DIRECT COST",
  site: "SITE / CIVIL DIRECT COST",
  building_gc: "BUILDING GENERAL CONDITIONS",
  site_gc: "SITE GENERAL CONDITIONS",
  other: "OTHER PROJECT COSTS",
};

function normalizeLine(l: any, i: number) {
  const [line] = normalizeLines([l]);
  return line ? { ...line, sort_order: i } : null;
}

/**
 * Pulls complete objects out of the "lines" array of a JSON document that is still streaming in.
 * Returns the parsed lines found after `from` and where scanning stopped.
 */
function scanLines(text: string, state: { start: number; pos: number; depth: number; inStr: boolean; esc: boolean; objStart: number }) {
  const found: any[] = [];
  if (state.start < 0) {
    const m = /"lines"\s*:\s*\[/.exec(text);
    if (!m) return found;
    state.start = m.index + m[0].length;
    state.pos = state.start;
  }
  for (; state.pos < text.length; state.pos++) {
    const c = text[state.pos];
    if (state.inStr) {
      if (state.esc) state.esc = false;
      else if (c === "\\") state.esc = true;
      else if (c === '"') state.inStr = false;
      continue;
    }
    if (c === '"') state.inStr = true;
    else if (c === "{") {
      if (state.depth === 0) state.objStart = state.pos;
      state.depth++;
    } else if (c === "}") {
      state.depth--;
      if (state.depth === 0 && state.objStart >= 0) {
        try {
          found.push(JSON.parse(text.slice(state.objStart, state.pos + 1)));
        } catch (_) {
          /* skip a malformed line */
        }
        state.objStart = -1;
      }
    } else if (c === "]" && state.depth === 0) {
      state.pos = text.length; // end of the lines array
      break;
    }
  }
  return found;
}

function normalize(parsed: any, projectName: string, location: string, areaSf: number) {
  const lines = normalizeLines(Array.isArray(parsed.lines) ? parsed.lines : []);
  return normalizeRest(parsed, lines, projectName, location, areaSf);
}

function normalizeLines(raw: any[]) {
  return raw.map((l: any, i: number) => {
    const key = GROUPS[l.group_key] ? l.group_key : "building";
    const subs = (Array.isArray(l.subcosts) ? l.subcosts : []).map((s: any, j: number) => ({
      name: String(s.name ?? "Subcost"),
      amount: Math.max(0, Number(s.amount) || 0),
      kind: ["included", "additive", "alternate", "excluded", "allowance"].includes(s.kind) ? s.kind : "included",
      note: s.note ? String(s.note) : null,
      sort_order: j,
    }));
    return {
      group_key: key,
      group_name: String(l.group_name || GROUPS[key]),
      section_name: String(l.section_name || "General"),
      name: String(l.name || "Cost line"),
      baseline_amount: Math.max(0, Number(l.amount) || 0),
      quantity: l.quantity != null ? Number(l.quantity) || 0 : null,
      unit: l.unit ? String(l.unit) : null,
      unit_cost: l.unit_cost != null ? Number(l.unit_cost) || 0 : null,
      confidence: ["A", "B", "C", "D", "REVIEW"].includes(String(l.confidence)) ? String(l.confidence) : "C",
      status: String(l.status || "Modeled"),
      basis: l.basis ? String(l.basis) : null,
      source: l.source ? String(l.source) : null,
      sort_order: i,
      subcosts: subs,
    };
  });
}

function normalizeRest(parsed: any, lines: any[], projectName: string, location: string, areaSf: number) {
  const s = parsed.settings || {};
  return {
    lines,
    project: {
      name: String(parsed?.project?.name || projectName || "Untitled estimate"),
      location: String(parsed?.project?.location || location || ""),
      area_sf: Number(parsed?.project?.area_sf) || Number(areaSf) || 0,
    },
    scope_summary: String(parsed.scope_summary || ""),
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.map(String) : [],
    settings: {
      contingency_pct: Number(s.contingency_pct) || 5,
      overhead_pct: Number(s.overhead_pct) || 4,
      profit_pct: Number(s.profit_pct) || 6,
      bond_pct: Number(s.bond_pct) || 1,
    },
    division_coverage: (Array.isArray(parsed.division_coverage) ? parsed.division_coverage : []).map((d: any) => ({
      division: String(d.division || ""), status: String(d.status || "review"), note: d.note ? String(d.note) : null,
    })),
    flags: [...(Array.isArray(parsed.flags) ? parsed.flags : []), ...(Array.isArray(parsed.division_coverage) ? parsed.division_coverage : [])
      .filter((d: any) => d.status === "review")
      .map((d: any) => ({ severity: "high", issue: `Scope not confirmed: ${d.division}`, finding: d.note || "Not clearly shown on the drawings.", exposure: "Possible missing scope", action: "Confirm with the design team or price an allowance." }))].map((f: any) => ({
      severity: ["critical", "high", "medium"].includes(f.severity) ? f.severity : "medium",
      issue: String(f.issue || "Issue"),
      finding: f.finding ? String(f.finding) : null,
      exposure: f.exposure ? String(f.exposure) : null,
      action: f.action ? String(f.action) : null,
    })),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

  const { files = [], projectName = "", location = "", areaSf = 0, notes = "" } = payload;
  if (!Array.isArray(files) || files.length === 0) return json({ error: "At least one plan file is required" }, 400);

  const encoder = new TextEncoder();

  const startedAt = Date.now();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (_) {
          /* client went away */
        }
      };
      // Keeps the connection alive while the model reasons over the drawings.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch (_) {
          /* ignore */
        }
      }, 10000);

      try {
        send("status", { message: "Reading the plan documents" });

        const intro = `Analyze the attached construction documents and produce the independent should-cost baseline estimate.
Project name: ${projectName || "(from the drawings)"}
Location: ${location || "(from the drawings)"}
Stated building area: ${areaSf || "(determine from the drawings)"} SF
${notes ? `Estimator notes / context: ${notes}` : ""}
Price with current ${new Date().getFullYear()} local/regional commercial construction costs for this location.`;

        const book = Array.isArray(payload.costBook) ? payload.costBook.slice(0, 400) : [];
        const bookText = book.length
          ? `\n\nCOMPANY COST DATABASE — use these rates FIRST for labor, equipment and materials when a matching item exists, and cite "Company cost database: <name>" in "source". Only use market benchmarks for items not listed.\n` +
            book.map((b: any) => `- [${b.category}] ${b.name}: $${Number(b.unit_cost).toFixed(2)}/${b.unit}${b.notes ? ` (${b.notes})` : ""}`).join("\n")
          : "";
        const content: any[] = [{ type: "text", text: intro + bookText }];
        const total = { bytes: 0 };
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const url = typeof f === "string" ? f : f?.url;
          if (!url) continue;
          const base = (typeof f === "string" ? "" : f?.name) || `plan_${i + 1}`;
          content.push({ type: "text", text: `Document ${i + 1}: ${base}` });
          await appendFile(content, url, typeof f === "string" ? "" : f?.fileType || "", base, total);
        }

        send("status", { message: "Performing takeoff and building the baseline" });

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content },
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 32000,
            stream: true,
          }),
        });

        if (!aiRes.ok || !aiRes.body) {
          const details = await aiRes.text().catch(() => "");
          console.error("AI gateway error", aiRes.status, details);
          const message =
            aiRes.status === 402
              ? "AI credits are exhausted. Add credits in Settings → Plans & credits."
              : aiRes.status === 429
                ? "The AI service is rate limited right now. Try again in a moment."
                : `AI gateway error ${aiRes.status}`;
          send("error", { error: message });
          return;
        }

        const reader = aiRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        let chars = 0;
        const scan = { start: -1, pos: 0, depth: 0, inStr: false, esc: false, objStart: -1 };
        let lineCount = 0;
        let timedOut = false;

        while (true) {
          // Wrap up before Supabase stops the function, keeping every line written so far.
          if (Date.now() - startedAt > TIME_BUDGET_MS) {
            timedOut = true;
            try { await reader.cancel(); } catch (_) { /* ignore */ }
            break;
          }
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta) {
                text += delta;
                for (const raw of scanLines(text, scan)) {
                  const line = normalizeLine(raw, lineCount);
                  if (line) {
                    send("line", line);
                    lineCount++;
                  }
                }
                if (text.length - chars > 2000) {
                  chars = text.length;
                  send("status", { message: lineCount ? `Writing cost lines (${lineCount} so far)` : "Writing cost lines", characters: chars });
                }
              }
            } catch (_) {
              /* partial frame */
            }
          }
        }

        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          const m = text.match(/\{[\s\S]*\}/);
          try {
            parsed = m ? JSON.parse(m[0]) : null;
          } catch {
            parsed = null;
          }
        }
        if (!parsed) {
          // Cut off (time or length): rebuild the header from what arrived and keep the streamed lines.
          const head = text.slice(0, scan.start > 0 ? scan.start : text.length);
          const grab = (re: RegExp) => { const m = re.exec(head); try { return m ? JSON.parse(m[1]) : undefined; } catch { return undefined; } };
          parsed = {
            project: grab(/"project"\s*:\s*(\{[^{}]*\})/),
            scope_summary: grab(/"scope_summary"\s*:\s*("(?:[^"\\]|\\.)*")/),
            assumptions: grab(/"assumptions"\s*:\s*(\[[^\]]*\])/),
            settings: grab(/"settings"\s*:\s*(\{[^{}]*\})/),
            flags: grab(/"flags"\s*:\s*(\[[\s\S]*?\])\s*,\s*"lines"/),
            lines: [],
            partial: true,
          };
          const streamed = scanLines(text, scan); // anything after the last delta
          streamed.forEach((raw) => { const line = normalizeLine(raw, lineCount); if (line) { send("line", line); lineCount++; } });
          if (!lineCount) {
            send("error", { error: timedOut ? "The analysis ran out of time before writing any cost lines. Try fewer or smaller sheets per run." : "The model did not return a usable estimate. Try again." });
            return;
          }
          const r = normalizeRest(parsed, [], projectName, location, Number(areaSf) || 0);
          send("result", { ...r, lines: [], partial: true, timedOut });
          return;
        }

        const result = normalize(parsed, projectName, location, Number(areaSf) || 0);
        if (!result.lines.length && lineCount) {
          send("result", { ...result, partial: true });
          return;
        }
        if (!result.lines.length) {
          send("error", { error: "No cost lines could be produced from those documents." });
          return;
        }
        send("result", result);
      } catch (e: any) {
        console.error("generate-estimate failed", e);
        send("error", { error: e?.message || "Estimate generation failed" });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch (_) {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
