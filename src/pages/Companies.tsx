import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const TYPES = [
  { id: 'construction', label: 'Construction' },
  { id: 'investment', label: 'Investment' },
  { id: 'property_management', label: 'Property Management' },
  { id: 'other', label: 'Other' },
];

interface Profile {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
}

function emptyCompany() {
  return {
    id: '',
    name: '',
    type: 'construction',
    group_id: null as string | null,
    address: '',
    phone: '',
    email: '',
    is_active: true,
  };
}

export default function Companies() {
  const { companies, groups, isAdmin, refresh } = useCompanies();
  const [form, setForm] = useState(emptyCompany());
  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [grants, setGrants] = useState<{ user_id: string; company_id: string }[]>([]);

  const loadAccess = async () => {
    const [{ data: p }, { data: g }] = await Promise.all([
      supabase.from('profiles').select('id,name,email,role').order('email'),
      supabase.from('user_companies').select('user_id,company_id'),
    ]);
    setProfiles((p as any) || []);
    setGrants((g as any) || []);
  };
  useEffect(() => {
    if (isAdmin) loadAccess();
  }, [isAdmin]);

  const saveCompany = async () => {
    if (!form.name.trim()) {
      toast.error('Company name required');
      return;
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      group_id: form.group_id,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      is_active: form.is_active,
    };
    const { error } = form.id
      ? await supabase.from('companies').update(payload).eq('id', form.id)
      : await supabase.from('companies').insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? 'Company updated' : 'Company created');
    setShowForm(false);
    setForm(emptyCompany());
    refresh();
  };

  const deleteCompany = async (id: string) => {
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Company deleted');
    refresh();
  };

  const addGroup = async () => {
    if (!groupName.trim()) return;
    const { error } = await supabase.from('company_groups').insert({ name: groupName.trim() });
    if (error) return toast.error(error.message);
    setGroupName('');
    refresh();
  };

  const deleteGroup = async (id: string) => {
    const { error } = await supabase.from('company_groups').delete().eq('id', id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const toggleGrant = async (userId: string, companyId: string, has: boolean) => {
    if (has) {
      await supabase.from('user_companies').delete().eq('user_id', userId).eq('company_id', companyId);
    } else {
      await supabase.from('user_companies').insert({ user_id: userId, company_id: companyId });
    }
    loadAccess();
  };

  return (
    <Layout title="Companies" subtitle="Manage the entities in your portfolio and who can see them">
      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          {isAdmin && <TabsTrigger value="access">User access</TabsTrigger>}
        </TabsList>

        <TabsContent value="companies" className="space-y-3 mt-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setForm(emptyCompany());
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> New Company
              </Button>
            </div>
          )}

          {showForm && (
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Group</Label>
                  <Select
                    value={form.group_id ?? 'none'}
                    onValueChange={(v) => setForm({ ...form, group_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No group</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button onClick={saveCompany}>{form.id ? 'Save' : 'Create'}</Button>
              </div>
            </Card>
          )}

          {companies.length === 0 ? (
            <p className="text-muted-foreground">No companies yet.</p>
          ) : (
            companies.map((c) => (
              <Card key={c.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold">{c.name}</h3>
                    <Badge variant="outline">{c.type.replace('_', ' ')}</Badge>
                    {c.group_id && (
                      <Badge variant="secondary">{groups.find((g) => g.id === c.group_id)?.name}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {[c.address, c.email, c.phone].filter(Boolean).join(' · ') || 'No contact details'}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setForm({
                          id: c.id,
                          name: c.name,
                          type: c.type,
                          group_id: c.group_id,
                          address: c.address ?? '',
                          phone: c.phone ?? '',
                          email: c.email ?? '',
                          is_active: c.is_active,
                        });
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteCompany(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-3 mt-4">
          {isAdmin && (
            <div className="flex gap-2 max-w-md">
              <Input
                placeholder="Group name (e.g. Holdings)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <Button onClick={addGroup}>Add</Button>
            </div>
          )}
          {groups.map((g) => (
            <Card key={g.id} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold">{g.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {companies.filter((c) => c.group_id === g.id).length} companies
                </p>
              </div>
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => deleteGroup(g.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </Card>
          ))}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="access" className="mt-4">
            <Card className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">User</th>
                    {companies.map((c) => (
                      <th key={c.id} className="py-2 px-3 whitespace-nowrap">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{p.name || p.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.email} · {p.role}
                        </div>
                      </td>
                      {companies.map((c) => {
                        const has = grants.some((g) => g.user_id === p.id && g.company_id === c.id);
                        return (
                          <td key={c.id} className="py-2 px-3">
                            <Checkbox
                              checked={has || p.role === 'Admin'}
                              disabled={p.role === 'Admin'}
                              onCheckedChange={() => toggleGrant(p.id, c.id, has)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-3">
                Admins automatically have access to every company.
              </p>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </Layout>
  );
}