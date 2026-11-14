import { BulkComplianceDialog } from '@/components/subcontractors/BulkComplianceDialog';
import { ShieldCheck } from 'lucide-react';

import React, { useState, useEffect, useCallback } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Edit, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, MapPin, Building, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditSubcontractorDialog } from '@/components/subcontractors/EditSubcontractorDialog';
import { AddSubcontractorDialog } from '@/components/subcontractors/AddSubcontractorDialog';
import { DocumentIssues } from '@/components/subcontractors/DocumentIssues';
import { SendForSignatureButton } from '@/components/esign/SendForSignatureButton';
import { SubcontractorScorecardDialog, StarRating, SCORE_CRITERIA, type Scorecard } from '@/components/subcontractors/SubcontractorScorecardDialog';
import { Star as StarIcon, ShieldAlert, FileWarning, Search, Wrench, List, LayoutGrid, X, Trash2 } from 'lucide-react';
import { PageHero, heroButton } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Subcontractor {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  specialties: string[] | null;
  status: string;
  rating: number | null;
  notes: string | null;
  w9_on_file: boolean;
  insurance_expiry: string | null;
  travel_radius: number | null;
  region: string | null;
  scorecard?: Scorecard | null;
}

type SortField = 'company' | 'name' | 'specialties' | 'region' | 'insurance_expiry' | 'w9_on_file';
type SortDirection = 'asc' | 'desc' | null;

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [filteredSubcontractors, setFilteredSubcontractors] = useState<Subcontractor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingSub, setRatingSub] = useState<Subcontractor | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [bulkCompliance, setBulkCompliance] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [showDocumentIssues, setShowDocumentIssues] = useState(false);
  const [loading, setLoading] = useState(true);
  const [minRating, setMinRating] = useState<'any' | '4' | '3' | 'unrated'>('any');
  const [compliance, setCompliance] = useState<'all' | 'compliant' | 'expired' | 'soon' | 'noins' | 'now9'>('all');
  const [confirmDelete, setConfirmDelete] = useState<Subcontractor | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const specialties = [
    'Concrete', 'Electrical', 'HVAC', 'Insulation', 'Landscaping', 'Masonry',
    'Painting', 'Plumbing', 'Roofing', 'Siding', 'Tile/Flooring', 'Windows/Doors'
  ].sort();

  // Get unique regions from subcontractors
  const regions = [...new Set(subcontractors.map(s => s.region).filter(Boolean))].sort() as string[];

  const fetchSubcontractors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      // Add region property with default value if not present in database
      const subsWithRegion = (data || []).map(sub => ({
        ...sub,
        region: (sub as any).region || null
      }));
      setSubcontractors(subsWithRegion as unknown as Subcontractor[]);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
      toast.error('Failed to load subcontractors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubcontractors();
  }, [fetchSubcontractors]);

  useEffect(() => {
    let filtered = [...subcontractors];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(search) ||
          s.company?.toLowerCase().includes(search) ||
          s.email?.toLowerCase().includes(search) ||
          s.phone?.toLowerCase().includes(search) ||
          s.region?.toLowerCase().includes(search) ||
          s.specialties?.some(sp => sp.toLowerCase().includes(search))
      );
    }

    // Status filter
    if (selectedStatus !== 'All') {
      filtered = filtered.filter((s) => s.status === selectedStatus);
    }

    // Specialties filter
    if (selectedSpecialties.length > 0) {
      filtered = filtered.filter(
        (s) => s.specialties && s.specialties.some((r) => selectedSpecialties.includes(r))
      );
    }

    // Region filter
    if (selectedRegion !== 'All') {
      filtered = filtered.filter((s) => s.region === selectedRegion);
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortField) {
          case 'company':
            aVal = a.company?.toLowerCase() || '';
            bVal = b.company?.toLowerCase() || '';
            break;
          case 'name':
            aVal = a.name?.toLowerCase() || '';
            bVal = b.name?.toLowerCase() || '';
            break;
          case 'specialties':
            aVal = a.specialties?.join(', ').toLowerCase() || '';
            bVal = b.specialties?.join(', ').toLowerCase() || '';
            break;
          case 'region':
            aVal = a.region?.toLowerCase() || '';
            bVal = b.region?.toLowerCase() || '';
            break;
          case 'insurance_expiry':
            aVal = a.insurance_expiry || '';
            bVal = b.insurance_expiry || '';
            break;
          case 'w9_on_file':
            aVal = a.w9_on_file ? 1 : 0;
            bVal = b.w9_on_file ? 1 : 0;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredSubcontractors(filtered);
  }, [subcontractors, searchTerm, selectedStatus, selectedSpecialties, selectedRegion, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4 ml-1" />;
    }
    return <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const deleteSubcontractor = async (id: string) => {

    try {
      const { error } = await supabase
        .from('subcontractors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Subcontractor deleted successfully');
      fetchSubcontractors();
    } catch (error) {
      console.error('Error deleting subcontractor:', error);
      toast.error('Failed to delete subcontractor');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('All');
    setSelectedSpecialties([]);
    setSelectedRegion('All');
    setMinRating('any');
    setCompliance('all');
    setSortField(null);
    setSortDirection(null);
  };

  const hasActiveFilters =
    searchTerm || selectedStatus !== 'All' || selectedSpecialties.length > 0 || selectedRegion !== 'All' || minRating !== 'any' || compliance !== 'all';

  if (showDocumentIssues) {
    return (
      <Layout title="Document Issues" subtitle="Subcontractor insurance and W-9 compliance">
        <DocumentIssues onBack={() => setShowDocumentIssues(false)} />
      </Layout>
    );
  }


  const insuranceState = (d: string | null) => {
    if (!d) return null;
    const days = Math.ceil((new Date(`${d.slice(0, 10)}T00:00:00`).getTime() - Date.now()) / 86400000);
    return days < 0 ? 'expired' : days <= 30 ? 'soon' : 'ok';
  };

  // Rank = position by overall rating among rated subs (1 = best). Unrated subs have no rank.
  const rankById: Record<string, number> = {};
  [...subcontractors]
    .filter((x) => x.rating != null && x.rating > 0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .forEach((x, i, arr) => {
      // ties share a rank
      rankById[x.id] = i > 0 && arr[i - 1].rating === x.rating ? rankById[arr[i - 1].id] : i + 1;
    });

  const insOf = (x: Subcontractor) => insuranceState(x.insurance_expiry);
  const rows = filteredSubcontractors.filter((x) => {
    const r = Number(x.rating) || 0;
    if (minRating === 'unrated' && r) return false;
    if ((minRating === '4' && r < 4) || (minRating === '3' && r < 3)) return false;
    if (compliance === 'compliant' && !(insOf(x) && insOf(x) !== 'expired' && x.w9_on_file)) return false;
    if (compliance === 'expired' && insOf(x) !== 'expired') return false;
    if (compliance === 'soon' && insOf(x) !== 'soon') return false;
    if (compliance === 'noins' && insOf(x)) return false;
    if (compliance === 'now9' && x.w9_on_file) return false;
    return true;
  });
  const stats = {
    active: subcontractors.filter((x) => x.status === 'Active').length,
    rated: subcontractors.filter((x) => x.rating).length,
    avg: (() => {
      const r = subcontractors.filter((x) => x.rating);
      return r.length ? r.reduce((a, x) => a + Number(x.rating), 0) / r.length : null;
    })(),
    insIssues: subcontractors.filter((x) => insOf(x) !== 'ok').length,
    expired: subcontractors.filter((x) => insOf(x) === 'expired').length,
    noW9: subcontractors.filter((x) => !x.w9_on_file).length,
  };
  const chips: { label: string; clear: () => void }[] = [
    ...(selectedStatus !== 'All' ? [{ label: `Status: ${selectedStatus}`, clear: () => setSelectedStatus('All') }] : []),
    ...(selectedRegion !== 'All' ? [{ label: `Region: ${selectedRegion}`, clear: () => setSelectedRegion('All') }] : []),
    ...selectedSpecialties.map((t) => ({ label: t, clear: () => setSelectedSpecialties((l) => l.filter((x) => x !== t)) })),
    ...(minRating !== 'any' ? [{ label: minRating === 'unrated' ? 'Not rated yet' : `${minRating}+ stars`, clear: () => setMinRating('any') }] : []),
    ...(compliance !== 'all'
      ? [
          {
            label: { compliant: 'Compliant', expired: 'Insurance expired', soon: 'Insurance expiring ≤ 30 days', noins: 'No insurance on file', now9: 'Missing W-9' }[compliance],
            clear: () => setCompliance('all'),
          },
        ]
      : []),
  ];

  const subColumns: DataTableColumn<Subcontractor>[] = [
    {
      id: 'rank',
      header: 'Rank',
      value: (r) => r.rating ?? null,
      cell: (r) => (
        <div className="flex items-center gap-3 whitespace-nowrap">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              rankById[r.id] === 1 ? 'bg-amber-400 text-amber-950' : rankById[r.id] === 2 ? 'bg-slate-300 text-slate-900' : rankById[r.id] === 3 ? 'bg-orange-300 text-orange-950' : 'bg-muted text-muted-foreground'
            }`}
            title={rankById[r.id] ? `Ranked #${rankById[r.id]}` : 'Not rated yet'}
          >
            {rankById[r.id] ? `#${rankById[r.id]}` : '—'}
          </span>
          <button type="button" onClick={() => setRatingSub(r)} className="group text-left" title="Rate this subcontractor">
            <StarRating value={r.rating} />
            <span className="block text-xs text-muted-foreground group-hover:text-primary">
              {r.rating ? `${Number(r.rating).toFixed(1)} · Re-rate` : 'Rate'}
            </span>
          </button>
        </div>
      ),
    },
    {
      id: 'company',
      header: 'Company',
      value: (r) => r.company || r.name,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {(r.company || r.name || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium truncate">{r.company || r.name}</div>
            {r.email && <div className="text-xs text-muted-foreground truncate">{r.email}</div>}
          </div>
        </div>
      ),
    },
    { id: 'contact', header: 'Contact', value: (r) => r.name, cell: (r) => (
      <div>
        <div>{r.name || '—'}</div>
        {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
      </div>
    ) },
    { id: 'specialties', header: 'Trades', value: (r) => (r.specialties || []).join(', '), cell: (r) => (
      <div className="flex max-w-[260px] flex-wrap gap-1">
        {(r.specialties || []).slice(0, 3).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
        {(r.specialties || []).length > 3 && <Badge variant="outline">+{(r.specialties || []).length - 3}</Badge>}
        {!(r.specialties || []).length && <span className="text-muted-foreground">—</span>}
      </div>
    ) },
    { id: 'region', header: 'Region', value: (r) => r.region, cell: (r) => r.region || '—' },
    {
      id: 'insurance',
      header: 'Insurance',
      value: (r) => r.insurance_expiry,
      cell: (r) => {
        const st = insuranceState(r.insurance_expiry);
        if (!st) return <Badge variant="warning">Missing</Badge>;
        const label = format(new Date(`${(r.insurance_expiry as string).slice(0, 10)}T00:00:00`), 'MMM d, yyyy');
        return st === 'expired' ? <Badge variant="destructive">Expired {label}</Badge>
          : st === 'soon' ? <Badge variant="warning">Expires {label}</Badge>
          : <span className="text-sm">{label}</span>;
      },
    },
    { id: 'w9', header: 'W-9', align: 'center', value: (r) => (r.w9_on_file ? 'Yes' : 'No'), cell: (r) => (
      r.w9_on_file ? <Badge variant="success">On file</Badge> : <Badge variant="warning">Missing</Badge>
    ) },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditingSubcontractor(r)} aria-label="Edit">
            <Edit className="w-4 h-4" />
          </Button>
          <SendForSignatureButton
            source="subcontractor"
            sourceId={r.id}
            title={`Subcontractor Agreement – ${r.company || r.name}`}
            company={r.company || r.name}
            documentType="Subcontract"
            variant="ghost"
            size="sm"
            iconOnly
          />
          <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(r)} className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Delete">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout hideTitle title="Subcontractors">
      <div className="space-y-6">
        <PageHero
          eyebrow="Project management"
          title="Subcontractors"
          subtitle="Your sub network: trades, ratings, insurance and W-9s in one place."
          actions={
            <>
              <AddSubcontractorDialog onSubcontractorCreated={fetchSubcontractors} />
              <button type="button" className={heroButton} onClick={() => setShowDocumentIssues(true)}>
                <ShieldAlert className="h-4 w-4" /> Document issues
              </button>
              <button type="button" className={heroButton} onClick={() => setBulkCompliance(true)}>
                <ShieldCheck className="h-4 w-4" /> Update W-9s / COIs
              </button>
            </>
          }
          stats={[
            { label: 'Active subs', value: loading ? '…' : String(stats.active) },
            { label: 'Average rating', value: loading ? '…' : stats.avg == null ? '—' : `${stats.avg.toFixed(1)} ★` },
          ]}
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <button type="button" className="rounded-xl text-left" onClick={() => setMinRating(minRating === 'unrated' ? 'any' : 'unrated')}>
            <AccentStat label="Subcontractors" value={subcontractors.length} icon={Users} accent="blue" loading={loading} hint={`${subcontractors.length - stats.rated} not rated yet`} />
          </button>
          <button type="button" className="rounded-xl text-left" onClick={() => setMinRating(minRating === '4' ? 'any' : '4')}>
            <AccentStat label="Rated 4★ and up" value={subcontractors.filter((x) => Number(x.rating) >= 4).length} icon={StarIcon} accent="amber" loading={loading} hint="Click to filter" />
          </button>
          <button type="button" className="rounded-xl text-left" onClick={() => setCompliance(compliance === 'expired' ? 'all' : 'expired')}>
            <AccentStat
              label="Insurance issues"
              value={stats.insIssues}
              icon={ShieldAlert}
              accent="rose"
              tone={stats.expired ? 'bad' : stats.insIssues ? 'warn' : undefined}
              loading={loading}
              hint={`${stats.expired} expired · rest expiring or missing`}
            />
          </button>
          <button type="button" className="rounded-xl text-left" onClick={() => setCompliance(compliance === 'now9' ? 'all' : 'now9')}>
            <AccentStat label="Missing W-9" value={stats.noW9} icon={FileWarning} accent="orange" tone={stats.noW9 ? 'warn' : undefined} loading={loading} hint="Needed before you pay them" />
          </button>
        </div>

        {/* Filters */}
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder="Search name, company, trade, phone…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Wrench className="h-4 w-4" /> Trades {selectedSpecialties.length > 0 && <Badge variant="secondary">{selectedSpecialties.length}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="max-h-72 space-y-0.5 overflow-y-auto">
                  {specialties.map((specialty) => {
                    const n = subcontractors.filter((x) => x.specialties?.includes(specialty)).length;
                    const on = selectedSpecialties.includes(specialty);
                    return (
                      <label key={specialty} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                        <Checkbox
                          checked={on}
                          onCheckedChange={(c) => setSelectedSpecialties(c ? [...selectedSpecialties, specialty] : selectedSpecialties.filter((x) => x !== specialty))}
                        />
                        <span className="flex-1">{specialty}</span>
                        <span className="text-xs text-muted-foreground">{n}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedSpecialties.length > 0 && (
                  <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setSelectedSpecialties([])}>
                    Clear trades
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            <Select value={minRating} onValueChange={(v) => setMinRating(v as typeof minRating)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any rating</SelectItem>
                <SelectItem value="4">4★ and up</SelectItem>
                <SelectItem value="3">3★ and up</SelectItem>
                <SelectItem value="unrated">Not rated yet</SelectItem>
              </SelectContent>
            </Select>

            <Select value={compliance} onValueChange={(v) => setCompliance(v as typeof compliance)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any compliance</SelectItem>
                <SelectItem value="compliant">Compliant (insured + W-9)</SelectItem>
                <SelectItem value="expired">Insurance expired</SelectItem>
                <SelectItem value="soon">Insurance expiring ≤ 30 days</SelectItem>
                <SelectItem value="noins">No insurance on file</SelectItem>
                <SelectItem value="now9">Missing W-9</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            {regions.length > 0 && (
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All regions</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="ml-auto flex rounded-lg bg-muted p-1">
              <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7" onClick={() => setViewMode('list')} aria-label="List view">
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-7" onClick={() => setViewMode('grid')} aria-label="Card view">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {(chips.length > 0 || searchTerm) && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {rows.length} of {subcontractors.length} shown
              </span>
              {chips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={c.clear}
                  className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-700 hover:bg-orange-500/20 dark:text-orange-300"
                >
                  {c.label} <X className="h-3 w-3" />
                </button>
              ))}
              <button type="button" className="text-xs text-muted-foreground underline hover:text-foreground" onClick={clearFilters}>
                Clear all
              </button>
            </div>
          )}
        </Card>

        {/* Subcontractors Content */}
        {viewMode === 'list' ? (
          <DataTable
            columns={subColumns}
            rows={rows}
            totalCount={subcontractors.length}
            getRowId={(r) => r.id}
            searchable={false}
            exportFilename="subcontractors"
            initialSort={{ id: 'rank', desc: true }}
            empty={
              <EmptyState
                icon={Users}
                title="Add your first subcontractor"
                description="Keep every sub's trade, contact info, insurance and rates in one place so you can invite them to bid and track their work on each job."
                actionSlot={<AddSubcontractorDialog onSubcontractorCreated={fetchSubcontractors} />}
              />
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((subcontractor) => (
              <Card key={subcontractor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center">
                    <Avatar className="mr-4">
                      <AvatarFallback>{subcontractor.company?.charAt(0).toUpperCase() || subcontractor.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold">{subcontractor.company || 'No Company'}</CardTitle>
                      {subcontractor.name && <div className="text-sm text-muted-foreground">Contact: {subcontractor.name}</div>}
                      {subcontractor.region && <Badge variant="outline">{subcontractor.region}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span>{subcontractor.specialties ? subcontractor.specialties.join(', ') : 'N/A'}</span>
                  </div>
                  {(subcontractor.address || subcontractor.city || subcontractor.state) && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{[subcontractor.address, subcontractor.city, subcontractor.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {subcontractor.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${subcontractor.email}`}>{subcontractor.email}</a>
                    </div>
                  )}
                  {subcontractor.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{subcontractor.phone}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end p-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingSubcontractor(subcontractor)}
                  >
                    View & Edit
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
{filteredSubcontractors.length === 0 && (
              <div className="col-span-full p-4">
                <EmptyState
                  icon={Users}
                  filtered={subcontractors.length > 0}
                  title="Add your first subcontractor"
                  description="Keep every sub's trade, contact info, insurance and rates in one place so you can invite them to bid and track their work on each job."
                  actionSlot={<AddSubcontractorDialog onSubcontractorCreated={fetchSubcontractors} />}
                />
              </div>
            )}
          </div>
        )}

        {/* Edit Dialog */}
        {editingSubcontractor && (
          <EditSubcontractorDialog
            subcontractor={editingSubcontractor}
            open={!!editingSubcontractor}
            onOpenChange={(open) => !open && setEditingSubcontractor(null)}
            onSubcontractorUpdated={fetchSubcontractors}
          />
        )}
      </div>
      <SubcontractorScorecardDialog sub={ratingSub} onOpenChange={(o) => !o && setRatingSub(null)} onSaved={fetchSubcontractors} />
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.company || confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Their contact info, rating and documents will be removed. To keep the history, set their status to Inactive instead.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) deleteSubcontractor(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BulkComplianceDialog
        open={bulkCompliance}
        onOpenChange={setBulkCompliance}
        subcontractors={subcontractors}
        onSaved={fetchSubcontractors}
      />
    </Layout>
  );
}
