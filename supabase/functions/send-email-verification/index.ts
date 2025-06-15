
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // In a real implementation, you would integrate with an email service like Resend
    // For now, we'll just log the email content
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

    console.log('Email content:')
    console.log(emailContent)

    // TODO: Replace with actual email service integration
    // Example with Resend:
    // const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    // await resend.emails.send({
    //   from: 'BuildPro <noreply@yourcompany.com>',
    //   to: [email],
    //   subject: 'Email Verification - BuildPro Construction',
    //   html: emailContent
    // })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification email sent successfully',
        // Remove this in production - only for testing
        debug: { code, email }
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
