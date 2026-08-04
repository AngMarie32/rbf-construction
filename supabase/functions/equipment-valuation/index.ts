import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { equipment, repairs, usage } = await req.json();

    if (!equipment) {
      return new Response(JSON.stringify({ error: "Missing equipment payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const repairLines = (repairs || [])
      .map(
        (r: any) =>
          `- ${r.date}: ${r.description || "repair"} — $${Number(r.cost || 0).toFixed(2)}`
      )
      .join("\n");

    const totalRepairs = (repairs || []).reduce(
      (s: number, r: any) => s + Number(r.cost || 0),
      0
    );

    const prompt = `You are a heavy construction equipment appraiser. Estimate the fair current market value of this unit and give a repair-vs-replace recommendation.

EQUIPMENT
Name: ${equipment.name}
Category: ${equipment.category || "unknown"}
Year: ${equipment.year ?? "unknown"}
VIN/Serial: ${equipment.vin_serial_number || "n/a"}
Original/book value: ${equipment.value ? `$${equipment.value}` : "unknown"}
Stated depreciation rate: ${equipment.depreciation_rate ?? "unknown"}%/yr
Purchase date: ${equipment.purchase_date || "unknown"}
Total hours used: ${equipment.total_hours_used ?? "unknown"}
Status: ${equipment.status}
Billable hourly rate: $${equipment.hourly_rate ?? 0}
Usage log entries: ${usage ?? 0}

REPAIR HISTORY (total $${totalRepairs.toFixed(2)} across ${(repairs || []).length} events)
${repairLines || "No recorded repairs."}

Weigh age, hours, and the frequency/severity/cost trend of repairs. Rising repair frequency or repair spend approaching 50%+ of value should push toward replace.

Return ONLY valid JSON, no markdown fence:
{
  "estimated_value": number,
  "value_range_low": number,
  "value_range_high": number,
  "confidence": "low" | "medium" | "high",
  "condition_grade": "A" | "B" | "C" | "D",
  "recommendation": "keep" | "monitor" | "repair" | "replace",
  "annual_repair_run_rate": number,
  "cost_per_hour": number,
  "summary": "2-3 sentence plain-English rationale",
  "risk_factors": ["short bullet", "short bullet"]
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a precise construction equipment appraiser. Always respond with raw JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      const msg =
        aiRes.status === 429
          ? "Rate limit reached. Please try again in a moment."
          : aiRes.status === 402
          ? "AI credits exhausted. Add credits in Settings → Plans & credits."
          : `AI gateway error ${aiRes.status}`;
      return new Response(JSON.stringify({ error: msg, details: errText }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        return new Response(
          JSON.stringify({ error: "Could not parse AI response", raw: cleaned }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      parsed = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("equipment-valuation error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});