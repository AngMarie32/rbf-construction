import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, LayoutTemplate, ClipboardList, Search, Layers, Save, ListPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string | null;
}

interface Row {
  key: string;
  category: string;
  subcategory: string;
  description: string;
  quantity: string;
  unit: string;
  unit_cost: string;
  markup_pct: string;
}

const blankRow = (): Row => ({
  key: crypto.randomUUID(),
  category: '',
  subcategory: '',
  description: '',
  quantity: '1',
  unit: 'each',
  unit_cost: '0',
  markup_pct: '0',
});

const money = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const rowTotal = (r: Row) =>
  (Number(r.quantity) || 0) * (Number(r.unit_cost) || 0) * (1 + (Number(r.markup_pct) || 0) / 100);

export default function BidTemplates() {
  const [templates, setTemplates] = useState<(Template & { count: number; value: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [saving, setSaving] = useState(false);

  const loadList = async () => {
    const { data } = await supabase.from('bid_templates').select('id, name, description').order('name');
    const { data: items } = await supabase.from('bid_template_items').select('template_id, quantity, unit_cost, markup_pct');
    const counts = new Map<string, number>();
    const values = new Map<string, number>();
    (items || []).forEach((i: any) => {
      if (!i.template_id) return;
      counts.set(i.template_id, (counts.get(i.template_id) || 0) + 1);
      const v = (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0) * (1 + (Number(i.markup_pct) || 0) / 100);
      values.set(i.template_id, (values.get(i.template_id) || 0) + v);
    });
    setTemplates((data || []).map((t) => ({ ...t, count: counts.get(t.id) || 0, value: values.get(t.id) || 0 })));
    setLoading(false);
  };

  useEffect(() => {
    loadList();
  }, []);

  const startNew = () => {
    setActiveId('new');
    setName('');
    setDescription('');
    setRows([blankRow()]);
  };

  const open = async (t: Template) => {
    setActiveId(t.id);
    setName(t.name);
    setDescription(t.description || '');
    const { data } = await supabase
      .from('bid_template_items')
      .select('*')
      .eq('template_id', t.id)
      .order('sort_order')
      .order('created_at');
    setRows(
      (data || []).length
        ? (data || []).map((i: any) => ({
            key: i.id,
            category: i.category || '',
            subcategory: i.subcategory || '',
            description: i.description || '',
            quantity: String(i.quantity ?? 1),
            unit: i.unit || 'each',
            unit_cost: String(i.unit_cost ?? 0),
            markup_pct: String(i.markup_pct ?? 0),
          }))
        : [blankRow()]
    );
  };

  const update = (key: string, field: keyof Row, value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const save = async () => {
    if (!name.trim()) return toast.error('Give the template a name.');
    const valid = rows.filter((r) => r.category.trim() || r.description.trim());
    setSaving(true);
    try {
      let id = activeId;
      if (id === 'new') {
        const { data, error } = await supabase
          .from('bid_templates')
          .insert({ name: name.trim(), description: description.trim() || null })
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
      } else if (id) {
        const { error } = await supabase
          .from('bid_templates')
          .update({ name: name.trim(), description: description.trim() || null, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        await supabase.from('bid_template_items').delete().eq('template_id', id);
      }
      if (valid.length) {
        const { error } = await supabase.from('bid_template_items').insert(
          valid.map((r, i) => ({
            template_id: id,
            category: r.category.trim() || 'General',
            subcategory: r.subcategory.trim() || null,
            description: r.description.trim(),
            quantity: Number(r.quantity) || 1,
            unit: r.unit.trim() || 'each',
            unit_cost: Number(r.unit_cost) || 0,
            markup_pct: Number(r.markup_pct) || 0,
            sort_order: i,
          }))
        );
        if (error) throw error;
      }
      toast.success('Template saved.');
      setActiveId(id);
      loadList();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save the template.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: Template) => {
    await supabase.from('bid_template_items').delete().eq('template_id', t.id);
    const { error } = await supabase.from('bid_templates').delete().eq('id', t.id);
    if (error) return toast.error('Could not delete the template.');
    if (activeId === t.id) setActiveId(null);
    toast.success('Template deleted');
    loadList();
  };

  const total = rows.reduce((s, r) => s + rowTotal(r), 0);

  const sections = new Set(rows.map((r) => r.category.trim()).filter(Boolean)).size;
  const totalLines = templates.reduce((s, t) => s + t.count, 0);
  const visibleTemplates = templates.filter((t) =>
    [t.name, t.description].filter(Boolean).some((v) => String(v).toLowerCase().includes(filter.trim().toLowerCase()))
  );

  return (
    <Layout hideTitle title="Bid Templates" subtitle="Reusable bid sections that fill the Bid Planner">
      <div className="space-y-6">
        <PageHero
          eyebrow="Bidding"
          title="Bid Templates"
          subtitle="Save the sections you price on every job once, then drop them into any bid from the Bid Planner."
          actions={
            <>
              <button type="button" className={heroButtonPrimary} onClick={startNew}>
                <Plus className="h-4 w-4" /> New template
              </button>
              <Link to="/bid-planner" className={heroButton}>
                <ClipboardList className="h-4 w-4" /> Open Bid Planner
              </Link>
            </>
          }
          stats={[
            { label: 'Templates', value: loading ? '…' : templates.length },
            { label: 'Saved lines', value: loading ? '…' : totalLines.toLocaleString() },
          ]}
        />

        {!loading && templates.length === 0 && !activeId ? (
          <EmptyState
            icon={LayoutTemplate}
            title="No bid templates yet"
            description="A template is a set of bid lines you reuse, like a standard bathroom remodel or site work package, with quantities, unit costs and markup."
            action={{ label: 'New template', onClick: startNew, icon: Plus }}
            steps={['Create a template and add its lines', 'Save it', 'In the Bid Planner, pick it from the Templates tab to add the lines to a project']}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            <Card className="h-fit overflow-hidden">
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-9 pl-8" placeholder="Find a template…" value={filter} onChange={(e) => setFilter(e.target.value)} />
                </div>
              </div>
              <div className="max-h-[60vh] space-y-1 overflow-y-auto p-2">
                {visibleTemplates.map((t) => (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'group flex cursor-pointer items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors',
                      activeId === t.id ? 'border-orange-500 bg-orange-500/10' : 'border-transparent hover:bg-muted'
                    )}
                    onClick={() => open(t)}
                    onKeyDown={(e) => e.key === 'Enter' && open(t)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.count} line{t.count === 1 ? '' : 's'} · {money(t.value)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 shrink-0 p-0 text-destructive opacity-60 group-hover:opacity-100"
                      title="Delete template"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(t);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {!loading && templates.length > 0 && !visibleTemplates.length && (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">No templates match.</p>
                )}
                {activeId === 'new' && (
                  <div className="flex items-center gap-3 rounded-lg border-l-2 border-orange-500 bg-orange-500/10 px-3 py-2.5 text-sm">
                    <Plus className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">{name.trim() || 'New template'}</span>
                  </div>
                )}
              </div>
            </Card>

            {activeId ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <AccentStat label="Lines" value={rows.filter((r) => r.category.trim() || r.description.trim()).length} icon={ListPlus} accent="blue" />
                  <AccentStat label="Sections" value={sections} icon={Layers} accent="indigo" />
                  <AccentStat label="Template total" value={money(total)} accent="emerald" hint="Incl. markup" />
                </div>

                <Card className="overflow-hidden">
                  <div className="grid gap-3 border-b p-4 md:grid-cols-2">
                    <div>
                      <Label>Template name</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard bathroom remodel" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea rows={1} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When to use it" />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <th className="px-2 py-2">Section</th>
                          <th className="px-2 py-2">Subsection</th>
                          <th className="px-2 py-2">Description</th>
                          <th className="w-20 px-2 py-2">Qty</th>
                          <th className="w-20 px-2 py-2">Unit</th>
                          <th className="w-28 px-2 py-2">Unit cost</th>
                          <th className="w-20 px-2 py-2">Markup %</th>
                          <th className="w-28 px-2 py-2 text-right">Total</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((r) => (
                          <tr key={r.key} className="hover:bg-muted/30">
                            <td className="p-1.5"><Input className="h-8" value={r.category} onChange={(e) => update(r.key, 'category', e.target.value)} /></td>
                            <td className="p-1.5"><Input className="h-8" value={r.subcategory} onChange={(e) => update(r.key, 'subcategory', e.target.value)} /></td>
                            <td className="p-1.5"><Input className="h-8" value={r.description} onChange={(e) => update(r.key, 'description', e.target.value)} /></td>
                            <td className="p-1.5"><Input className="h-8" type="number" step="0.001" value={r.quantity} onChange={(e) => update(r.key, 'quantity', e.target.value)} /></td>
                            <td className="p-1.5"><Input className="h-8" value={r.unit} onChange={(e) => update(r.key, 'unit', e.target.value)} /></td>
                            <td className="p-1.5"><Input className="h-8" type="number" step="0.001" value={r.unit_cost} onChange={(e) => update(r.key, 'unit_cost', e.target.value)} /></td>
                            <td className="p-1.5"><Input className="h-8" type="number" step="0.001" value={r.markup_pct} onChange={(e) => update(r.key, 'markup_pct', e.target.value)} /></td>
                            <td className="px-2 py-1.5 text-right font-medium tabular-nums">{money(rowTotal(r))}</td>
                            <td className="p-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Remove line"
                                onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-muted/30">
                          <td colSpan={7} className="px-2 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Template total</td>
                          <td className="px-2 py-2 text-right font-bold tabular-nums">{money(total)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t p-4">
                    <Button variant="outline" onClick={() => setRows((p) => [...p, blankRow()])}>
                      <Plus className="mr-2 h-4 w-4" /> Add line
                    </Button>
                    <Button onClick={save} disabled={saving} className="bg-orange-500 text-white hover:bg-orange-600">
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Saving…' : 'Save template'}
                    </Button>
                  </div>
                </Card>
                <p className="text-xs text-muted-foreground">
                  Use a template from the Templates tab in the{' '}
                  <Link to="/bid-planner" className="underline">
                    Bid Planner
                  </Link>{' '}
                  to add these lines to a project.
                </p>
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <LayoutTemplate className="h-6 w-6 text-muted-foreground" />
                </span>
                <p className="mt-3 font-medium">Pick a template to edit</p>
                <p className="mt-1 text-sm text-muted-foreground">Or start a new one with its own lines and markup.</p>
                <Button className="mt-4" variant="outline" onClick={startNew}>
                  <Plus className="mr-2 h-4 w-4" /> New template
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" and its lines will be removed. Bids that already used it keep their lines.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) remove(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
