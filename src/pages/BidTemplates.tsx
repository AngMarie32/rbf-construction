import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';
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
  const [templates, setTemplates] = useState<(Template & { count: number })[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [saving, setSaving] = useState(false);

  const loadList = async () => {
    const { data } = await supabase.from('bid_templates').select('id, name, description').order('name');
    const { data: items } = await supabase.from('bid_template_items').select('template_id');
    const counts = new Map<string, number>();
    (items || []).forEach((i) => i.template_id && counts.set(i.template_id, (counts.get(i.template_id) || 0) + 1));
    setTemplates((data || []).map((t) => ({ ...t, count: counts.get(t.id) || 0 })));
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
    if (!confirm(`Delete the template "${t.name}"?`)) return;
    await supabase.from('bid_template_items').delete().eq('template_id', t.id);
    const { error } = await supabase.from('bid_templates').delete().eq('id', t.id);
    if (error) return toast.error('Could not delete the template.');
    if (activeId === t.id) setActiveId(null);
    loadList();
  };

  const total = rows.reduce((s, r) => s + rowTotal(r), 0);

  return (
    <Layout title="Bid Templates" subtitle="Reusable bid sections that fill the Bid Planner">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="p-4 space-y-2 h-fit">
          <Button className="w-full" onClick={startNew}>
            New template
          </Button>
          {templates.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer ${
                activeId === t.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => open(t)}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.count} lines</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(t);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {!templates.length && <p className="text-sm text-muted-foreground">No templates yet.</p>}
        </Card>

        {activeId ? (
          <Card className="p-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Template name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={1} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="p-1">Section</th>
                    <th className="p-1">Subsection</th>
                    <th className="p-1">Description</th>
                    <th className="p-1 w-20">Qty</th>
                    <th className="p-1 w-20">Unit</th>
                    <th className="p-1 w-28">Unit cost</th>
                    <th className="p-1 w-20">Markup %</th>
                    <th className="p-1 w-28 text-right">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td className="p-1"><Input className="h-8" value={r.category} onChange={(e) => update(r.key, 'category', e.target.value)} /></td>
                      <td className="p-1"><Input className="h-8" value={r.subcategory} onChange={(e) => update(r.key, 'subcategory', e.target.value)} /></td>
                      <td className="p-1"><Input className="h-8" value={r.description} onChange={(e) => update(r.key, 'description', e.target.value)} /></td>
                      <td className="p-1"><Input className="h-8" type="number" step="0.001" value={r.quantity} onChange={(e) => update(r.key, 'quantity', e.target.value)} /></td>
                      <td className="p-1"><Input className="h-8" value={r.unit} onChange={(e) => update(r.key, 'unit', e.target.value)} /></td>
                      <td className="p-1"><Input className="h-8" type="number" step="0.001" value={r.unit_cost} onChange={(e) => update(r.key, 'unit_cost', e.target.value)} /></td>
                      <td className="p-1"><Input className="h-8" type="number" step="0.001" value={r.markup_pct} onChange={(e) => update(r.key, 'markup_pct', e.target.value)} /></td>
                      <td className="p-1 text-right font-medium">{money(rowTotal(r))}</td>
                      <td className="p-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="outline" onClick={() => setRows((p) => [...p, blankRow()])}>
                Add line
              </Button>
              <div className="flex items-center gap-4">
                <span className="text-sm">Template total: <strong>{money(total)}</strong></span>
                <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save template'}</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use a template from the Templates tab in the <Link to="/bid-planner" className="underline">Bid Planner</Link> to add these lines to a project.
            </p>
          </Card>
        ) : (
          <Card className="p-8 text-center text-muted-foreground">Pick a template or start a new one.</Card>
        )}
      </div>
    </Layout>
  );
}
