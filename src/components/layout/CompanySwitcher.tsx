import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useCompanies } from '@/contexts/CompanyContext';
import { Building2, ChevronDown } from 'lucide-react';

export function CompanySwitcher() {
  const { companies, groups, selectedIds, toggleCompany, selectAll, selectGroup, loading } = useCompanies();

  if (loading || companies.length === 0) return null;

  const label =
    selectedIds.length === companies.length
      ? 'All companies'
      : selectedIds.length === 1
      ? companies.find((c) => c.id === selectedIds[0])?.name ?? '1 company'
      : `${selectedIds.length} companies`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[240px]">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Companies</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={selectAll}>
            Select all
          </Button>
        </div>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {groups.map((g) => (
              <Badge
                key={g.id}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => selectGroup(g.id)}
              >
                {g.name}
              </Badge>
            ))}
          </div>
        )}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {companies.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
              <Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={() => toggleCompany(c.id)} />
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-[10px] uppercase text-muted-foreground">{c.type}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}