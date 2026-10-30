import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

const CATS = ['labor', 'equipment', 'material', 'other'] as const;
const CAT_LABEL: Record<string, string> = { labor: 'Labor', equipment: 'Equipment', material: 'Material', other: 'Other' };

interface Row { id: string; company_id: string | null; category: string; name: string; unit: string; unit_cost: number; notes: string | null; is_active: boolean }

export default function CostDatabase() {
  const { selectedIds } = useCompanies();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState({ category: 'labor', name: '', unit: 'HR', unit_cost: '' });

  const load = async () => {
    let q = supabase.from('cost_database' as any).select('*').order('category').order('name');
    if (selectedIds.length) q = q.or(`company_id.is.null,company_id.in.(${selectedIds.join(',')})`);
    const { data, error } = await q;
    if (error) return toast.error(error.message);
    setRows((data as any) || []);
  };
  useEffect(() => { load(); }, [selectedIds.join(',')]);

  const add = async () => {
    if (!draft.name.trim()) return toast.error('Give the cost a name.');
    const { error } = await supabase.from('cost_database' as any).insert({
      company_id: selectedIds.length === 1 ? selectedIds[0] : null,
      category: draft.category, name: draft.name.trim(), unit: draft.unit.trim() || 'EA',
      unit_cost: parseFloat(draft.unit_cost) || 0,
    });
    if (error) return toast.error(error.message);
    setDraft({ ...draft, name: '', unit_cost: '' });
    load();
  };

  const save = async (r: Row, patch: Partial<Row>) => {
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from('cost_database' as any).update(patch).eq('id', r.id);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    setRows((rs) => rs.filter((x) => x.id !== id));
    await supabase.from('cost_database' as any).delete().eq('id', id);
  };

  const shown = rows.filter((r) => `${r.name} ${r.category} ${r.notes ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout title="Cost Database" subtitle="Your own labor, equipment and material rates — the Bid Estimator prices with these first">
      <div className="space-y-6">
        <Card className="p-4 flex flex-wrap gap-3 items-end">
          <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v, unit: v === 'labor' || v === 'equipment' ? 'HR' : draft.unit })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="flex-1 min-w-48" placeholder="e.g. Carpenter journeyman, Mini excavator, 3000 psi concrete" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input className="w-24" placeholder="Unit" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
          <Input className="w-32" type="number" step="0.001" placeholder="Unit cost" value={draft.unit_cost} onChange={(e) => setDraft({ ...draft, unit_cost: e.target.value })} />
          <Button onClick={add}>Add cost</Button>
        </Card>
        <Input placeholder="Search costs" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="p-3">Category</th><th className="p-3">Name</th><th className="p-3">Unit</th>
                <th className="p-3 text-right">Unit cost</th><th className="p-3">Notes</th><th className="p-3">Use</th><th />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-2 w-36">
                    <Select value={r.category} onValueChange={(v) => save(r, { category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-2"><Input defaultValue={r.name} onBlur={(e) => e.target.value !== r.name && save(r, { name: e.target.value })} /></td>
                  <td className="p-2 w-24"><Input defaultValue={r.unit} onBlur={(e) => e.target.value !== r.unit && save(r, { unit: e.target.value })} /></td>
                  <td className="p-2 w-32"><Input className="text-right" type="number" step="0.001" defaultValue={r.unit_cost} onBlur={(e) => save(r, { unit_cost: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="p-2"><Input defaultValue={r.notes ?? ''} onBlur={(e) => save(r, { notes: e.target.value || null })} /></td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" onClick={() => save(r, { is_active: !r.is_active })}>{r.is_active ? 'On' : 'Off'}</Button>
                  </td>
                  <td className="p-2"><Button variant="ghost" size="sm" onClick={() => remove(r.id)}>Delete</Button></td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No costs yet. Add your crew rates, equipment rates and common materials above.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </Layout>
  );
}
