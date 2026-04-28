import { Layout } from '@/components/layout/Layout';
import {
  useTemplates, useDeleteTemplate, useUpdateTemplate,
  useDocumentTypes, useCreateDocumentType, useUpdateDocumentType, useDeleteDocumentType,
} from '@/hooks/useEsign';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ArrowRight, Trash2, Pencil, Tag, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function EsignTemplates() {
  const { data: templates = [], isLoading } = useTemplates();
  const navigate = useNavigate();
  const del = useDeleteTemplate();
  const updateTpl = useUpdateTemplate();
  const { data: docTypes = [] } = useDocumentTypes();
  const createType = useCreateDocumentType();
  const updateType = useUpdateDocumentType();
  const deleteType = useDeleteDocumentType();

  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState<string>('none');

  const [typesOpen, setTypesOpen] = useState(false);
  const [newType, setNewType] = useState('');

  const openEdit = (t: any) => {
    setEditing(t);
    setEditName(t.name || '');
    setEditDesc(t.description || '');
    setEditType(t.document_type || 'none');
  };

  const saveEdit = async () => {
    if (!editing) return;
    await updateTpl.mutateAsync({
      id: editing.id,
      name: editName,
      description: editDesc || null,
      document_type: editType === 'none' ? null : editType,
    });
    setEditing(null);
  };

  return (
    <Layout title="Templates" subtitle="Pre-built and custom e-sign templates">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={typesOpen} onOpenChange={setTypesOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Tag className="h-4 w-4 mr-2" /> Manage Document Types</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Document Types</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="New type name (e.g. Warranty)"
                  />
                  <Button
                    onClick={async () => {
                      if (!newType.trim()) return;
                      await createType.mutateAsync(newType.trim());
                      setNewType('');
                    }}
                    disabled={createType.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="border rounded-lg divide-y max-h-[360px] overflow-auto">
                  {docTypes.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">No document types yet.</p>
                  )}
                  {docTypes.map((t) => (
                    <TypeRow
                      key={t.id}
                      type={t}
                      onRename={(newName) => updateType.mutate({ id: t.id, name: newName, oldName: t.name })}
                      onDelete={() => {
                        if (confirm(`Delete "${t.name}"? Documents/templates tagged with it will become untagged.`)) {
                          deleteType.mutate({ id: t.id, name: t.name });
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTypesOpen(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => (
              <Card key={t.id} className="p-5 hover:shadow-md transition group">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(t as any).document_type && (
                      <Badge variant="outline" className="text-xs">{(t as any).document_type}</Badge>
                    )}
                    {t.is_system && <Badge variant="outline" className="text-xs">System</Badge>}
                  </div>
                </div>
                <h3 className="font-semibold mb-1">{t.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{t.description}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-between"
                    onClick={() => navigate(`/esign/new?template=${t.id}`)}
                  >
                    Use template <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit template">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Delete template "${t.name}"?`)) del.mutate(t.id);
                    }}
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger><SelectValue placeholder="Untagged" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Untagged</SelectItem>
                  {docTypes.map((t) => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={updateTpl.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function TypeRow({
  type, onRename, onDelete,
}: { type: { id: string; name: string }; onRename: (n: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(type.name);
  return (
    <div className="flex items-center justify-between p-2.5 gap-2">
      {editing ? (
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && val.trim()) { onRename(val.trim()); setEditing(false); }
            if (e.key === 'Escape') { setVal(type.name); setEditing(false); }
          }}
        />
      ) : (
        <span className="text-sm">{type.name}</span>
      )}
      <div className="flex gap-1">
        {editing ? (
          <Button size="sm" variant="ghost" onClick={() => { if (val.trim()) { onRename(val.trim()); setEditing(false); } }}>Save</Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)} title="Rename">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDelete} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}