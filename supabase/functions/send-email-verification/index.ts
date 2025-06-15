
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "npm:resend@2.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, code, userName } = await req.json()

    console.log(`Sending verification email to: ${email}`)
    console.log(`Verification code: ${code}`)
    console.log(`User: ${userName}`)

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    const emailContent = `
      <h2>Email Verification</h2>
      <p>Hello ${userName || 'User'},</p>
      <p>Please use the following verification code to verify your email address:</p>
      <h3 style="background-color: #f5f5f5; padding: 10px; text-align: center; letter-spacing: 2px;">
        ${code}
      </h3>
      <p>This code will expire in 15 minutes.</p>
      <p>If you didn't request this verification, please ignore this email.</p>
      <p>Best regards,<br/>BuildPro Construction</p>
    `

    const emailResponse = await resend.emails.send({
      from: 'BuildPro Construction <noreply@buildpro.construction>',
      to: [email],
      subject: 'Email Verification - BuildPro Construction',
      html: emailContent
    })

    console.log('Email sent successfully:', emailResponse)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification email sent successfully',
        emailId: emailResponse.data?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending verification email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
