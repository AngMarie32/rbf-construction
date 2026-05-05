import { Layout } from '@/components/layout/Layout';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, UsersRound, X } from 'lucide-react';
import { useRecipientGroups, useSaveRecipientGroup, useDeleteRecipientGroup, type RecipientGroup } from '@/hooks/useEsign';
import { toast } from 'sonner';

export default function EsignRecipientGroups() {
  const { data: groups = [], isLoading } = useRecipientGroups();
  const save = useSaveRecipientGroup();
  const del = useDeleteRecipientGroup();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecipientGroup | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<{ name: string; email: string; company?: string }[]>([
    { name: '', email: '', company: '' },
  ]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setMembers([{ name: '', email: '', company: '' }]);
    setOpen(true);
  };
  const openEdit = (g: RecipientGroup) => {
    setEditing(g);
    setName(g.name);
    setDescription(g.description || '');
    setMembers(g.members.length ? g.members.map(m => ({ name: m.name, email: m.email, company: m.company || '' })) : [{ name: '', email: '', company: '' }]);
    setOpen(true);
  };

  const updateMember = (i: number, patch: Partial<{ name: string; email: string; company: string }>) => {
    setMembers(prev => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };
  const addMember = () => setMembers(prev => [...prev, { name: '', email: '', company: '' }]);
  const removeMember = (i: number) => setMembers(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const cleaned = members
      .map(m => ({ name: m.name.trim(), email: m.email.trim(), company: (m.company || '').trim() || undefined }))
      .filter(m => m.name && m.email && /\S+@\S+\.\S+/.test(m.email));
    if (!name.trim()) return toast.error('Group name required');
    if (cleaned.length === 0) return toast.error('Add at least one valid member');
    await save.mutateAsync({ id: editing?.id, name, description, members: cleaned });
    setOpen(false);
  };

  return (
    <Layout title="Recipient Groups" subtitle="Reusable signer lists for E-Signature">
      <div className="space-y-4 max-w-4xl">
        <div className="flex justify-end items-center">
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Group</Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : groups.length === 0 ? (
          <Card className="p-12 text-center">
            <UsersRound className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No groups yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a group to reuse a set of signers across documents.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groups.map(g => (
              <Card key={g.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{g.name}</p>
                    {g.description && <p className="text-xs text-muted-foreground truncate">{g.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(g)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete group "${g.name}"?`)) del.mutate(g.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {g.members.length} member{g.members.length === 1 ? '' : 's'}
                </div>
                <div className="space-y-1 max-h-32 overflow-auto">
                  {g.members.slice(0, 5).map((m, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-medium">{m.name}</span>{' '}
                      <span className="text-muted-foreground">— {m.email}</span>
                      {m.company && <span className="text-muted-foreground"> · {m.company}</span>}
                    </div>
                  ))}
                  {g.members.length > 5 && (
                    <div className="text-xs text-muted-foreground">+{g.members.length - 5} more…</div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit group' : 'New recipient group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Group name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Members</Label>
              <div className="space-y-2">
                {members.map((m, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-4"
                      placeholder="Name"
                      value={m.name}
                      onChange={(e) => updateMember(i, { name: e.target.value })}
                    />
                    <Input
                      className="col-span-4"
                      type="email"
                      placeholder="Email"
                      value={m.email}
                      onChange={(e) => updateMember(i, { email: e.target.value })}
                    />
                    <Input
                      className="col-span-3"
                      placeholder="Company"
                      value={m.company || ''}
                      onChange={(e) => updateMember(i, { company: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-1 h-9 w-9"
                      onClick={() => removeMember(i)}
                      disabled={members.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMember}>
                <Plus className="h-4 w-4 mr-1" /> Add member
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}