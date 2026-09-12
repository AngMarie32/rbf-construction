import { useEffect, useState } from 'react';
import { tth } from '@/integrations/supabase/tradertax';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarClock, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ConsultationActionItem,
  ConsultationAnalysis,
  TthConsultation,
  TthEngagement,
} from '@/types/tradertax';
import { shortDate } from '@/utils/traderTax/labels';

interface ConsultationPanelProps {
  engagement: TthEngagement;
  consultations: TthConsultation[];
  analysis: ConsultationAnalysis | null;
  onRefresh: () => Promise<void> | void;
}

export function ConsultationPanel({
  engagement,
  consultations,
  analysis,
  onRefresh,
}: ConsultationPanelProps) {
  const { user } = useAuth();
  const active = consultations[0] ?? null;

  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState<'video' | 'phone' | 'in_person'>('video');
  const [attendees, setAttendees] = useState('');
  const [agenda, setAgenda] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [actionItems, setActionItems] = useState<ConsultationActionItem[]>([]);
  const [status, setStatus] = useState<TthConsultation['status']>('scheduled');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!active) {
      setAgenda(analysis?.consultAgenda ?? []);
      return;
    }
    setScheduledAt(active.scheduled_at ? active.scheduled_at.slice(0, 16) : '');
    setDuration(active.duration_minutes);
    setMode(active.mode);
    setAttendees((active.attendees ?? []).join(', '));
    setAgenda(active.agenda?.length ? active.agenda : analysis?.consultAgenda ?? []);
    setNotes(active.notes ?? '');
    setActionItems(active.action_items ?? []);
    setStatus(active.status);
  }, [active, analysis]);

  const save = async () => {
    setSaving(true);
    const payload = {
      engagement_id: engagement.id,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      duration_minutes: duration,
      mode,
      attendees: attendees
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      agenda,
      notes: notes || null,
      action_items: actionItems,
      status,
      created_by: user?.id ?? null,
    };

    const { error } = active
      ? await tth.from('tth_consultations').update(payload).eq('id', active.id)
      : await tth.from('tth_consultations').insert(payload);

    if (!error && scheduledAt) {
      await tth
        .from('tth_engagements')
        .update({
          consult_at: new Date(scheduledAt).toISOString(),
          status: status === 'completed' ? 'consult_complete' : 'consult_scheduled',
        })
        .eq('id', engagement.id);
    }

    setSaving(false);
    if (error) {
      toast.error('Could not save the consultation', { description: error.message });
      return;
    }
    toast.success('Consultation saved');
    await onRefresh();
  };

  const addActionItem = () => {
    setActionItems((prev) => [
      ...prev,
      {
        id: `ai_${Date.now()}`,
        text: '',
        owner: 'Firm',
        due_date: null,
        done: false,
      },
    ]);
  };

  const pullAgendaFromAnalysis = () => {
    if (!analysis) {
      toast.error('Run the analysis first');
      return;
    }
    setAgenda(analysis.consultAgenda);
    toast.success('Agenda pulled from the analysis');
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Consultation</h3>
            {active && <Badge variant="outline">{active.status}</Badge>}
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Date and time</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Duration (min)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="in_person">In person</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Attendees</Label>
            <Input
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="Client, spouse, prior preparer…"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TthConsultation['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Agenda</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={pullAgendaFromAnalysis}>
              Pull from analysis
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAgenda((a) => [...a, ''])}>
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {agenda.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No agenda yet — pull it from the analysis to open the call with the decisions that matter.
            </p>
          )}
          {agenda.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2.5 w-5 shrink-0 text-sm text-muted-foreground">{i + 1}.</span>
              <Textarea
                rows={2}
                value={item}
                onChange={(e) =>
                  setAgenda((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                }
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setAgenda((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {analysis && analysis.clientQuestions.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-2 font-semibold">Questions to ask</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {analysis.clientQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="mb-2 font-semibold">Call notes</h3>
        <Textarea
          rows={12}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What was decided, what the client pushed back on, what facts changed. These notes are the file."
        />
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Action items</h3>
          <Button size="sm" variant="outline" onClick={addActionItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {actionItems.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing captured yet.</p>
          )}
          {actionItems.map((item, i) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
              <Checkbox
                checked={item.done}
                onCheckedChange={(checked) =>
                  setActionItems((prev) =>
                    prev.map((a, idx) => (idx === i ? { ...a, done: checked === true } : a))
                  )
                }
              />
              <Input
                className="min-w-[240px] flex-1"
                value={item.text}
                placeholder="Action"
                onChange={(e) =>
                  setActionItems((prev) =>
                    prev.map((a, idx) => (idx === i ? { ...a, text: e.target.value } : a))
                  )
                }
              />
              <Input
                className="w-32"
                value={item.owner}
                placeholder="Owner"
                onChange={(e) =>
                  setActionItems((prev) =>
                    prev.map((a, idx) => (idx === i ? { ...a, owner: e.target.value } : a))
                  )
                }
              />
              <Input
                className="w-40"
                type="date"
                value={item.due_date ?? ''}
                onChange={(e) =>
                  setActionItems((prev) =>
                    prev.map((a, idx) => (idx === i ? { ...a, due_date: e.target.value || null } : a))
                  )
                }
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setActionItems((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {consultations.length > 1 && (
        <Card className="p-5">
          <h3 className="mb-2 font-semibold">Earlier consultations</h3>
          <div className="space-y-2">
            {consultations.slice(1).map((c) => (
              <div key={c.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{shortDate(c.scheduled_at)}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {c.status}
                  </Badge>
                </div>
                {c.notes && <p className="mt-1 text-muted-foreground">{c.notes.slice(0, 240)}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
