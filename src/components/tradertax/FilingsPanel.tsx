import { useMemo, useState } from 'react';
import { tth } from '@/integrations/supabase/tradertax';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { FilingStatusCode, TthEngagement, TthFiling } from '@/types/tradertax';
import { filingStatusTone, shortDate } from '@/utils/traderTax/labels';
import { daysUntil } from '@/utils/traderTax/taxYearConfig';

interface FilingsPanelProps {
  engagement: TthEngagement;
  filings: TthFiling[];
  onRefresh: () => Promise<void> | void;
}

const STATUSES: FilingStatusCode[] = [
  'not_started',
  'in_progress',
  'ready_for_review',
  'client_review',
  'efiled',
  'accepted',
  'rejected',
  'paper_filed',
  'n_a',
];

export function FilingsPanel({ engagement, filings, onRefresh }: FilingsPanelProps) {
  const [scope, setScope] = useState<string>('all');

  const rows = useMemo(() => {
    const filtered = scope === 'all' ? filings : filings.filter((f) => f.entity_scope === scope);
    return [...filtered].sort((a, b) => {
      const ad = a.due_date ?? '9999';
      const bd = b.due_date ?? '9999';
      return ad.localeCompare(bd) || a.form_code.localeCompare(b.form_code);
    });
  }, [filings, scope]);

  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await tth.from('tth_filings').update(patch).eq('id', id);
    if (error) {
      toast.error('Could not update', { description: error.message });
      return;
    }
    await onRefresh();
  };

  const remove = async (id: string) => {
    const { error } = await tth.from('tth_filings').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete', { description: error.message });
      return;
    }
    await onRefresh();
  };

  const openCount = filings.filter((f) => !['accepted', 'efiled', 'paper_filed', 'n_a'].includes(f.status))
    .length;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h3 className="font-semibold">Filing checklist — {engagement.tax_year}</h3>
          <p className="text-sm text-muted-foreground">
            {openCount} open of {filings.length}
          </p>
        </div>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="entity">Entity</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {filings.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-medium">No filings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build the checklist from the Analysis tab — it derives the forms from the client’s facts and
            positions.
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Extended</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confirmation</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((f) => {
                const days = f.due_date ? daysUntil(f.due_date) : null;
                const overdue =
                  days !== null &&
                  days < 0 &&
                  !['accepted', 'efiled', 'paper_filed', 'n_a'].includes(f.status);
                return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div className="font-medium">{f.form_code}</div>
                      <div className="text-xs text-muted-foreground">{f.form_name}</div>
                      {f.notes && (
                        <div className="mt-1 max-w-md text-xs text-muted-foreground">{f.notes}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{f.jurisdiction}</TableCell>
                    <TableCell className="text-sm">
                      <span className={overdue ? 'font-medium text-destructive' : ''}>
                        {shortDate(f.due_date)}
                      </span>
                      {days !== null && !overdue && (
                        <div className="text-xs text-muted-foreground">{days} days</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{shortDate(f.extended_due_date)}</TableCell>
                    <TableCell>
                      <Select value={f.status} onValueChange={(v) => update(f.id, { status: v })}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant={filingStatusTone(f.status)} className="mt-1 text-[10px]">
                        {f.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-40"
                        defaultValue={f.confirmation_number ?? ''}
                        placeholder="DCN / ack"
                        onBlur={(e) =>
                          e.target.value !== (f.confirmation_number ?? '') &&
                          update(f.id, {
                            confirmation_number: e.target.value || null,
                            filed_at: e.target.value ? new Date().toISOString() : null,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove(f.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
