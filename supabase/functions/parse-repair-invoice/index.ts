import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const lineItemProps = {
  equipment_id: { type: "string", nullable: true },
  equipment_guess: { type: "string", nullable: true },
  date: { type: "string", nullable: true },
  description: { type: "string" },
  category: { type: "string" },
  cost: { type: "number" },
  hours_meter: { type: "number", nullable: true },
  confidence: { type: "number" },
};

// Google Generative Language API schema (no additionalProperties, uses `nullable`)
const geminiSchema = {
  type: "object",
  properties: {
    vendor: { type: "string", nullable: true },
    invoice_number: { type: "string", nullable: true },
    invoice_date: { type: "string", nullable: true },
    subtotal: { type: "number", nullable: true },
    tax: { type: "number", nullable: true },
    fees: { type: "number", nullable: true },
    document_total: { type: "number", nullable: true },
    notes: { type: "string", nullable: true },
    line_items: {
      type: "array",
      items: {
        type: "object",
        properties: lineItemProps,
        required: ["description", "category", "cost", "confidence"],
      },
    },
  },
  required: ["line_items"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!geminiKey && !lovableKey) {
      return new Response(JSON.stringify({ error: "No AI key configured (GEMINI_API_KEY or LOVABLE_API_KEY)" }), {
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
- Also capture the document's money summary: subtotal (pre-tax), tax (sales tax / VAT), fees (shop supplies, hazmat, freight, environmental fees) and the grand total. Report tax and fees ONLY as the summary fields — never as line items.
- The sum of line item costs plus tax plus fees should equal the document total. If the document only shows a grand total, still return it.
- Never invent line items that are not on the document.`;

    let raw: string | undefined;
    let lastError: { status: number; text: string } | null = null;

    // 1) Free path: user's own Google Gemini API key (Google AI Studio free tier)
    if (geminiKey) {
      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: instruction },
                  { inlineData: { mimeType, data: fileBase64 } },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: geminiSchema,
            },
          }),
        }
      );

      if (gRes.ok) {
        const gData = await gRes.json();
        raw = gData?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
      } else {
        lastError = { status: gRes.status, text: await gRes.text() };
        console.error("Gemini direct failed", lastError.status, lastError.text.slice(0, 400));
      }
    }

    // 2) Fallback: Lovable AI Gateway
    if (!raw && lovableKey) {
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
          "Lovable-API-Key": lovableKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [{ role: "user", content }],
          response_format: { type: "json_object" },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        raw = data?.choices?.[0]?.message?.content ?? "";
      } else {
        lastError = { status: res.status, text: await res.text() };
      }
    }

    if (!raw) {
      const status = lastError?.status === 429 ? 429 : lastError?.status === 402 ? 402 : 500;
      const msg =
        status === 429
          ? "Free AI rate limit reached. Wait a minute and try again."
          : status === 402
          ? "AI credits exhausted. Add a free Google Gemini API key or top up credits."
          : `Document reader failed: ${(lastError?.text || "unknown error").slice(0, 300)}`;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
