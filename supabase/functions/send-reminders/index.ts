const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Smart reminders stay in the app; email delivery is intentionally disabled.
Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(
    JSON.stringify({ sent: false, disabled: true, reason: 'Reminder emails are disabled. Use the in-app reminders menu.' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
