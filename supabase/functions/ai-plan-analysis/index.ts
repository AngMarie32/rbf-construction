
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to extract text from PDF using a simple approach
async function extractPdfText(pdfUrl: string): Promise<string> {
  try {
    // For now, we'll return a placeholder indicating PDF processing
    return `[PDF Document: ${pdfUrl}] - PDF content analysis capability is being processed. Please describe the key details from your PDF including measurements, areas, and specifications for accurate analysis.`;
  } catch (error) {
    console.error('Error processing PDF:', error);
    return `[PDF Processing Error] - Unable to extract text from PDF. Please provide key measurements and details manually.`;
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
      planContext = `\n\nUploaded Plans Context:\n`;
      
      for (let i = 0; i < uploadedPlans.length; i++) {
        const plan = uploadedPlans[i];
        planContext += `Plan ${i + 1}: ${plan.name} (${plan.type})\n`;
        
        // Enhanced PDF handling
        if (plan.type === 'application/pdf') {
          planContext += `PDF Document: This is a construction plan/blueprint in PDF format.\n`;
          planContext += `Note: For accurate analysis, please provide specific measurements, areas, and details from the PDF.\n`;
        }
        
        if (plan.analysis) {
          planContext += `Previous Analysis: ${plan.analysis}\n\n`;
        }
      }
      
      // Add specific instructions for PDF analysis
      const pdfPlans = uploadedPlans.filter(plan => plan.type === 'application/pdf');
      if (pdfPlans.length > 0) {
        planContext += `\nPDF Analysis Instructions:\n`;
        planContext += `- I can see you have ${pdfPlans.length} PDF document(s) uploaded\n`;
        planContext += `- To provide accurate FRP calculations or material estimates, I need specific details\n`;
        planContext += `- Please provide measurements, areas, and specifications from your plans\n`;
        planContext += `- I can help calculate quantities once I have the dimensional information\n\n`;
      }
    }

    const systemPrompt = `You are Albus, an expert construction AI assistant specializing in plan analysis, scope of work estimation, and construction project management. You help construction professionals analyze blueprints, calculate measurements, estimate materials and labor, and provide expert construction advice.

Key capabilities:
- Construction plan analysis and interpretation
- Accurate measurement extraction from drawings
- Material quantity takeoffs (including FRP, concrete, steel, etc.)
- Labor estimation and scheduling
- Cost estimation and budgeting
- Construction best practices and code compliance
- Project risk assessment

IMPORTANT PDF HANDLING:
- When users upload PDF plans, acknowledge that you can see the document
- Explain that for accurate material calculations (like FRP quantities), you need specific measurements
- Guide users to provide key dimensions, areas, and specifications from their plans
- Offer to calculate quantities once dimensional information is provided
- Be helpful in explaining what specific information you need

Be precise, professional, and provide actionable insights. When analyzing plans, focus on:
- Scope of work identification
- Measurement calculations
- Material specifications and quantities
- Labor requirements
- Potential challenges or considerations
- Cost implications

For FRP (Fiber Reinforced Polymer) calculations specifically:
- Request total area where FRP will be applied (in square feet or square meters)
- Ask for FRP thickness or type being used
- Inquire about overlap requirements or installation details
- Provide calculations with appropriate buffer percentages

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
