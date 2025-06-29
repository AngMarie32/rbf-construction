import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, BarChart3, Building2, TrendingUp, DollarSign } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportSimpleToExcel, exportSimpleToPDF, exportSimpleToCSV } from '@/utils/reportExports';
import jsPDF from 'jspdf';

interface Project {
  id: string;
  name: string;
  client: string;
  contract_value: number;
  status: string;
  start_date?: string;
  due_date?: string;
}

interface ProjectReportBuilderProps {
  project: Project;
}

interface ReportData {
  [key: string]: any[];
}

export function ProjectReportBuilder({ project }: ProjectReportBuilderProps) {
  const [selectedReportType, setSelectedReportType] = useState('custom');
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [reportData, setReportData] = useState<ReportData>({});
  const [loading, setLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      setCompanySettings(data);
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const dataSourceOptions = [
    { id: 'expenses', label: 'Expenses', icon: '💰' },
    { id: 'billing', label: 'Billing Records', icon: '🧾' },
    { id: 'change_orders', label: 'Change Orders', icon: '📋' },
    { id: 'payment_apps', label: 'Payment Applications', icon: '📄' },
    { id: 'tasks', label: 'Tasks & Schedule', icon: '📅' },
    { id: 'equipment', label: 'Equipment Usage', icon: '🚛' },
    { id: 'sov_items', label: 'Schedule of Values', icon: '📊' }
  ];

  const reportTemplates = [
    {
      id: 'profit_loss',
      name: 'Company Profit & Loss',
      description: 'Complete P&L statement with company branding',
      icon: <DollarSign className="w-5 h-5" />,
      dataSources: ['expenses', 'billing', 'change_orders']
    },
    {
      id: 'project_summary',
      name: 'Project Summary Report',
      description: 'Comprehensive project overview',
      icon: <Building2 className="w-5 h-5" />,
      dataSources: ['expenses', 'billing', 'tasks', 'change_orders']
    },
    {
      id: 'financial_analysis',
      name: 'Financial Analysis',
      description: 'Revenue, costs, and profitability analysis',
      icon: <TrendingUp className="w-5 h-5" />,
      dataSources: ['expenses', 'billing', 'payment_apps', 'sov_items']
    },
    {
      id: 'custom',
      name: 'Custom Report',
      description: 'Build your own custom report',
      icon: <BarChart3 className="w-5 h-5" />,
      dataSources: []
    }
  ];

  const handleDataSourceToggle = (sourceId: string) => {
    setSelectedDataSources(prev => 
      prev.includes(sourceId) 
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedReportType(templateId);
    const template = reportTemplates.find(t => t.id === templateId);
    if (template && template.dataSources.length > 0) {
      setSelectedDataSources(template.dataSources);
    }
  };

  const fetchReportData = async () => {
    if (selectedDataSources.length === 0) {
      toast.error('Please select at least one data source');
      return;
    }

    setLoading(true);
    const data: ReportData = {};

    try {
      for (const source of selectedDataSources) {
        let sourceData = [];
        
        // Handle each data source individually with proper table names
        if (source === 'expenses') {
          let query = supabase.from('expenses').select('*').eq('project_id', project.id);
          
          if (dateRange?.from && dateRange?.to) {
            query = query
              .gte('date', dateRange.from.toISOString().split('T')[0])
              .lte('date', dateRange.to.toISOString().split('T')[0]);
          }
          
          const { data: expenseData, error } = await query;
          if (error) throw error;
          sourceData = expenseData || [];
        }
        
        else if (source === 'billing') {
          let query = supabase.from('project_billing').select('*').eq('project_id', project.id);
          
          if (dateRange?.from && dateRange?.to) {
            query = query
              .gte('billing_period_start', dateRange.from.toISOString().split('T')[0])
              .lte('billing_period_start', dateRange.to.toISOString().split('T')[0]);
          }
          
          const { data: billingData, error } = await query;
          if (error) throw error;
          sourceData = billingData || [];
        }
        
        else if (source === 'change_orders') {
          let query = supabase.from('change_orders').select('*').eq('project_id', project.id);
          
          if (dateRange?.from && dateRange?.to) {
            query = query
              .gte('date', dateRange.from.toISOString().split('T')[0])
              .lte('date', dateRange.to.toISOString().split('T')[0]);
          }
          
          const { data: changeOrderData, error } = await query;
          if (error) throw error;
          sourceData = changeOrderData || [];
        }
        
        else if (source === 'payment_apps') {
          let query = supabase.from('payment_applications_g702').select('*').eq('project_id', project.id);
          
          if (dateRange?.from && dateRange?.to) {
            query = query
              .gte('period_to', dateRange.from.toISOString().split('T')[0])
              .lte('period_to', dateRange.to.toISOString().split('T')[0]);
          }
          
          const { data: paymentData, error } = await query;
          if (error) throw error;
          sourceData = paymentData || [];
        }
        
        else if (source === 'tasks') {
          let query = supabase.from('tasks').select('*').eq('project_id', project.id);
          
          if (dateRange?.from && dateRange?.to) {
            query = query
              .gte('start_date', dateRange.from.toISOString().split('T')[0])
              .lte('start_date', dateRange.to.toISOString().split('T')[0]);
          }
          
          const { data: taskData, error } = await query;
          if (error) throw error;
          sourceData = taskData || [];
        }
        
        else if (source === 'equipment') {
          let query = supabase.from('equipment_usage_logs').select('*');
          
          if (project.id) {
            query = query.eq('project_id', project.id);
          }
          
          if (dateRange?.from && dateRange?.to) {
            query = query
              .gte('start_time', dateRange.from.toISOString())
              .lte('start_time', dateRange.to.toISOString());
          }
          
          const { data: equipmentData, error } = await query;
          if (error) throw error;
          sourceData = equipmentData || [];
        }
        
        else if (source === 'sov_items') {
          let query = supabase.from('sov_items').select('*').eq('project_id', project.id);
          
          const { data: sovData, error } = await query;
          if (error) throw error;
          sourceData = sovData || [];
        }
        
        data[source] = sourceData;
      }

      setReportData(data);
      toast.success('Report data loaded successfully');
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const generateProfitLossReport = async () => {
    if (!reportData.expenses && !reportData.billing) {
      toast.error('Please load expenses and billing data first');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = margin;

    // Add company logo if available
    if (companySettings?.logo_url) {
      try {
        doc.addImage(companySettings.logo_url, 'PNG', margin, yPosition, 40, 30);
        yPosition += 40;
      } catch (error) {
        console.warn('Could not add logo to PDF');
      }
    }

    // Company header
    doc.setFontSize(18);
    doc.text(companySettings?.company_name || 'Company Name', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(14);
    doc.text('Profit & Loss Statement', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.text(`Project: ${project.name}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Period: ${dateRange?.from ? dateRange.from.toLocaleDateString() : 'All Time'} - ${dateRange?.to ? dateRange.to.toLocaleDateString() : 'Present'}`, margin, yPosition);
    yPosition += 15;

    // Revenue Section
    doc.setFontSize(12);
    doc.text('REVENUE', margin, yPosition);
    yPosition += 8;

    const totalRevenue = (reportData.billing || []).reduce((sum: number, bill: any) => sum + (Number(bill.paid_amount) || 0), 0);
    doc.setFontSize(10);
    doc.text('Contract Revenue', margin + 10, yPosition);
    doc.text(`$${totalRevenue.toLocaleString()}`, pageWidth - margin - 60, yPosition);
    yPosition += 6;

    const changeOrderRevenue = (reportData.change_orders || []).reduce((sum: number, co: any) => sum + (Number(co.amount) || 0), 0);
    doc.text('Change Orders', margin + 10, yPosition);
    doc.text(`$${changeOrderRevenue.toLocaleString()}`, pageWidth - margin - 60, yPosition);
    yPosition += 6;

    const grossRevenue = totalRevenue + changeOrderRevenue;
    doc.setFontSize(11);
    doc.text('Total Revenue', margin + 10, yPosition);
    doc.text(`$${grossRevenue.toLocaleString()}`, pageWidth - margin - 60, yPosition);
    yPosition += 15;

    // Expenses Section
    doc.setFontSize(12);
    doc.text('EXPENSES', margin, yPosition);
    yPosition += 8;

    const expensesByCategory: { [key: string]: number } = {};
    (reportData.expenses || []).forEach((expense: any) => {
      const category = expense.category || 'Other';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + (Number(expense.amount) || 0);
    });

    Object.entries(expensesByCategory).forEach(([category, amount]) => {
      doc.setFontSize(10);
      doc.text(category, margin + 10, yPosition);
      doc.text(`$${amount.toLocaleString()}`, pageWidth - margin - 60, yPosition);
      yPosition += 6;
    });

    const totalExpenses = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    doc.setFontSize(11);
    doc.text('Total Expenses', margin + 10, yPosition);
    doc.text(`$${totalExpenses.toLocaleString()}`, pageWidth - margin - 60, yPosition);
    yPosition += 15;

    // Net Profit
    const netProfit = grossRevenue - totalExpenses;
    doc.setFontSize(14);
    doc.text('NET PROFIT', margin, yPosition);
    doc.text(`$${netProfit.toLocaleString()}`, pageWidth - margin - 80, yPosition);
    
    // Profit margin
    yPosition += 8;
    const profitMargin = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : '0.0';
    doc.setFontSize(10);
    doc.text(`Profit Margin: ${profitMargin}%`, margin, yPosition);

    // Footer
    yPosition = doc.internal.pageSize.height - 20;
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | ${companySettings?.company_name || 'Company'}`, margin, yPosition);

    doc.save(`${project.name}_Profit_Loss_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Profit & Loss report generated successfully');
  };

  const handleExportReport = async (format: 'excel' | 'pdf' | 'csv') => {
    if (selectedReportType === 'profit_loss') {
      if (format === 'pdf') {
        await generateProfitLossReport();
        return;
      }
    }

    if (Object.keys(reportData).length === 0) {
      toast.error('Please generate report data first');
      return;
    }

    const exportData = {
      title: `${project.name} - ${reportTemplates.find(t => t.id === selectedReportType)?.name || 'Custom Report'}`,
      data: Object.values(reportData).flat(),
      metadata: {
        projectName: project.name,
        client: project.client,
        dateRange: dateRange?.from && dateRange?.to 
          ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
          : 'All Time',
        generatedBy: companySettings?.company_name || 'Company',
        generatedAt: new Date().toLocaleString(),
        dataSources: selectedDataSources.join(', ')
      }
    };

    try {
      switch (format) {
        case 'excel':
          exportSimpleToExcel(exportData);
          break;
        case 'pdf':
          await exportSimpleToPDF(exportData);
          break;
        case 'csv':
          exportSimpleToCSV(exportData);
          break;
      }
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value="builder" className="w-full">
        <TabsList>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          {/* Report Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Report Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reportTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedReportType === template.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {template.icon}
                        <h3 className="font-medium">{template.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Source Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Data Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {dataSourceOptions.map((source) => (
                  <div key={source.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={source.id}
                      checked={selectedDataSources.includes(source.id)}
                      onCheckedChange={() => handleDataSourceToggle(source.id)}
                    />
                    <label htmlFor={source.id} className="text-sm font-medium flex items-center gap-2">
                      <span>{source.icon}</span>
                      {source.label}
                    </label>
                  </div>
                ))}
              </div>
              
              {selectedDataSources.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Selected data sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDataSources.map((sourceId) => {
                      const source = dataSourceOptions.find(s => s.id === sourceId);
                      return (
                        <Badge key={sourceId} variant="secondary">
                          {source?.icon} {source?.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Date Range Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Date Range (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            </CardContent>
          </Card>

          {/* Generate Report */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={fetchReportData} 
                  disabled={loading || selectedDataSources.length === 0}
                  className="w-full"
                >
                  {loading ? 'Loading...' : 'Generate Report Data'}
                </Button>

                {Object.keys(reportData).length > 0 && (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      Report generated with {Object.keys(reportData).length} data source(s)
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleExportReport('excel')}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleExportReport('pdf')}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleExportReport('csv')}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
