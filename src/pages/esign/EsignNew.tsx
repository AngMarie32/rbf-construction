import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { Layout } from '@/components/layout/Layout';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateEnvelope, useUploadEnvelopePdf, useDocumentTypes } from '@/hooks/useEsign';
import { Upload, FileText, ArrowLeft, Loader2, X } from 'lucide-react';
import { PageHero, heroButton } from '@/components/ui/page-hero';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function EsignNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const templateId = params.get('template');
  const [title, setTitle] = useState(params.get('title') || '');
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState<'parallel' | 'sequential'>('parallel');
  const [file, setFile] = useState<File | null>(null);
  const [template, setTemplate] = useState<any | null>(null);
  const [projectId, setProjectId] = useState<string>(params.get('projectId') || 'none');
  const [docType, setDocType] = useState<string>(
    params.get('documentType') || (() => {
      const src = params.get('source');
      if (src === 'change_order') return 'Change Order';
      if (src === 'proposal') return 'Proposal';
      if (src === 'subcontractor') return 'Subcontract';
      if (src === 'invoice') return 'Payment Application';
      return 'none';
    })(),
  );
  const [company, setCompany] = useState<string>(params.get('company') || '');
  const [paymentAppNumber, setPaymentAppNumber] = useState<string>(params.get('paymentAppNumber') || '');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  const create = useCreateEnvelope();
  const upload = useUploadEnvelopePdf();
  const { data: docTypes = [] } = useDocumentTypes();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('projects').select('id, name, status').is('archived_at', null).order('name');
      setProjects(sortProjectsOpenFirst(data || []));
    })();
  }, []);

  // Load template (if any) so the uploaded/marked-up PDF and fields are reused.
  useEffect(() => {
    if (!templateId) return;
    (async () => {
      const { data, error } = await supabase
        .from('esign_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      if (error || !data) {
        toast.error('Template not found');
        return;
      }
      setTemplate(data);
      if (!title && data.name) setTitle(data.name);
      if (data.document_type && (!docType || docType === 'none')) setDocType(data.document_type);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const pickFile = (f: File | null | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
      toast.error('Only PDF files can be sent for signature');
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast.error('That PDF is over 25 MB. Compress it and try again.');
      return;
    }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('Title required');
    if (!file && !template?.source_pdf_path) return toast.error('Upload a PDF');
    try {
      const env = await create.mutateAsync({
        title, message, signing_order: order,
        source_type: params.get('source') || undefined,
        source_id: params.get('sourceId') || undefined,
        project_id: projectId && projectId !== 'none' ? projectId : undefined,
        document_type: docType && docType !== 'none' ? docType : undefined,
        company: company.trim() || undefined,
        payment_app_number: paymentAppNumber.trim() || undefined,
      });
      if (file) {
        // User explicitly uploaded a new file — overrides any template PDF.
        await upload.mutateAsync({ envelopeId: env.id, file });
      } else if (template?.source_pdf_path) {
        // Reuse the template's stored PDF (the marked-up file).
        const { data: blob, error: dlErr } = await supabase.storage
          .from('esign-documents')
          .download(template.source_pdf_path);
        if (dlErr) throw dlErr;
        const tplFile = new File([blob], `${template.name || 'template'}.pdf`, { type: 'application/pdf' });
        await upload.mutateAsync({ envelopeId: env.id, file: tplFile });
        // Copy default fields from the template (unassigned to signers).
        const defaults = Array.isArray(template.default_fields) ? template.default_fields : [];
        if (defaults.length) {
          const rows = defaults.map((f: any) => ({
            envelope_id: env.id,
            field_type: f.field_type,
            page_number: f.page_number ?? 1,
            x_pct: f.x_pct,
            y_pct: f.y_pct,
            width_pct: f.width_pct ?? 20,
            height_pct: f.height_pct ?? 5,
            required: f.required ?? true,
          }));
          await supabase.from('esign_fields').insert(rows);
        }
      }
      toast.success('Document created');
      navigate(`/esign/documents/${env.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  const busy = create.isPending || upload.isPending;
  const hasPdf = !!file || !!template?.source_pdf_path;
  const steps = [
    { n: 1, label: 'Upload & details', active: true },
    { n: 2, label: 'Add signers & fields', active: false },
    { n: 3, label: 'Send', active: false },
  ];

  return (
    <Layout hideTitle title="New Document">
      <div className="space-y-6">
        <PageHero
          eyebrow="E-Sign"
          title="Send a document for signature"
          subtitle={template ? `Starting from the "${template.name}" template.` : 'Upload a PDF, add who signs it, place the signature fields, then send.'}
          actions={
            <button type="button" className={heroButton} onClick={() => navigate('/esign/documents')}>
              <ArrowLeft className="h-4 w-4" /> All documents
            </button>
          }
        />

        <ol className="mx-auto flex max-w-3xl items-center gap-2 text-sm">
          {steps.map((st, i) => (
            <li key={st.n} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  st.active ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                {st.n}
              </span>
              <span className={cn('truncate', st.active ? 'font-medium' : 'text-muted-foreground')}>{st.label}</span>
              {i < steps.length - 1 && <span className="hidden h-px flex-1 bg-border sm:block" />}
            </li>
          ))}
        </ol>

        <div className="mx-auto max-w-3xl space-y-4">
          <Card className="space-y-3 p-6">
            <div>
              <h2 className="font-semibold">The PDF</h2>
              <p className="text-sm text-muted-foreground">
                {template?.source_pdf_path && !file
                  ? `Using the marked-up PDF from "${template.name}". Drop a file here only to replace it.`
                  : 'The exact file people will sign.'}
              </p>
            </div>
            <label
              className={cn(
                'block cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition hover:bg-muted/50',
                dragging ? 'border-primary bg-primary/5' : 'border-border'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
            >
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="min-w-0 text-left">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1048576).toFixed(file.size > 1048576 ? 1 : 2)} MB · click to replace</p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove file"
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to choose a PDF, or drag it here</p>
                  <p className="text-xs text-muted-foreground">Up to 25 MB</p>
                </div>
              )}
            </label>
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="font-semibold">Details</h2>
            <div>
              <Label htmlFor="es-title">Document title *</Label>
              <Input id="es-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Subcontract – Smith Electric – Main St" />
            </div>
            <div>
              <Label htmlFor="es-msg">Message to signers</Label>
              <Textarea id="es-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Shown in the signing email. Optional." />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Document type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue placeholder="Untagged" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Untagged</SelectItem>
                    {docTypes.map((t) => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="es-co">Company</Label>
                <Input id="es-co" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="es-pa">Payment application #</Label>
                <Input id="es-pa" value={paymentAppNumber} onChange={(e) => setPaymentAppNumber(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div>
              <Label>Signing order</Label>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                {([
                  ['parallel', 'Everyone at once', 'All signers get the email together.'],
                  ['sequential', 'One after another', 'Each signer gets it after the previous one signs.'],
                ] as const).map(([v, label, hint]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setOrder(v)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition',
                      order === v ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'
                    )}
                  >
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => navigate('/esign')} disabled={busy}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={busy || !hasPdf || !title.trim()}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</> : 'Next: add signers & fields'}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
