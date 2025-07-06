
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign, AlertTriangle, FileText, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface ExpenseDetail {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  project_name: string;
  category: string;
}

export function VendorAnalysisDialog({ open, onOpenChange, projects }: VendorAnalysisDialogProps) {
  const [vendorData, setVendorData] = useState<VendorExpenseData[]>([]);
  const [expenseDetails, setExpenseDetails] = useState<ExpenseDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
      fetchVendorAnalysis();
    }
  }, [open, selectedProject]);

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

      // Group expenses by vendor
      const vendorMap = new Map<string, VendorExpenseData>();

      (expenses || []).forEach((expense) => {
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

      const sortedVendorData = Array.from(vendorMap.values())
        .sort((a, b) => (b.totalPaid + b.totalPending + b.totalOutstanding) - (a.totalPaid + a.totalPending + a.totalOutstanding));

      setVendorData(sortedVendorData);

      // If a vendor is selected, fetch detailed expenses
      if (selectedVendor) {
        fetchVendorDetails(selectedVendor);
      }

    } catch (error) {
      console.error('Error fetching vendor analysis:', error);
      toast.error('Failed to load vendor analysis');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorDetails = async (vendor: string) => {
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          projects!inner(name)
        `)
        .eq('vendor', vendor);

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data: expenses, error } = await query;

      if (error) throw error;

      const details = (expenses || []).map(expense => ({
        id: expense.id,
        description: expense.description,
        amount: Number(expense.amount) || 0,
        date: expense.date,
        status: expense.status,
        project_name: expense.projects?.name || 'Unknown Project',
        category: expense.category
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setExpenseDetails(details);
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      toast.error('Failed to load vendor details');
    }
  };

  const handleVendorSelect = (vendor: string) => {
    setSelectedVendor(vendor);
    fetchVendorDetails(vendor);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Approved':
        return 'bg-orange-100 text-orange-800';
      case 'Pending Field Approval':
      case 'Pending Office Approval':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredVendorData = vendorData.filter(vendor =>
    vendor.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSummary = vendorData.reduce((acc, vendor) => ({
    totalPaid: acc.totalPaid + vendor.totalPaid,
    totalPending: acc.totalPending + vendor.totalPending,
    totalOutstanding: acc.totalOutstanding + vendor.totalOutstanding,
    totalVendors: vendorData.length
  }), { totalPaid: 0, totalPending: 0, totalOutstanding: 0, totalVendors: 0 });

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
          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
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
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
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

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Vendors</p>
                    <p className="text-xl font-bold text-blue-600">
                      {totalSummary.totalVendors}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Vendor Overview</TabsTrigger>
              <TabsTrigger value="details" disabled={!selectedVendor}>
                Vendor Details {selectedVendor && `(${selectedVendor})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
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
                          <TableHead>Vendor</TableHead>
                          <TableHead>Total Paid</TableHead>
                          <TableHead>Outstanding</TableHead>
                          <TableHead>Pending</TableHead>
                          <TableHead>Total Expenses</TableHead>
                          <TableHead>Projects</TableHead>
                          <TableHead>Last Expense</TableHead>
                          <TableHead>Actions</TableHead>
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
                            <TableCell>{vendor.expenseCount}</TableCell>
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
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVendorSelect(vendor.vendor)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              {selectedVendor && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Expenses - {selectedVendor}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseDetails.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                            <TableCell>{expense.project_name}</TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell>{expense.category}</TableCell>
                            <TableCell>${expense.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(expense.status)}>
                                {expense.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
