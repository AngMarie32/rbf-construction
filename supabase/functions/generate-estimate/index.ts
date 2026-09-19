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

Be thorough: 25-70 cost lines across all five groups for a full plan set, each with a detailed subcost build-up.`;

async function appendFile(content: any[], url: string, fileType: string, base: string) {
  const isPdf = (fileType || "").includes("pdf") || url.toLowerCase().endsWith(".pdf");
  const isImage = (fileType || "").startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(url);
  if (isImage && !isPdf) {
    content.push({ type: "image_url", image_url: { url } });
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${base}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  content.push({
    type: "file",
    file: { filename: `${base}.pdf`, file_data: `data:${isPdf ? "application/pdf" : fileType || "application/pdf"};base64,${btoa(binary)}` },
  });
}

const GROUPS: Record<string, string> = {
  building: "BUILDING DIRECT COST",
  site: "SITE / CIVIL DIRECT COST",
  building_gc: "BUILDING GENERAL CONDITIONS",
  site_gc: "SITE GENERAL CONDITIONS",
  other: "OTHER PROJECT COSTS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

    const { files = [], projectName = "", location = "", areaSf = 0, notes = "" } = await req.json();
    if (!Array.isArray(files) || files.length === 0) return json({ error: "At least one plan file is required" }, 400);

    const intro = `Analyze the attached construction documents and produce the independent should-cost baseline estimate.
Project name: ${projectName || "(from the drawings)"}
Location: ${location || "(from the drawings)"}
Stated building area: ${areaSf || "(determine from the drawings)"} SF
${notes ? `Estimator notes / context: ${notes}` : ""}
Price with current ${new Date().getFullYear()} local/regional commercial construction costs for this location.`;

    const content: any[] = [{ type: "text", text: intro }];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const url = typeof f === "string" ? f : f?.url;
      if (!url) continue;
      content.push({ type: "text", text: `Document ${i + 1}: ${(typeof f === "string" ? "" : f?.name) || `plan_${i + 1}`}` });
      await appendFile(content, url, typeof f === "string" ? "" : f?.fileType || "", `plan_${i + 1}`);
    }

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
      }),
    });

    if (!aiRes.ok) {
      const details = await aiRes.text();
      console.error("AI gateway error", aiRes.status, details);
      if (aiRes.status === 402)
        return json({ error: "AI credits exhausted. Add credits in Settings → Plans & credits.", code: "payment_required" }, 402);
      if (aiRes.status === 429) return json({ error: "AI rate limit hit. Try again in a moment.", code: "rate_limit" }, 429);
      return json({ error: `AI gateway error ${aiRes.status}`, details }, aiRes.status);
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      if (!m) return json({ error: "The model did not return a usable estimate. Try again." }, 502);
      parsed = JSON.parse(m[0]);
    }

    const lines = (Array.isArray(parsed.lines) ? parsed.lines : []).map((l: any, i: number) => {
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

    if (!lines.length) return json({ error: "No cost lines could be produced from those documents." }, 422);

    const s = parsed.settings || {};
    return json({
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
      lines,
      flags: (Array.isArray(parsed.flags) ? parsed.flags : []).map((f: any) => ({
        severity: ["critical", "high", "medium"].includes(f.severity) ? f.severity : "medium",
        issue: String(f.issue || "Issue"),
        finding: f.finding ? String(f.finding) : null,
        exposure: f.exposure ? String(f.exposure) : null,
        action: f.action ? String(f.action) : null,
      })),
    });
  } catch (e: any) {
    console.error("generate-estimate failed", e);
    return json({ error: e?.message || "Estimate generation failed" }, 500);
  }
});
