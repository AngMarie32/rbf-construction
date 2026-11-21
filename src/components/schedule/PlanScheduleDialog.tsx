import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { localDateISO } from '@/utils/dates';
import { addWorkdays, buildSchedulePreview, parseScheduleDay, type SchedulePreviewTask } from '@/utils/planSchedule';

const FILE_LIMIT = 12 * 1024 * 1024;
const TOTAL_LIMIT = 30 * 1024 * 1024;

interface ProjectOption { id: string; name: string; color?: string }
interface PlanFile { url: string; name: string; fileType?: string }
interface EstimateSource {
  name: string;
  files: PlanFile[];
  lines: Array<{ name: string; section?: string; quantity?: number | null; unit?: string | null }>;
}

interface PlanScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  initialProjectId?: string;
  estimate?: EstimateSource;
  onSaved: (projectId: string) => void;
}

export function PlanScheduleDialog({ open, onOpenChange, projects, initialProjectId, estimate, onSaved }: PlanScheduleDialogProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState(localDateISO());
  const [dateMode, setDateMode] = useState<'chosen' | 'plans'>('chosen');
  const [files, setFiles] = useState<File[]>([]);
  const [tasks, setTasks] = useState<SchedulePreviewTask[]>([]);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState('');

  useEffect(() => {
    if (!open) return;
    setProjectId(initialProjectId || '');
    setFiles([]);
    setTasks([]);
    setAssumptions([]);
    setStage('');
  }, [open, initialProjectId, estimate?.name]);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = Array.from(incoming);
    const unsupported = next.filter((file) => file.type !== 'application/pdf' && !file.type.startsWith('image/'));
    const supported = next.filter((file) => file.type === 'application/pdf' || file.type.startsWith('image/'));
    const tooBig = supported.filter((file) => file.size > FILE_LIMIT);
    const accepted = supported.filter((file) => file.size <= FILE_LIMIT);
    if (unsupported.length) toast.error('Use PDF, PNG, JPG, or WEBP plan files.');
    if (tooBig.length) toast.error(`${tooBig.map((file) => file.name).join(', ')} over the 12 MB per-file limit.`);
    const combined = [...files, ...accepted];
    if (combined.reduce((sum, file) => sum + file.size, 0) > TOTAL_LIMIT) return toast.error('Keep each upload batch under 30 MB.');
    setFiles(combined);
  };

  const generate = async () => {
    if (!projectId) return toast.error('Choose the project for this schedule.');
    if (!startDate) return toast.error('Choose a start date or fallback date.');
    if (!estimate && !files.length) return toast.error('Upload at least one plan document.');
    if (estimate && !estimate.files.length && !estimate.lines.length) return toast.error('This estimate has no plan files or scope lines to use.');

    setBusy(true);
    setStage(estimate ? 'Reading the saved estimate plans and scope…' : 'Uploading plan documents…');
    try {
      let sourceFiles = estimate?.files || [];
      if (!estimate) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error('Sign in again before generating a schedule.');
        sourceFiles = await Promise.all(files.map(async (file) => {
          const extension = file.name.split('.').pop() || 'pdf';
          const path = `estimates/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
          const { error } = await supabase.storage.from('plan_documents').upload(path, file, { contentType: file.type });
          if (error) throw error;
          const { data } = supabase.storage.from('plan_documents').getPublicUrl(path);
          return { url: data.publicUrl, name: file.name, fileType: file.type };
        }));
      }

      setStage('Building activities, durations, and dependencies…');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Your session has expired. Sign in again.');
      const projectName = projects.find((project) => project.id === projectId)?.name || estimate?.name || '';
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          files: sourceFiles,
          estimateLines: estimate?.lines || [],
          projectName,
          startDate,
          dateMode,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Schedule generation failed.');
      const effectiveStart = dateMode === 'plans' && result.detectedStartDate ? result.detectedStartDate : startDate;
      const preview = buildSchedulePreview(result.tasks || [], effectiveStart);
      if (!preview.length) throw new Error('No activities were produced. Try uploading clearer or more complete plans.');
      setTasks(preview);
      setAssumptions(result.assumptions || []);
      if (dateMode === 'plans' && result.detectedStartDate) toast.success(`Using the plan start date: ${result.detectedStartDate}`);
      else if (dateMode === 'plans') toast.message('No start date was stated in the plans; using your fallback date.');
    } catch (error: any) {
      console.error('Plan schedule generation failed:', error);
      toast.error(error.message || 'Could not generate the schedule.');
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  const updateTask = (id: string, patch: Partial<SchedulePreviewTask>) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } : task));
  };

  const updateDuration = (task: SchedulePreviewTask, durationDays: number) => {
    const duration = Math.max(1, Math.round(durationDays || 1));
    updateTask(task.id, { durationDays: duration, endDate: localDateISO(addWorkdays(parseScheduleDay(task.startDate), duration - 1)) });
  };

  const addTask = () => {
    const id = `manual-${Date.now()}`;
    setTasks((current) => [...current, {
      id, title: '', phase: 'Construction', durationDays: 1, startOffsetDays: 0, dependsOn: [], source: 'Added by contractor', startDate, endDate: startDate,
    }]);
  };

  const save = async () => {
    if (!projectId) return toast.error('Choose a project.');
    if (!tasks.length) return toast.error('Generate or add at least one activity.');
    if (tasks.some((task) => !task.title.trim() || !task.startDate || !task.endDate || task.endDate < task.startDate)) {
      return toast.error('Every activity needs a name and a valid start and end date.');
    }
    setSaving(true);
    try {
      const savedIds = new Map<string, string>();
      for (const task of tasks) {
        const dependencies = task.dependsOn.map((id) => savedIds.get(id)).filter((id): id is string => !!id);
        const { data, error } = await supabase.from('tasks').insert({
          project_id: projectId,
          title: task.title.trim(),
          start_date: task.startDate,
          end_date: task.endDate,
          status: 'Not Started',
          progress: 0,
          dependencies,
        }).select('id').single();
        if (error) throw error;
        savedIds.set(task.id, data.id);
      }
      toast.success(`${tasks.length} schedule activities saved.`);
      onSaved(projectId);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Saving generated schedule failed:', error);
      toast.error(`The schedule was not fully saved: ${error.message || 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl">
        <DialogHeader>
          <DialogTitle>{estimate ? 'Create schedule from estimate plans' : 'Create schedule from plans'}</DialogTitle>
          <DialogDescription>Generate a contractor review schedule, adjust it, then save the activities to one project.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 rounded-lg bg-muted/30 p-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Choose a project" /></SelectTrigger>
              <SelectContent searchable="always">
                {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Schedule dates</Label>
            <Select value={dateMode} onValueChange={(value: 'chosen' | 'plans') => setDateMode(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="chosen">Use my start date</SelectItem>
                <SelectItem value="plans">Use a start date found in plans</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-start">{dateMode === 'plans' ? 'Fallback start date' : 'Project start date'}</Label>
            <Input id="schedule-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
        </div>

        {!estimate && (
          <div
            className="rounded-lg border border-dashed p-5 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}
          >
            <input ref={fileInput} type="file" className="hidden" multiple accept="application/pdf,image/*" onChange={(event) => addFiles(event.target.files)} />
            <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
              <Upload className="mr-2 h-4 w-4" /> Add plan documents
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">PDF or images · 12 MB each · 30 MB total · multiple files allowed</p>
            {files.length > 0 && <p className="mt-2 text-sm">{files.map((file) => file.name).join(' · ')}</p>}
          </div>
        )}

        {estimate && (
          <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm">
            <strong>{estimate.name}</strong>
            <p className="text-muted-foreground">{estimate.files.length} saved plan file{estimate.files.length === 1 ? '' : 's'} and {estimate.lines.length} estimate scope lines will be used.</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="button" onClick={generate} disabled={busy || saving}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tasks.length ? 'Generate again' : 'Generate schedule preview'}
          </Button>
          {stage && <span className="text-sm text-muted-foreground">{stage}</span>}
        </div>

        {assumptions.length > 0 && (
          <div className="rounded-lg bg-muted/30 p-4 text-sm">
            <p className="font-medium">Planning assumptions to review</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">{assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <div className="min-w-[1050px]">
              <div className="grid grid-cols-[2fr_1fr_135px_90px_135px_1.4fr_42px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Activity</span><span>Phase</span><span>Start</span><span>Workdays</span><span>End</span><span>After</span><span />
              </div>
              {tasks.map((task, taskIndex) => (
                <div key={task.id} className="grid grid-cols-[2fr_1fr_135px_90px_135px_1.4fr_42px] items-center gap-2 border-b px-3 py-2 last:border-0">
                  <div>
                    <Input aria-label={`Activity ${task.id} name`} value={task.title} onChange={(event) => updateTask(task.id, { title: event.target.value })} />
                    <p className="mt-1 truncate text-[11px] text-muted-foreground" title={task.source}>{task.source}</p>
                  </div>
                  <Input aria-label={`${task.title} phase`} value={task.phase} onChange={(event) => updateTask(task.id, { phase: event.target.value })} />
                  <Input aria-label={`${task.title} start`} type="date" value={task.startDate} onChange={(event) => updateTask(task.id, { startDate: event.target.value })} />
                  <Input aria-label={`${task.title} workdays`} type="number" min="1" value={task.durationDays} onChange={(event) => updateDuration(task, Number(event.target.value))} />
                  <Input aria-label={`${task.title} end`} type="date" value={task.endDate} min={task.startDate} onChange={(event) => updateTask(task.id, { endDate: event.target.value })} />
                  <Select value={task.dependsOn[0] || 'none'} onValueChange={(value) => updateTask(task.id, { dependsOn: value === 'none' ? [] : [value] })}>
                    <SelectTrigger aria-label={`${task.title} predecessor`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No predecessor</SelectItem>
                      {tasks.slice(0, taskIndex).map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${task.title}`} onClick={() => setTasks((current) => current.filter((candidate) => candidate.id !== task.id).map((candidate) => ({ ...candidate, dependsOn: candidate.dependsOn.filter((id) => id !== task.id) })))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={addTask}><Plus className="mr-2 h-4 w-4" /> Add activity</Button>
        )}
        <p className="text-xs text-muted-foreground">Saving adds these activities; existing project tasks are left unchanged. Review durations and sequencing before using this for contracting.</p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={save} disabled={saving || busy || !tasks.length}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save {tasks.length || ''} activities
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
