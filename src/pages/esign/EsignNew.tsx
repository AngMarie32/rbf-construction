import { Layout } from '@/components/layout/Layout';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateEnvelope, useUploadEnvelopePdf } from '@/hooks/useEsign';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function EsignNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [title, setTitle] = useState(params.get('title') || '');
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState<'parallel' | 'sequential'>('parallel');
  const [file, setFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState<string>(params.get('projectId') || 'none');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const create = useCreateEnvelope();
  const upload = useUploadEnvelopePdf();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('projects').select('id, name').order('name');
      setProjects(data || []);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('Title required');
    if (!file) return toast.error('Upload a PDF');
    try {
      const env = await create.mutateAsync({
        title, message, signing_order: order,
        source_type: params.get('source') || undefined,
        source_id: params.get('sourceId') || undefined,
        project_id: projectId && projectId !== 'none' ? projectId : undefined,
      });
      await upload.mutateAsync({ envelopeId: env.id, file });
      toast.success('Document created');
      navigate(`/esign/documents/${env.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  return (
    <Layout title="New Document" subtitle="Upload a PDF and prepare it for signing">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="p-6 space-y-4">
          <div>
            <Label>Document Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Construction Contract – 123 Main St" />
          </div>
          <div>
            <Label>Message to Signers (optional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please review and sign at your earliest convenience." />
          </div>
          <div>
            <Label>Signing Order</Label>
            <Select value={order} onValueChange={(v: any) => setOrder(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="parallel">Parallel (anyone can sign first)</SelectItem>
                <SelectItem value="sequential">Sequential (in order)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tie to Project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>PDF Document *</Label>
            <label className="block mt-2 border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">Click to upload PDF</p>
                  <p className="text-xs text-muted-foreground">or drag and drop</p>
                </div>
              )}
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate('/esign')}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={create.isPending || upload.isPending} className="flex-1">
              {create.isPending || upload.isPending ? 'Creating…' : 'Create & Continue'}
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}