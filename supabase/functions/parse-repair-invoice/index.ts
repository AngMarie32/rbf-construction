import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { fileBase64, mimeType, fileName, equipment } = await req.json();
    if (!fileBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fleet = (equipment || [])
      .map(
        (e: any) =>
          `- id=${e.id} | name=${e.name} | category=${e.category || "n/a"} | year=${e.year ?? "n/a"} | vin/serial=${e.vin_serial_number || "n/a"}`
      )
      .join("\n");

    const instruction = `You are a construction equipment service-invoice reader. The attached document may be a typed invoice, a scanned work order, or a HANDWRITTEN repair ticket. Read it carefully, including handwriting, and extract every repair/service line item.

FLEET ROSTER (match line items to these units when possible):
${fleet || "(no fleet provided)"}

Rules:
- Match a line item to a unit by unit name, nickname, unit number, make/model, or VIN/serial. If you cannot confidently match, set equipment_id to null and put your best reading in equipment_guess.
- cost must be a number in USD (no currency symbols). Use the extended/total price for that line. Include parts and labor lines separately if the document lists them separately.
- date: ISO YYYY-MM-DD. Use the service date if shown, otherwise the invoice date.
- category: one of Preventive Maintenance, Tires/Tracks, Hydraulics, Engine, Drivetrain, Electrical, Brakes/Wear, Body/Attachment, Inspection, Other.
- confidence: 0-1, lower it for hard-to-read handwriting.
- Never invent line items that are not on the document.`;

    const isPdf = String(mimeType).includes("pdf");
    const content: any[] = [{ type: "text", text: instruction }];
    if (isPdf) {
      content.push({
        type: "file",
        file: { filename: fileName || "invoice.pdf", file_data: `data:${mimeType};base64,${fileBase64}` },
      });
    } else {
      content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "user", content }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "repair_invoice",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                vendor: { type: ["string", "null"] },
                invoice_number: { type: ["string", "null"] },
                invoice_date: { type: ["string", "null"] },
                document_total: { type: ["number", "null"] },
                notes: { type: ["string", "null"] },
                line_items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      equipment_id: { type: ["string", "null"] },
                      equipment_guess: { type: ["string", "null"] },
                      date: { type: ["string", "null"] },
                      description: { type: "string" },
                      category: { type: "string" },
                      cost: { type: "number" },
                      hours_meter: { type: ["number", "null"] },
                      confidence: { type: "number" },
                    },
                    required: [
                      "equipment_id",
                      "equipment_guess",
                      "date",
                      "description",
                      "category",
                      "cost",
                      "hours_meter",
                      "confidence",
                    ],
                  },
                },
              },
              required: [
                "vendor",
                "invoice_number",
                "invoice_date",
                "document_total",
                "notes",
                "line_items",
              ],
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const status = res.status === 429 || res.status === 402 ? res.status : 500;
      return new Response(
        JSON.stringify({
          error:
            status === 429
              ? "Rate limit reached. Try again in a moment."
              : status === 402
              ? "AI credits exhausted. Add credits in Settings → Plans & credits."
              : `Document reader failed: ${text.slice(0, 300)}`,
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { line_items: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
