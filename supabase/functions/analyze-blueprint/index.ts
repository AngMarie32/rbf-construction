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
  demolition:
    "Demolition: selective demo, full demo, slab saw-cutting (LF), wall demo (SF), debris haul-off (CY or LOAD), dumpsters (EA).",
  masonry:
    "Masonry: CMU walls (SF), brick veneer (SF), stone (SF), grout & rebar fill, lintels (EA), tuckpointing (SF).",
  structural_steel:
    "Structural Steel & Metals: structural steel (TON), miscellaneous metals (LB or LF), steel decking (SF), stairs/railings (LF), bar joists (EA).",
  doors_windows_glazing:
    "Doors, Windows & Glazing: hollow metal doors/frames (EA), wood doors (EA), storefront/curtain wall (SF), glass & glazing (SF), hardware sets (EA).",
  roofing_waterproofing:
    "Roofing & Waterproofing: membrane roofing TPO/EPDM/PVC (SF or SQ), built-up roofing (SQ), flashings (LF), gutters & downspouts (LF), waterproofing (SF), sealants (LF).",
  thermal_moisture:
    "Thermal & Moisture Protection: insulation batt/rigid/spray (SF or BF), vapor barriers (SF), fireproofing (SF), firestopping (EA or LF).",
  flooring:
    "Flooring: carpet (SY or SF), VCT/LVT (SF), tile (SF), polished concrete (SF), epoxy (SF), wood (SF), base (LF).",
  paint_coatings:
    "Painting & Coatings: interior paint (SF), exterior paint (SF), staining (SF), industrial/epoxy coatings (SF), intumescent coatings (SF).",
  specialties:
    "Specialties: toilet partitions (EA), accessories (EA), lockers (EA), signage (EA), fire extinguishers (EA), corner guards (LF).",
  equipment_furnishings:
    "Equipment & Furnishings: appliances (EA), casework/millwork (LF), countertops (SF), window treatments (EA), FF&E.",
  fire_protection:
    "Fire Protection: sprinkler heads (EA), sprinkler piping (LF), standpipes (EA), fire pump (LS), monitoring (LS).",
  electrical:
    "Electrical: service & gear (LS or EA), panels (EA), branch wiring (LF), devices (EA), light fixtures (EA), low voltage rough (LF), fire alarm (EA).",
  plumbing:
    "Plumbing: fixtures (EA), water heaters (EA), supply piping (LF), waste/vent (LF), gas piping (LF), insulation (LF).",
  hvac:
    "HVAC: RTUs/AHUs (EA or TON), ductwork (LB or LF), VAVs (EA), grilles/diffusers (EA), controls (LS), test & balance (LS).",
  earthwork_utilities:
    "Earthwork & Site Utilities: cut/fill (CY), aggregate base (TON), storm/sanitary piping (LF), manholes/catch basins (EA), water service (LF).",
  paving_landscape:
    "Paving & Landscape: asphalt paving (SF or TON), concrete walks (SF), curbs (LF), striping (LF or EA), landscape (SF), irrigation (LF), fencing (LF).",
  general_conditions:
    "General Conditions: project management (MO), supervision (MO), temp facilities (MO), dumpsters (EA), final clean (SF or LS), permits (LS), bond & insurance (LS).",
};

function buildPrompt(categories: string[], notes: string, hasBidDocs: boolean) {
  const scopeBlock = categories
    .map((c) => `- ${CATEGORY_DEFINITIONS[c] ?? c}`)
    .join("\n");
  return `You are a senior construction estimator analyzing a blueprint/plan.

Extract a detailed scope of work and bid line items ONLY for the categories the user selected:
${scopeBlock}

${notes ? `User notes / project context: ${notes}\n` : ""}
${hasBidDocs ? "Supporting bid documents (subcontractor quotes, vendor proposals, prior bids, pricing sheets) are attached. PREFER unit prices and line items from those documents when they cover the same scope. Cite the source briefly in notes (e.g. \"from ABC Plumbing quote\").\n" : ""}
For every line item, return:
- category (one of: Sitework, Concrete, Framing, Envelope, Interior, MEP, Specialty)
- description (specific, e.g. "4\\" Concrete slab on grade with #4 rebar 12\\" OC")
- quantity (integer, your best takeoff estimate from the drawing)
- unit (CY, SF, LF, EA, SQ, TON, GAL, BF, LS)
- unit_cost (USD ballpark regional unit price for typical US commercial work; never zero)
- notes (assumptions, waste factor, exclusions)

Also return a top-level "scope_summary" (2-4 sentence narrative) and "assumptions" (array of strings).

Be thorough: produce at least 5-10 line items per selected category when the drawing supports it. Do not skip categories the user selected.

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

async function appendFileToContent(
  content: any[],
  url: string,
  fileType: string,
  filenameBase: string,
) {
  const isPdf = (fileType || "").includes("pdf") || url.toLowerCase().endsWith(".pdf");
  const isImage =
    (fileType || "").startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp)$/i.test(url);

  if (isImage && !isPdf) {
    content.push({ type: "image_url", image_url: { url } });
    return;
  }

  // PDF or other doc: fetch and base64-encode
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${filenameBase}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  const mime = isPdf ? "application/pdf" : (fileType || "application/pdf");
  content.push({
    type: "file",
    file: {
      filename: `${filenameBase}.${isPdf ? "pdf" : "bin"}`,
      file_data: `data:${mime};base64,${b64}`,
    },
  });
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
        max_completion_tokens: 8192,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI credits exhausted. Add credits in Lovable Settings → Plans & credits to continue analyzing blueprints.",
            code: "payment_required",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit hit. Please wait a moment and try again.", code: "rate_limit" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
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