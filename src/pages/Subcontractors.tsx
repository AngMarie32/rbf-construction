
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
import { Trophy, Star as StarIcon } from 'lucide-react';

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
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [showDocumentIssues, setShowDocumentIssues] = useState(false);
  const [loading, setLoading] = useState(true);
  
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
      setSubcontractors(subsWithRegion);
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
    if (!confirm('Are you sure you want to delete this subcontractor?')) {
      return;
    }

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
    setSortField(null);
    setSortDirection(null);
  };

  const hasActiveFilters = searchTerm || selectedStatus !== 'All' || selectedSpecialties.length > 0 || selectedRegion !== 'All';

  if (showDocumentIssues) {
    return (
      <Layout title="Document Issues" subtitle="Manage subcontractor document compliance">
        <DocumentIssues onBack={() => setShowDocumentIssues(false)} />
      </Layout>
    );
  }


  const insuranceState = (d: string | null) => {
    if (!d) return null;
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
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

  const topByTrade = (() => {
    const groups: Record<string, Subcontractor[]> = {};
    subcontractors.forEach((x) => {
      if (!x.rating) return;
      (x.specialties?.length ? x.specialties : ['General']).forEach((t) => (groups[t] ||= []).push(x));
    });
    return Object.entries(groups)
      .map(([trade, list]) => ({ trade, list: list.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3) }))
      .sort((a, b) => (b.list[0]?.rating || 0) - (a.list[0]?.rating || 0));
  })();

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
        const label = format(new Date(r.insurance_expiry as string), 'MMM d, yyyy');
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
          <Button size="sm" variant="ghost" onClick={() => deleteSubcontractor(r.id)} className="text-destructive hover:text-destructive">
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout title="Subcontractors" subtitle="Your sub network, ranked by how they perform on your jobs">
      <div className="space-y-6">
        {topByTrade.length > 0 ? (
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h2 className="font-semibold">Top subs by trade</h2>
              <span className="text-xs text-muted-foreground">Based on your ratings</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {topByTrade.slice(0, 8).map(({ trade, list }) => (
                <div key={trade} className="rounded-xl border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{trade}</p>
                  <ol className="space-y-1.5">
                    {list.map((x, i) => (
                      <li key={x.id} className="flex items-center justify-between gap-2 text-sm">
                        <button type="button" onClick={() => setRatingSub(x)} className="flex min-w-0 items-center gap-2 text-left hover:text-primary">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? 'bg-amber-400 text-amber-950' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                          <span className="truncate">{x.company || x.name}</span>
                        </button>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums">
                          <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {Number(x.rating).toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Card>
        ) : subcontractors.length > 0 ? (
          <Card className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span className="flex-1">
              <strong>Rank your subs.</strong> Click <em>Rate</em> next to a subcontractor to score them on {SCORE_CRITERIA.map((c) => c.label.toLowerCase()).join(', ')}. The best rise to the top.
            </span>
          </Card>
        ) : null}

        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="search"
              placeholder="Search subcontractors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <AddSubcontractorDialog onSubcontractorCreated={fetchSubcontractors} />
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Regions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Specialties {selectedSpecialties.length > 0 && `(${selectedSpecialties.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <div className="space-y-1">
                  <div className="font-medium text-sm mb-2">Filter Specialties</div>
                  {specialties.map((specialty) => (
                    <div
                      key={specialty}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => {
                        if (selectedSpecialties.includes(specialty)) {
                          setSelectedSpecialties(selectedSpecialties.filter((s) => s !== specialty));
                        } else {
                          setSelectedSpecialties([...selectedSpecialties, specialty]);
                        }
                      }}
                    >
                      <span className="text-sm">{specialty}</span>
                      <Checkbox
                        checked={selectedSpecialties.includes(specialty)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSpecialties([...selectedSpecialties, specialty]);
                          } else {
                            setSelectedSpecialties(selectedSpecialties.filter((s) => s !== specialty));
                          }
                        }}
                      />
                    </div>
                  ))}
                  {selectedSpecialties.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setSelectedSpecialties([])}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}

            <Switch id="list-view" checked={viewMode === 'list'} onCheckedChange={(checked) => setViewMode(checked ? 'list' : 'grid')} />
            <Label htmlFor="list-view" className="text-sm">
              {viewMode === 'list' ? 'List View' : 'Grid View'}
            </Label>
          </div>
        </div>

        {/* Subcontractors Content */}
        {viewMode === 'list' ? (
          <DataTable
            columns={subColumns}
            rows={filteredSubcontractors}
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
            {filteredSubcontractors.map((subcontractor) => (
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
    </Layout>
  );
}
