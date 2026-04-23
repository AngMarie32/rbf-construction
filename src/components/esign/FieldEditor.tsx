import { useRef, useState } from 'react';
import { PdfViewer } from './PdfViewer';
import type { EsignField, EsignSigner, FieldType } from '@/types/esign';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, PenLine, Type as TypeIcon, Calendar, CheckSquare, User, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  pdfUrl: string;
  fields: EsignField[];
  signers: EsignSigner[];
  onAddField: (field: Omit<EsignField, 'id' | 'envelope_id' | 'created_at' | 'value' | 'filled_at'>) => void;
  onDeleteField: (id: string) => void;
  onUpdateField: (id: string, updates: Partial<EsignField>) => void;
}

const FIELD_TYPES: { type: FieldType; label: string; icon: any; color: string }[] = [
  { type: 'signature', label: 'Signature', icon: PenLine, color: 'bg-blue-500' },
  { type: 'initial', label: 'Initial', icon: Hash, color: 'bg-indigo-500' },
  { type: 'date', label: 'Date', icon: Calendar, color: 'bg-emerald-500' },
  { type: 'text', label: 'Text', icon: TypeIcon, color: 'bg-amber-500' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, color: 'bg-rose-500' },
  { type: 'name', label: 'Name', icon: User, color: 'bg-violet-500' },
];

const SIGNER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function FieldEditor({ pdfUrl, fields, signers, onAddField, onDeleteField, onUpdateField }: Props) {
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [pageDims, setPageDims] = useState({ width: 0, height: 0 });
  const [selectedSigner, setSelectedSigner] = useState<string>(signers[0]?.id || '');
  const [selectedType, setSelectedType] = useState<FieldType>('signature');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedSigner || !pageDims.width) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddField({
      signer_id: selectedSigner,
      field_type: selectedType,
      page_number: page,
      x_pct: Math.max(0, Math.min(95, x - 10)),
      y_pct: Math.max(0, Math.min(95, y - 2.5)),
      width_pct: selectedType === 'checkbox' ? 4 : 20,
      height_pct: selectedType === 'checkbox' ? 4 : 5,
      required: true,
    });
  };

  const signerColor = (id: string | null) => {
    const idx = signers.findIndex(s => s.id === id);
    return SIGNER_COLORS[idx % SIGNER_COLORS.length] || '#3b82f6';
  };

  const pageFields = fields.filter(f => f.page_number === page);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Toolbar */}
      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Signer</h3>
          <div className="space-y-2">
            {signers.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setSelectedSigner(s.id)}
                className={cn(
                  'w-full text-left p-2 rounded-lg border-2 transition-colors flex items-center gap-2',
                  selectedSigner === s.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                )}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: SIGNER_COLORS[idx % SIGNER_COLORS.length] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                </div>
              </button>
            ))}
            {signers.length === 0 && (
              <p className="text-xs text-muted-foreground">Add signers to assign fields.</p>
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Field Type</h3>
          <div className="grid grid-cols-2 gap-2">
            {FIELD_TYPES.map(ft => {
              const Icon = ft.icon;
              return (
                <button
                  key={ft.type}
                  onClick={() => setSelectedType(ft.type)}
                  className={cn(
                    'p-2 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 text-xs',
                    selectedType === ft.type ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {ft.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Click on the document to place a field.</p>
        </Card>
      </div>

      {/* PDF + fields overlay */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <span className="text-sm">Page {page} of {numPages}</span>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page >= numPages}>Next</Button>
          </div>
          <span className="text-xs text-muted-foreground">{pageFields.length} field(s) on this page</span>
        </div>

        <div
          ref={containerRef}
          className="relative inline-block border rounded-lg overflow-hidden shadow-sm bg-white cursor-crosshair w-full"
          onClick={handleClick}
        >
          <PdfViewer
            url={pdfUrl}
            pageNumber={page}
            onLoad={(n, d) => { setNumPages(n); setPageDims(d); }}
            className="w-full h-auto block"
          />
          {pageFields.map(f => (
            <div
              key={f.id}
              className="absolute border-2 rounded flex items-center justify-center text-xs font-medium group"
              style={{
                left: `${f.x_pct}%`,
                top: `${f.y_pct}%`,
                width: `${f.width_pct}%`,
                height: `${f.height_pct}%`,
                borderColor: signerColor(f.signer_id),
                background: `${signerColor(f.signer_id)}22`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="capitalize" style={{ color: signerColor(f.signer_id) }}>{f.field_type}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteField(f.id); }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}