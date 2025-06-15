
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
    const { invitationId, recipients } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('bid_invitations')
      .select(`
        *,
        bid_package:bid_packages(*,project:projects(*))
      `)
      .eq('id', invitationId)
      .single()

    if (invitationError) throw invitationError

    // Get the user's verified email from their profile
    const { data: userData } = await supabaseClient.auth.getUser()
    const userId = userData?.user?.id

    let senderEmail = 'BuildPro Construction <noreply@buildpro.com>' // Default
    
    if (userId) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('email, email_verified, name')
        .eq('id', userId)
        .single()

      if (profile?.email_verified && profile?.email) {
        const senderName = profile.name || 'BuildPro Team'
        senderEmail = `${senderName} <${profile.email}>`
      }
    }

    // Send email to each recipient
    for (const recipient of recipients) {
      const emailHtml = `
        <h2>Bid Invitation: ${invitation.title}</h2>
        <p>Dear ${recipient.name},</p>
        <p>You have been invited to submit a bid for the following project:</p>
        <h3>Project: ${invitation.bid_package.project.name}</h3>
        <p><strong>Bid Package:</strong> ${invitation.bid_package.name}</p>
        <p><strong>Due Date:</strong> ${invitation.due_date || 'To be determined'}</p>
        ${invitation.message ? `<p><strong>Message:</strong></p><p>${invitation.message}</p>` : ''}
        <p>Please respond by the due date with your bid proposal.</p>
        <p>Best regards,<br/>BuildPro Construction</p>
      `

      // Here you would integrate with your email service (Resend, SendGrid, etc.)
      // For now, we'll just log that the email would be sent
      console.log(`Email would be sent to: ${recipient.email}`)
      console.log(`From: ${senderEmail}`)
      console.log(`Subject: Bid Invitation - ${invitation.title}`)
      console.log(`Content: ${emailHtml}`)

      // Update recipient status to sent
      await supabaseClient
        .from('bid_invitation_recipients')
        .update({ 
          status: 'Sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', recipient.id)
    }

    // Update invitation status
    await supabaseClient
      .from('bid_invitations')
      .update({ 
        status: 'Sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Emails sent successfully',
        senderEmail: senderEmail
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending emails:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
