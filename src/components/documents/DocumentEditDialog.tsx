import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const categories = [
  ['general', 'General'],
  ['contracts', 'Contracts'],
  ['plans', 'Plans & Drawings'],
  ['photos', 'Photos'],
  ['reports', 'Reports'],
  ['permits', 'Permits & Licenses'],
  ['invoices', 'Invoices & Billing'],
  ['change-orders', 'Change Orders'],
  ['safety', 'Safety Documents'],
  ['forms', 'Forms & Templates'],
  ['specifications', 'Specifications'],
  ['correspondence', 'Correspondence'],
];

export interface DocumentEditValues {
  name: string;
  description: string;
  category: string;
  projectId: string | null;
  tags: string[];
}

interface EditableDocument {
  id: string;
  name: string;
  description?: string;
  category: string;
  projectId?: string;
  tags?: string[];
}

interface DocumentEditDialogProps {
  document: EditableDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: DocumentEditValues) => Promise<void>;
  projects: Array<{ id: string; name: string }>;
}

export function DocumentEditDialog({ document, open, onOpenChange, onSave, projects }: DocumentEditDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [projectId, setProjectId] = useState('no-project');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !document) return;
    setName(document.name);
    setDescription(document.description || '');
    setCategory(document.category || 'general');
    setProjectId(document.projectId || 'no-project');
    setTags((document.tags || []).join(', '));
  }, [document, open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        category,
        projectId: projectId === 'no-project' ? null : projectId,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit document details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-document-name">Document name</Label>
            <Input
              id="edit-document-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-document-description">Description</Label>
            <Textarea
              id="edit-document-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-label="Category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {!categories.some(([value]) => value === category) && (
                    <SelectItem value={category}>{category}</SelectItem>
                  )}
                  {categories.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger aria-label="Project">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-project">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-document-tags">Tags</Label>
            <Input
              id="edit-document-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="urgent, review, contract"
            />
            <p className="text-xs text-muted-foreground">Separate multiple tags with commas.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
