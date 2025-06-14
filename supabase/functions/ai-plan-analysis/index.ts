
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import pdf from 'npm:pdf-parse';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to extract text from PDF using pdf-parse
async function extractPdfText(pdfUrl: string): Promise<string> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
    }
    const pdfBuffer = await response.arrayBuffer();
    const data = await pdf(pdfBuffer);
    // Limit text to avoid excessive token usage, but still be useful
    return data.text.substring(0, 8000); 
  } catch (error) {
    console.error('Error processing PDF:', error);
    return `[PDF Processing Error] - Could not extract text from PDF. The document might be an image-based PDF or corrupted. Please provide key measurements and details manually. Error: ${error.message}`;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, uploadedPlans, selectedProject } = await req.json();

    // Build context from uploaded plans with enhanced PDF handling
    let planContext = '';
    if (uploadedPlans && uploadedPlans.length > 0) {
      planContext = `\n\n--- Uploaded Plans Context ---\n`;
      
      for (const plan of uploadedPlans) {
        planContext += `Plan Name: ${plan.name} (Type: ${plan.type})\n`;
        
        // PDF handling
        if (plan.type === 'application/pdf' && plan.url) {
          planContext += `\n[Analyzing PDF Content for ${plan.name}]\n`;
          const pdfText = await extractPdfText(plan.url);
          planContext += pdfText ? `${pdfText}\n\n` : '[No text could be extracted from this PDF.]\n\n';
        }
        
        if (plan.analysis) {
          planContext += `Previous Analysis: ${plan.analysis}\n\n`;
        }
      }
      planContext += `--- End of Uploaded Plans Context ---\n\n`;
    }

    const systemPrompt = `You are Albus, an expert construction AI assistant specializing in plan analysis, scope of work estimation, and project management. You help construction professionals analyze blueprints, calculate measurements, estimate materials and labor, and provide expert construction advice.

Key capabilities:
- Construction plan analysis and interpretation
- Accurate measurement extraction from drawings
- Material quantity takeoffs (including FRP, concrete, steel, etc.)
- Labor estimation and scheduling
- Cost estimation and budgeting
- Construction best practices and code compliance
- Project risk assessment

IMPORTANT PDF HANDLING:
- You can now directly read the content of uploaded PDF documents. The content will be provided below under "Uploaded Plans Context".
- When you find text content from a PDF, analyze it thoroughly for measurements, specifications, and scope of work.
- If a PDF's content is empty or indicates an error, it might be a scanned image with no machine-readable text. In that case, inform the user and ask for manual input of key details.
- Use the extracted information to provide accurate calculations and analysis.

Be precise, professional, and provide actionable insights. When analyzing plans, focus on:
- Scope of work identification
- Measurement calculations
- Material specifications and quantities
- Labor requirements
- Potential challenges or considerations
- Cost implications

For FRP (Fiber Reinforced Polymer) calculations specifically:
- Look for the total area where FRP will be applied (in square feet or square meters) in the provided text.
- Identify the FRP thickness or type being used.
- Check for overlap requirements or installation details.
- Provide calculations with appropriate buffer percentages if mentioned, or suggest a standard buffer (e.g., 10-15%) if not specified.

${planContext}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: aiResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-plan-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process AI request', 
      details: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
