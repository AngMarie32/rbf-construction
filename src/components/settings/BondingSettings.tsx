import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FIELDS = ['bond_capacity_single', 'bond_capacity_aggregate', 'surety_company', 'surety_agent', 'surety_agent_email', 'surety_agent_phone'] as const;
type Field = (typeof FIELDS)[number];

/** Bond program limits from the surety, stored on company_settings. */
export function BondingSettings() {
  const [id, setId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<Field, string>>({
    bond_capacity_single: '',
    bond_capacity_aggregate: '',
    surety_company: '',
    surety_agent: '',
    surety_agent_email: '',
    surety_agent_phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
      if (data) {
        setId(data.id);
        const d = data as any;
        setForm({
          bond_capacity_single: d.bond_capacity_single != null ? String(d.bond_capacity_single) : '',
          bond_capacity_aggregate: d.bond_capacity_aggregate != null ? String(d.bond_capacity_aggregate) : '',
          surety_company: d.surety_company || '',
          surety_agent: d.surety_agent || '',
          surety_agent_email: d.surety_agent_email || '',
          surety_agent_phone: d.surety_agent_phone || '',
        });
      }
      setLoading(false);
    })();
  }, []);

  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const single = form.bond_capacity_single === '' ? null : Number(form.bond_capacity_single.replace(/[$,]/g, ''));
    const aggregate = form.bond_capacity_aggregate === '' ? null : Number(form.bond_capacity_aggregate.replace(/[$,]/g, ''));
    if (single != null && aggregate != null && single > aggregate) return toast.error('The single-job limit can’t be higher than the aggregate capacity.');
    setSaving(true);
    const row: Record<string, any> = {
      bond_capacity_single: single,
      bond_capacity_aggregate: aggregate,
      surety_company: form.surety_company.trim() || null,
      surety_agent: form.surety_agent.trim() || null,
      surety_agent_email: form.surety_agent_email.trim() || null,
      surety_agent_phone: form.surety_agent_phone.trim() || null,
    };
    const res = id
      ? await supabase.from('company_settings').update(row as any).eq('id', id)
      : await supabase.from('company_settings').insert({ company_name: 'RBF Construction', ...row } as any).select('id').single();
    setSaving(false);
    if (res.error) {
      toast.error(
        /column|schema cache/i.test(res.error.message)
          ? 'Bond capacity needs a database update first (bonds and capacity). Ask an admin to run it, then save again.'
          : `Could not save: ${res.error.message}`
      );
      return;
    }
    if (!id && (res as any).data?.id) setId((res as any).data.id);
    toast.success('Bonding settings saved');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Bonding
        </CardTitle>
        <CardDescription>
          Your surety program limits. Bonded jobs on{' '}
          <Link to="/permits?tab=bonds" className="underline">
            Permits &amp; Bonds
          </Link>{' '}
          and the Report Snapshot are checked against these numbers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <form onSubmit={save} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bond_single">Single-job limit</Label>
                <Input id="bond_single" inputMode="decimal" placeholder="e.g. 2000000" value={form.bond_capacity_single} onChange={set('bond_capacity_single')} />
                <p className="text-xs text-muted-foreground">The largest bond the surety will write on one job.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bond_agg">Aggregate capacity</Label>
                <Input id="bond_agg" inputMode="decimal" placeholder="e.g. 5000000" value={form.bond_capacity_aggregate} onChange={set('bond_capacity_aggregate')} />
                <p className="text-xs text-muted-foreground">Total bonded work you can carry at one time.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="surety">Surety company</Label>
                <Input id="surety" value={form.surety_company} onChange={set('surety_company')} placeholder="Used as the default on new bonds" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent">Agent / broker</Label>
                <Input id="agent" value={form.surety_agent} onChange={set('surety_agent')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent_email">Agent email</Label>
                <Input id="agent_email" type="email" value={form.surety_agent_email} onChange={set('surety_agent_email')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent_phone">Agent phone</Label>
                <Input id="agent_phone" value={form.surety_agent_phone} onChange={set('surety_agent_phone')} />
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save bonding settings
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
