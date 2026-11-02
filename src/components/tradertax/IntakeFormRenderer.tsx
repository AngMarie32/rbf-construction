import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { IntakeAnswers, IntakeField, IntakeSection } from '@/types/tradertax';
import { INTAKE_SECTIONS, intakeCompletion, isFieldVisible } from '@/utils/traderTax/intakeSchema';

interface IntakeFormRendererProps {
  answers: IntakeAnswers;
  onChange: (key: string, value: IntakeAnswers[string]) => void;
  readOnly?: boolean;
  sections?: IntakeSection[];
  /** Highlight fields the analysis engine depends on. */
  showAnalysisMarkers?: boolean;
}

export function IntakeFormRenderer({
  answers,
  onChange,
  readOnly = false,
  sections = INTAKE_SECTIONS,
  showAnalysisMarkers = false,
}: IntakeFormRendererProps) {
  const completion = useMemo(() => intakeCompletion(answers), [answers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Progress value={completion} className="h-2 flex-1" />
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          {completion.toFixed(0)}% complete
        </span>
      </div>

      {sections.map((section) => {
        const visibleFields = section.fields.filter((f) => isFieldVisible(f, answers));
        if (visibleFields.length === 0) return null;

        return (
          <Card key={section.id} className="p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold">{section.title}</h3>
              {section.description && (
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {visibleFields.map((field) => (
                <FieldControl
                  key={field.key}
                  field={field}
                  value={answers[field.key] ?? null}
                  onChange={(v) => onChange(field.key, v)}
                  readOnly={readOnly}
                  showAnalysisMarker={showAnalysisMarkers}
                />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

interface FieldControlProps {
  field: IntakeField;
  value: IntakeAnswers[string];
  onChange: (value: IntakeAnswers[string]) => void;
  readOnly: boolean;
  showAnalysisMarker: boolean;
}

function FieldControl({ field, value, onChange, readOnly, showAnalysisMarker }: FieldControlProps) {
  const fullWidth = field.type === 'textarea' || field.type === 'multiselect';

  return (
    <div className={cn('space-y-2', fullWidth && 'md:col-span-2')}>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={field.key} className="text-sm">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        {showAnalysisMarker && field.drivesAnalysis && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
            drives analysis
          </Badge>
        )}
      </div>

      {renderControl(field, value, onChange, readOnly)}

      {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
    </div>
  );
}

function renderControl(
  field: IntakeField,
  value: IntakeAnswers[string],
  onChange: (value: IntakeAnswers[string]) => void,
  readOnly: boolean
) {
  switch (field.type) {
    case 'boolean':
      return (
        <div className="flex h-10 items-center gap-3">
          <Switch
            id={field.key}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked)}
            disabled={readOnly}
          />
          <span className="text-sm text-muted-foreground">{value === true ? 'Yes' : 'No'}</span>
        </div>
      );

    case 'textarea':
      return (
        <Textarea
          id={field.key}
          rows={4}
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      );

    case 'select':
      return (
        <Select
          value={(value as string) ?? ''}
          onValueChange={(v) => onChange(v)}
          disabled={readOnly}
        >
          <SelectTrigger id={field.key}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(field.options ?? []).map((o) => {
            const checked = selected.includes(o.value);
            return (
              <label
                key={o.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                  checked ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/50',
                  readOnly && 'cursor-not-allowed opacity-70'
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={readOnly}
                  onCheckedChange={(next) =>
                    onChange(
                      next
                        ? [...selected, o.value]
                        : selected.filter((s) => s !== o.value)
                    )
                  }
                />
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case 'currency':
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id={field.key}
            type="number"
            step="0.01"
            className="pl-6"
            value={value === null || value === undefined ? '' : String(value)}
            placeholder={field.placeholder ?? '0'}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            disabled={readOnly}
          />
        </div>
      );

    case 'number':
    case 'percent':
      return (
        <Input
          id={field.key}
          type="number"
          step={field.type === 'percent' ? '0.1' : '1'}
          value={value === null || value === undefined ? '' : String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          disabled={readOnly}
        />
      );

    case 'date':
      return (
        <Input
          id={field.key}
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      );

    default:
      return (
        <Input
          id={field.key}
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      );
  }
}
