import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_DEFINITIONS: Record<string, string> = {
  sitework_concrete:
    "Sitework & Concrete/Foundations: excavation, grading, demo, site prep, footings, slabs, foundation walls, rebar. Use CY for concrete, SF for slabs, LF for footings, TON for rebar.",
  framing_envelope:
    "Framing & Envelope: wood/steel framing (LF or BF), roofing (SF or SQ), siding (SF), windows (EA), doors (EA), insulation (SF).",
  interior_finishes:
    "Interior Finishes: drywall (SF), paint (SF or GAL), flooring by type (SF), ceilings (SF), trim (LF), millwork.",
  mep_specialty:
    "MEP & Specialty: mechanical (HVAC tonnage/EA), electrical (panels, fixtures, devices, rough wire LF), plumbing (fixtures EA, supply/waste LF), FRP panels (SF), specialty coatings (SF).",
};

function buildPrompt(categories: string[], notes: string) {
  const scopeBlock = categories
    .map((c) => `- ${CATEGORY_DEFINITIONS[c] ?? c}`)
    .join("\n");
  return `You are a senior construction estimator analyzing a blueprint/plan.

Extract a detailed scope of work and bid line items ONLY for the categories the user selected:
${scopeBlock}

${notes ? `User notes / project context: ${notes}\n` : ""}

For every line item, return:
- category (one of: Sitework, Concrete, Framing, Envelope, Interior, MEP, Specialty)
- description (specific, e.g. "4\\" Concrete slab on grade with #4 rebar 12\\" OC")
- quantity (integer, your best takeoff estimate from the drawing)
- unit (CY, SF, LF, EA, SQ, TON, GAL, BF, LS)
- unit_cost (USD ballpark regional unit price for typical US commercial work; never zero)
- notes (assumptions, waste factor, exclusions)

Also return a top-level "scope_summary" (2-4 sentence narrative) and "assumptions" (array of strings).

If the image is unreadable or not a blueprint, return items: [] and explain in scope_summary.

Return ONLY valid JSON matching this exact shape:
{
  "scope_summary": "string",
  "assumptions": ["string"],
  "items": [
    { "category": "string", "description": "string", "quantity": 0, "unit": "string", "unit_cost": 0, "notes": "string" }
  ]
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      fileUrl,
      fileType,
      categories = [],
      notes = "",
      bidDocumentUrls = [],
    } = await req.json();
    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "fileUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(categories) || categories.length === 0) {
      return new Response(JSON.stringify({ error: "At least one category required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildPrompt(categories, notes, Array.isArray(bidDocumentUrls) && bidDocumentUrls.length > 0);
    const isPdf = (fileType || "").includes("pdf") || fileUrl.toLowerCase().endsWith(".pdf");

    const userContent: any[] = [{ type: "text", text: prompt }];
    await appendFileToContent(userContent, fileUrl, fileType, "blueprint");
    if (Array.isArray(bidDocumentUrls)) {
      for (let i = 0; i < bidDocumentUrls.length; i++) {
        const d = bidDocumentUrls[i];
        const url = typeof d === "string" ? d : d?.url;
        const ft = typeof d === "string" ? "" : d?.fileType || "";
        const name = typeof d === "string" ? `bid_doc_${i + 1}` : d?.name || `bid_doc_${i + 1}`;
        if (!url) continue;
        userContent.push({
          type: "text",
          text: `Supporting bid document #${i + 1}: ${name}. Use its line items, unit prices and quotes when assigning costs.`,
        });
        await appendFileToContent(userContent, url, ft, `bid_${i + 1}`);
      }
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "You are an expert construction estimator. Output ONLY valid JSON, no markdown fences, no commentary.",
          },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      return new Response(
        JSON.stringify({ error: `AI gateway error ${aiRes.status}`, details: errText }),
        { status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { items: [], scope_summary: String(raw) };
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const normalized = items.map((i: any) => ({
      category: String(i.category ?? "General"),
      description: String(i.description ?? ""),
      quantity: Math.max(0, Math.round(Number(i.quantity) || 0)),
      unit: String(i.unit ?? "EA"),
      unit_cost: Math.max(0, Number(i.unit_cost) || 0),
      notes: String(i.notes ?? ""),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        scope_summary: parsed.scope_summary ?? "",
        assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
        items: normalized,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("analyze-blueprint error:", err);
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});