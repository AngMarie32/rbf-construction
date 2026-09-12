import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { tth } from '@/integrations/supabase/tradertax';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ExternalLink,
  FolderSync,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import {
  IntakeAnswers,
  TthClient,
  TthDocumentRequest,
  TthEngagement,
} from '@/types/tradertax';
import { buildDocumentRequests, buildRequestMessageHtml } from '@/utils/traderTax/documentCatalog';
import { docStatusTone, shortDate } from '@/utils/traderTax/labels';

interface DocumentsPanelProps {
  client: TthClient;
  engagement: TthEngagement;
  requests: TthDocumentRequest[];
  answers: IntakeAnswers;
  onRefresh: () => Promise<void> | void;
}

const STATUS_OPTIONS = ['requested', 'received', 'reviewed', 'waived', 'rejected'] as const;

export function DocumentsPanel({
  client,
  engagement,
  requests,
  answers,
  onRefresh,
}: DocumentsPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [channelDialog, setChannelDialog] = useState(false);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [manualUrl, setManualUrl] = useState(engagement.titanfile_channel_url ?? '');
  const [manualId, setManualId] = useState(engagement.titanfile_channel_id ?? '');
  const [inviteEmail, setInviteEmail] = useState(client.email ?? '');
  const [inviteFirst, setInviteFirst] = useState('');
  const [inviteLast, setInviteLast] = useState('');

  const grouped = useMemo(() => {
    return requests.reduce<Record<string, TthDocumentRequest[]>>((acc, r) => {
      (acc[r.category] ||= []).push(r);
      return acc;
    }, {});
  }, [requests]);

  const requiredCount = requests.filter((r) => r.is_required).length;
  const settledCount = requests.filter(
    (r) => r.is_required && ['received', 'reviewed', 'waived'].includes(r.status)
  ).length;
  const pct = requiredCount ? Math.round((settledCount / requiredCount) * 100) : 0;

  const callTitanFile = async (action: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('titanfile-sync', {
      body: { action, engagement_id: engagement.id, ...payload },
    });
    if (error) throw new Error(error.message);
    const body = data as { error?: string; detail?: string };
    if (body?.error) throw new Error(body.detail ? `${body.error} ${body.detail}` : body.error);
    return data as Record<string, unknown>;
  };

  const handleBuildChecklist = async () => {
    setBusy('checklist');
    try {
      const built = buildDocumentRequests(answers);
      const existing = new Set(requests.map((r) => r.code));
      const rows = built
        .filter((b) => !existing.has(b.code))
        .map((b) => ({ ...b, engagement_id: engagement.id, status: 'requested' }));

      if (rows.length === 0) {
        toast.info('Checklist already matches the intake answers');
        return;
      }

      const { error } = await tth.from('tth_document_requests').insert(rows);
      if (error) throw new Error(error.message);
      toast.success(`Added ${rows.length} document request${rows.length === 1 ? '' : 's'}`);
      await onRefresh();
    } catch (e) {
      toast.error('Could not build the checklist', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleCreateChannel = async () => {
    setBusy('channel');
    try {
      const result = await callTitanFile('create_channel', {
        client_id: client.id,
        channel_name: `${client.display_name} — ${engagement.tax_year} Tax`,
      });
      const channel = (result as { channel?: { channel_url?: string } }).channel;
      toast.success('Secure channel created', { description: channel?.channel_url });
      await onRefresh();
    } catch (e) {
      toast.error('TitanFile channel not created', { description: (e as Error).message });
      setChannelDialog(true);
    } finally {
      setBusy(null);
    }
  };

  const handleSaveManualChannel = async () => {
    setBusy('manual');
    try {
      const { error } = await tth
        .from('tth_engagements')
        .update({
          titanfile_channel_url: manualUrl.trim() || null,
          titanfile_channel_id: manualId.trim() || null,
        })
        .eq('id', engagement.id);
      if (error) throw new Error(error.message);
      await tth
        .from('tth_clients')
        .update({
          titanfile_channel_url: manualUrl.trim() || null,
          titanfile_channel_id: manualId.trim() || null,
        })
        .eq('id', client.id);
      toast.success('Channel details saved');
      setChannelDialog(false);
      await onRefresh();
    } catch (e) {
      toast.error('Could not save the channel', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleInvite = async () => {
    if (!engagement.titanfile_channel_id) {
      toast.error('Connect a TitanFile channel first');
      return;
    }
    setBusy('invite');
    try {
      await callTitanFile('add_contact', {
        channel_id: engagement.titanfile_channel_id,
        email: inviteEmail.trim(),
        first_name: inviteFirst.trim(),
        last_name: inviteLast.trim(),
        organization: client.legal_name ?? undefined,
      });
      toast.success(`Invited ${inviteEmail}`);
      setInviteDialog(false);
      await onRefresh();
    } catch (e) {
      toast.error('Could not invite the contact', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleSendRequests = async () => {
    if (!engagement.titanfile_channel_id) {
      toast.error('Connect a TitanFile channel first');
      return;
    }
    const outstanding = requests.filter((r) => r.status === 'requested');
    if (outstanding.length === 0) {
      toast.info('Nothing outstanding to request');
      return;
    }
    setBusy('send');
    try {
      const message_html = buildRequestMessageHtml(
        client.display_name,
        engagement.tax_year,
        outstanding.map((r) => ({
          name: r.name,
          category: r.category,
          description: r.description,
          is_required: r.is_required,
        }))
      );
      await callTitanFile('send_requests', {
        channel_id: engagement.titanfile_channel_id,
        message_html,
      });
      toast.success(`Requested ${outstanding.length} document${outstanding.length === 1 ? '' : 's'}`);
      await onRefresh();
    } catch (e) {
      toast.error('Could not send the request', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async () => {
    if (!engagement.titanfile_channel_id) {
      toast.error('Connect a TitanFile channel first');
      return;
    }
    setBusy('sync');
    try {
      const result = (await callTitanFile('sync_files', {
        channel_id: engagement.titanfile_channel_id,
      })) as { total: number; matched: unknown[]; unmatched: unknown[] };
      toast.success(
        `Synced ${result.total} file(s) — ${result.matched.length} matched, ${result.unmatched.length} unmatched`
      );
      await onRefresh();
    } catch (e) {
      toast.error('Sync failed', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const patch: Record<string, unknown> = { status };
    if (status === 'received') patch.received_at = new Date().toISOString();
    if (status === 'reviewed') patch.reviewed_at = new Date().toISOString();
    const { error } = await tth.from('tth_document_requests').update(patch).eq('id', id);
    if (error) {
      toast.error('Could not update', { description: error.message });
      return;
    }
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold">Secure document channel</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Every client document moves through TitanFile. Nothing tax-related goes over email.
            </p>
            {engagement.titanfile_channel_url ? (
              <a
                href={engagement.titanfile_channel_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Open channel <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="mt-2 text-sm text-amber-700">No channel connected yet.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!engagement.titanfile_channel_id && (
              <Button size="sm" onClick={handleCreateChannel} disabled={busy === 'channel'}>
                {busy === 'channel' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create channel
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setChannelDialog(true)}>
              Link existing
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInviteDialog(true)}
              disabled={!engagement.titanfile_channel_id}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite client
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendRequests}
              disabled={busy === 'send' || !engagement.titanfile_channel_id}
            >
              {busy === 'send' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send request list
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={busy === 'sync' || !engagement.titanfile_channel_id}
            >
              {busy === 'sync' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FolderSync className="mr-2 h-4 w-4" />
              )}
              Sync uploads
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Document checklist</h3>
            <p className="text-sm text-muted-foreground">
              {settledCount} of {requiredCount} required documents in hand
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleBuildChecklist} disabled={busy === 'checklist'}>
            {busy === 'checklist' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Build from intake
          </Button>
        </div>
        <Progress value={pct} className="mt-4 h-2" />
      </Card>

      {requests.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-medium">No document requests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build the checklist from the intake answers — only the documents that apply to this client’s
            facts are requested.
          </p>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <Card key={category} className="p-5">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </h4>
            <div className="space-y-2">
              {items.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      {!r.is_required && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          if applicable
                        </Badge>
                      )}
                      <Badge variant={docStatusTone(r.status)} className="text-[10px]">
                        {r.status}
                      </Badge>
                    </div>
                    {r.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                    )}
                    {r.titanfile_file_name && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.titanfile_file_name}
                        {r.received_at ? ` · received ${shortDate(r.received_at)}` : ''}
                      </p>
                    )}
                  </div>
                  <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <Dialog open={channelDialog} onOpenChange={setChannelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link an existing TitanFile channel</DialogTitle>
            <DialogDescription>
              Use this when the channel was created in TitanFile directly, or when the API credentials
              aren’t configured yet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Channel URL</Label>
              <Input
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://app.titanfile.com/channels/…"
              />
            </div>
            <div className="space-y-2">
              <Label>Channel ID</Label>
              <Input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="chan_0000…"
              />
              <p className="text-xs text-muted-foreground">
                Required for sending requests and syncing uploads through the API.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveManualChannel} disabled={busy === 'manual'}>
              {busy === 'manual' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to the secure channel</DialogTitle>
            <DialogDescription>
              The contact gets a TitanFile invitation and can upload directly into this channel.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Email</Label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>First name</Label>
              <Input value={inviteFirst} onChange={(e) => setInviteFirst(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input value={inviteLast} onChange={(e) => setInviteLast(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={busy === 'invite' || !inviteEmail.trim()}>
              {busy === 'invite' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
