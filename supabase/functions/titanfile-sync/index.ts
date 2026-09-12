/**
 * TraderTaxHQ <-> TitanFile bridge.
 *
 * TitanFile is the only place client documents live. This function owns every
 * call to their API so the API key never reaches the browser.
 *
 * Actions
 *   create_channel  — open a secure channel for a client engagement
 *   add_contact     — invite the client (or a spouse / advisor) to the channel
 *   send_requests   — post the document request list as a secure message
 *   sync_files      — pull the channel file list and match it back to requests
 *   send_message    — free-form secure message into the channel
 *
 * Required secrets
 *   TITANFILE_SUBDOMAIN  e.g. "acme" for https://acme.titanfile.com
 *   TITANFILE_API_ID     API ID (used as the JWT username)
 *   TITANFILE_API_KEY    API key (used as the JWT password)
 *   TITANFILE_OWNER_EMAIL  optional — act on behalf of this user (needs delegation rights)
 *
 * API reference: https://documenter.getpostman.com/view/25795885/2s9YsT6Tmi
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface TitanConfig {
  base: string;
  apiId: string;
  apiKey: string;
  ownerEmail?: string;
}

function titanConfig(): TitanConfig | null {
  const subdomain = Deno.env.get('TITANFILE_SUBDOMAIN');
  const apiId = Deno.env.get('TITANFILE_API_ID');
  const apiKey = Deno.env.get('TITANFILE_API_KEY');
  if (!subdomain || !apiId || !apiKey) return null;
  return {
    base: `https://${subdomain}.titanfile.com/api/v1`,
    apiId,
    apiKey,
    ownerEmail: Deno.env.get('TITANFILE_OWNER_EMAIL') ?? undefined,
  };
}

// Access tokens live an hour; cache per isolate so a burst of calls reuses one.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(cfg: TitanConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const form = new FormData();
  form.append('username', cfg.apiId);
  form.append('password', cfg.apiKey);

  const res = await fetch(`${cfg.base}/token/`, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`TitanFile auth failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = { value: data.access, expiresAt: Date.now() + 55 * 60 * 1000 };
  return data.access;
}

async function titanFetch(
  cfg: TitanConfig,
  path: string,
  init: { method?: string; body?: FormData; query?: Record<string, string> } = {}
) {
  const token = await getAccessToken(cfg);
  const url = new URL(`${cfg.base}${path}`);
  Object.entries(init.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json; version=1.0',
    },
    body: init.body,
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`TitanFile ${init.method ?? 'GET'} ${path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return parsed as any;
}

function form(fields: Record<string, string | number | boolean | undefined | null>): FormData {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    fd.append(k, String(v));
  });
  return fd;
}

/** Loose match of an uploaded file to an outstanding request. */
function matchFile(
  file: { name: string; path?: string | null },
  requests: { id: string; code: string; name: string; status: string }[]
) {
  const haystack = `${file.path ?? ''}/${file.name}`.toLowerCase();
  const byCode = requests.find((r) => haystack.includes(r.code.toLowerCase()));
  if (byCode) return byCode;

  const scored = requests
    .filter((r) => r.status === 'requested')
    .map((r) => {
      const words = r.name
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3);
      return { request: r, hits: words.filter((w) => haystack.includes(w)).length };
    })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  return scored.length ? scored[0].request : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const cfg = titanConfig();
    if (!cfg) {
      return json(
        {
          error: 'TitanFile is not configured.',
          detail:
            'Set TITANFILE_SUBDOMAIN, TITANFILE_API_ID, and TITANFILE_API_KEY in the edge function secrets. Until then, create the channel in TitanFile manually and paste its URL onto the engagement.',
          configured: false,
        },
        400
      );
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Caller identity is checked against RLS; writes use the service client.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: 'Not authenticated' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const payload = await req.json();
    const action: string = payload.action;

    // Every action is engagement-scoped; confirm the caller can see it.
    const engagementId: string | undefined = payload.engagement_id;
    if (engagementId) {
      const { data: visible } = await userClient
        .from('tth_engagements')
        .select('id')
        .eq('id', engagementId)
        .maybeSingle();
      if (!visible) return json({ error: 'Engagement not found or not accessible' }, 403);
    }

    const logActivity = async (kind: string, message: string, meta: Record<string, unknown> = {}) => {
      if (!engagementId) return;
      await admin.from('tth_activity').insert({
        engagement_id: engagementId,
        kind,
        message,
        meta,
        actor: userData.user!.id,
      });
    };

    switch (action) {
      // ---------------------------------------------------------------------
      case 'create_channel': {
        const { channel_name, client_id, expiry_date } = payload;
        const created = await titanFetch(cfg, '/channels/', {
          method: 'POST',
          body: form({
            name: channel_name,
            owner_email: cfg.ownerEmail,
            expiry_date,
            safe_notification: true,
          }),
        });

        const channelUrl = created.channel_url ?? null;
        if (engagementId) {
          await admin
            .from('tth_engagements')
            .update({ titanfile_channel_id: created.id, titanfile_channel_url: channelUrl })
            .eq('id', engagementId);
        }
        if (client_id) {
          await admin
            .from('tth_clients')
            .update({ titanfile_channel_id: created.id, titanfile_channel_url: channelUrl })
            .eq('id', client_id);
        }
        await logActivity('titanfile_channel_created', `TitanFile channel "${channel_name}" created.`, {
          channel_id: created.id,
        });

        return json({ channel: created });
      }

      // ---------------------------------------------------------------------
      case 'add_contact': {
        const { channel_id, email, first_name, last_name, organization, sharing_permissions } = payload;
        const contact = await titanFetch(cfg, '/channel_contacts/', {
          method: 'POST',
          body: form({
            channel: channel_id,
            email,
            first_name,
            last_name,
            organization,
            sharing_permissions: sharing_permissions ?? 'contributor',
          }),
        });
        await logActivity('titanfile_contact_added', `Invited ${email} to the secure channel.`, { email });
        return json({ contact });
      }

      // ---------------------------------------------------------------------
      case 'send_requests': {
        const { channel_id, message_html, notify_contacts } = payload;
        const message = await titanFetch(cfg, '/messages/', {
          method: 'POST',
          body: form({
            channel: channel_id,
            owner_email: cfg.ownerEmail,
            message_html,
            notify_contacts: notify_contacts === false ? 'false' : 'true',
          }),
        });

        if (engagementId) {
          await admin
            .from('tth_document_requests')
            .update({ status: 'requested' })
            .eq('engagement_id', engagementId)
            .eq('status', 'requested');
        }
        await logActivity('titanfile_requests_sent', 'Document request list sent to the secure channel.', {
          message_id: message?.id,
        });

        return json({ message });
      }

      // ---------------------------------------------------------------------
      case 'send_message': {
        const { channel_id, message_html } = payload;
        const message = await titanFetch(cfg, '/messages/', {
          method: 'POST',
          body: form({
            channel: channel_id,
            owner_email: cfg.ownerEmail,
            message_html,
            notify_contacts: 'true',
          }),
        });
        await logActivity('titanfile_message_sent', 'Secure message sent.', { message_id: message?.id });
        return json({ message });
      }

      // ---------------------------------------------------------------------
      case 'sync_files': {
        const { channel_id } = payload;
        if (!engagementId) return json({ error: 'engagement_id is required' }, 400);

        // Page through the channel file list.
        const files: any[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < 20; page += 1) {
          const res = await titanFetch(cfg, '/channel_files/', {
            query: { channel: channel_id, limit: '100', ...(cursor ? { starting_after: cursor } : {}) },
          });
          const batch: any[] = res?.data ?? [];
          files.push(...batch);
          if (!res?.has_more || batch.length === 0) break;
          cursor = batch[batch.length - 1].id;
        }

        const { data: requests } = await admin
          .from('tth_document_requests')
          .select('id, code, name, status, titanfile_file_id')
          .eq('engagement_id', engagementId);

        const openRequests = (requests ?? []) as {
          id: string;
          code: string;
          name: string;
          status: string;
          titanfile_file_id: string | null;
        }[];

        const claimed = new Set(openRequests.map((r) => r.titanfile_file_id).filter(Boolean) as string[]);
        const matched: { file: string; request: string }[] = [];
        const unmatched: { id: string; name: string; path: string | null }[] = [];

        for (const file of files) {
          if (!file.is_latest_revision) continue;
          if (claimed.has(file.id)) continue;

          const target = matchFile({ name: file.name, path: file.path }, openRequests);
          if (target && target.status === 'requested') {
            await admin
              .from('tth_document_requests')
              .update({
                status: 'received',
                titanfile_file_id: file.id,
                titanfile_file_name: file.name,
                titanfile_path: file.path ?? null,
                titanfile_size: file.size ?? null,
                received_at: file.date_created
                  ? new Date(file.date_created * 1000).toISOString()
                  : new Date().toISOString(),
              })
              .eq('id', target.id);
            target.status = 'received';
            claimed.add(file.id);
            matched.push({ file: file.name, request: target.name });
          } else {
            unmatched.push({ id: file.id, name: file.name, path: file.path ?? null });
          }
        }

        await logActivity(
          'titanfile_sync',
          `Synced ${files.length} file(s) from TitanFile — ${matched.length} matched to open requests.`,
          { matched: matched.length, unmatched: unmatched.length }
        );

        return json({ total: files.length, matched, unmatched });
      }

      // ---------------------------------------------------------------------
      case 'list_channels': {
        const res = await titanFetch(cfg, '/channels/', { query: { filter: 'active', limit: '50' } });
        return json(res);
      }

      default:
        return json({ error: `Unknown action "${action}"` }, 400);
    }
  } catch (e) {
    console.error('titanfile-sync error', e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
