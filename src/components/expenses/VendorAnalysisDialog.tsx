
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, DollarSign, AlertTriangle, FileText, Search, Download, ArrowUpDown, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportToExcel, exportToPDF, exportToCSV } from '@/utils/reportExports';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { DateRange } from 'react-day-picker';

interface VendorAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Array<{ id: string; name: string }>;
}

interface VendorExpenseData {
  vendor: string;
  totalPaid: number;
  totalPending: number;
  totalOutstanding: number;
  expenseCount: number;
  projects: string[];
  lastExpenseDate: string;
}

export function VendorAnalysisDialog({ open, onOpenChange, projects }: VendorAnalysisDialogProps) {
  const [vendorData, setVendorData] = useState<VendorExpenseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'date'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [allVendors, setAllVendors] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchVendorAnalysis();
    }
  }, [open, selectedProject, selectedVendor, dateRange]);

  const fetchVendorAnalysis = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          projects!inner(name)
        `);

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data: expenses, error } = await query;

      if (error) throw error;

      // Extract unique vendor names for filter
      const uniqueVendors = [...new Set((expenses || []).map(e => e.vendor || 'Unknown Vendor'))].sort();
      setAllVendors(uniqueVendors);

      // Filter expenses by date range and vendor
      let filteredExpenses = expenses || [];
      
      if (dateRange?.from) {
        filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= dateRange.from!);
      }
      if (dateRange?.to) {
        filteredExpenses = filteredExpenses.filter(e => new Date(e.date) <= dateRange.to!);
      }
      if (selectedVendor !== 'all') {
        filteredExpenses = filteredExpenses.filter(e => (e.vendor || 'Unknown Vendor') === selectedVendor);
      }

      // Group expenses by vendor
      const vendorMap = new Map<string, VendorExpenseData>();

      filteredExpenses.forEach((expense) => {
        const vendor = expense.vendor || 'Unknown Vendor';
        const projectName = expense.projects?.name || 'Unknown Project';
        
        if (!vendorMap.has(vendor)) {
          vendorMap.set(vendor, {
            vendor,
            totalPaid: 0,
            totalPending: 0,
            totalOutstanding: 0,
            expenseCount: 0,
            projects: [],
            lastExpenseDate: expense.date
          });
        }

        const vendorData = vendorMap.get(vendor)!;
        const amount = Number(expense.amount) || 0;

        vendorData.expenseCount++;
        if (!vendorData.projects.includes(projectName)) {
          vendorData.projects.push(projectName);
        }

        // Update last expense date
        if (new Date(expense.date) > new Date(vendorData.lastExpenseDate)) {
          vendorData.lastExpenseDate = expense.date;
        }

        // Categorize by status
        switch (expense.status) {
          case 'Paid':
            vendorData.totalPaid += amount;
            break;
          case 'Pending Field Approval':
          case 'Pending Office Approval':
            vendorData.totalPending += amount;
            break;
          case 'Approved':
            vendorData.totalOutstanding += amount;
            break;
          default:
            vendorData.totalPending += amount;
        }
      });

      let sortedVendorData = Array.from(vendorMap.values());

      // Apply sorting
      sortedVendorData.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'name':
            aValue = a.vendor.toLowerCase();
            bValue = b.vendor.toLowerCase();
            break;
          case 'total':
            aValue = a.totalPaid + a.totalPending + a.totalOutstanding;
            bValue = b.totalPaid + b.totalPending + b.totalOutstanding;
            break;
          case 'date':
            aValue = new Date(a.lastExpenseDate).getTime();
            bValue = new Date(b.lastExpenseDate).getTime();
            break;
          default:
            aValue = a.totalPaid + a.totalPending + a.totalOutstanding;
            bValue = b.totalPaid + b.totalPending + b.totalOutstanding;
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      setVendorData(sortedVendorData);

    } catch (error) {
      console.error('Error fetching vendor analysis:', error);
      toast.error('Failed to load vendor analysis');
    } finally {
      setLoading(false);
    }
  };

  const filteredVendorData = vendorData.filter(vendor =>
    vendor.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSummary = vendorData.reduce((acc, vendor) => ({
    totalPaid: acc.totalPaid + vendor.totalPaid,
    totalPending: acc.totalPending + vendor.totalPending,
    totalOutstanding: acc.totalOutstanding + vendor.totalOutstanding
  }), { totalPaid: 0, totalPending: 0, totalOutstanding: 0 });

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    const exportData = {
      title: 'Vendor Expense Analysis',
      data: filteredVendorData.map(vendor => ({
        Vendor: vendor.vendor,
        'Total Paid': `$${vendor.totalPaid.toLocaleString()}`,
        'Outstanding': `$${vendor.totalOutstanding.toLocaleString()}`,
        'Pending': `$${vendor.totalPending.toLocaleString()}`,
        'Total Amount': `$${(vendor.totalPaid + vendor.totalPending + vendor.totalOutstanding).toLocaleString()}`,
        'Expense Count': vendor.expenseCount,
        'Projects': vendor.projects.join(', '),
        'Last Expense': new Date(vendor.lastExpenseDate).toLocaleDateString()
      })),
      metadata: {
        generatedAt: new Date().toLocaleString(),
        project: selectedProject === 'all' ? 'All Projects' : projects.find(p => p.id === selectedProject)?.name,
        vendor: selectedVendor === 'all' ? 'All Vendors' : selectedVendor,
        dateRange: dateRange?.from && dateRange?.to 
          ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
          : 'All Dates',
        totalRecords: filteredVendorData.length,
        totalPaid: `$${totalSummary.totalPaid.toLocaleString()}`,
        totalOutstanding: `$${totalSummary.totalOutstanding.toLocaleString()}`,
        totalPending: `$${totalSummary.totalPending.toLocaleString()}`
      }
    };

    switch (format) {
      case 'excel':
        exportToExcel(exportData);
        break;
      case 'pdf':
        exportToPDF(exportData);
        break;
      case 'csv':
        exportToCSV(exportData);
        break;
    }

    toast.success(`Report exported as ${format.toUpperCase()}`);
  };

  const toggleSort = (newSortBy: 'name' | 'total' | 'date') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    fetchVendorAnalysis();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Vendor Expense Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filters and Export */}
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-48">
              <Label htmlFor="search">Search Vendors</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by vendor name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="vendor">Vendor Filter</Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {allVendors.map((vendor) => (
                    <SelectItem key={vendor} value={vendor}>
                      {vendor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="project">Project Filter</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Date Range</Label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                className="w-auto"
              />
            </div>
            
            <div className="flex gap-2">
              <Select onValueChange={(value) => handleExport(value as 'excel' | 'pdf' | 'csv')}>
                <SelectTrigger className="w-40">
                  <Download className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Export Excel</SelectItem>
                  <SelectItem value="pdf">Export PDF</SelectItem>
                  <SelectItem value="csv">Export CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Paid</p>
                    <p className="text-xl font-bold text-green-600">
                      ${totalSummary.totalPaid.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Outstanding</p>
                    <p className="text-xl font-bold text-orange-600">
                      ${totalSummary.totalOutstanding.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-xl font-bold text-yellow-600">
                      ${totalSummary.totalPending.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vendor Overview Table */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                        <div className="flex items-center gap-2">
                          Vendor
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </TableHead>
                      <TableHead>Total Paid</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort('total')}>
                        <div className="flex items-center gap-2">
                          Total Amount
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort('date')}>
                        <div className="flex items-center gap-2">
                          Last Expense
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendorData.map((vendor) => (
                      <TableRow key={vendor.vendor}>
                        <TableCell className="font-medium">{vendor.vendor}</TableCell>
                        <TableCell className="text-green-600">
                          ${vendor.totalPaid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-orange-600">
                          ${vendor.totalOutstanding.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-yellow-600">
                          ${vendor.totalPending.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${(vendor.totalPaid + vendor.totalPending + vendor.totalOutstanding).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {vendor.projects.slice(0, 2).map((project) => (
                              <Badge key={project} variant="outline" className="text-xs">
                                {project}
                              </Badge>
                            ))}
                            {vendor.projects.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{vendor.projects.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(vendor.lastExpenseDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
