import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, Settings, Plus, Trash2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportToExcel, exportToPDF, exportToCSV } from '@/utils/reportExports';
import jsPDF from 'jspdf';

interface CustomReportBuilderProps {
  onClose?: () => void;
}

interface DataSource {
  id: string;
  label: string;
  description: string;
  icon: string;
  fields: string[];
  category: 'project' | 'financial' | 'operations' | 'hr';
}

interface ReportSection {
  id: string;
  name: string;
  dataSources: string[];
  fields: string[];
  groupBy?: string;
  sortBy?: string;
  filters?: any[];
}

interface CustomReport {
  id?: string;
  name: string;
  description: string;
  sections: ReportSection[];
  dateRange?: DateRange;
  includeCompanyLogo: boolean;
  includeProjectFilter: boolean;
  selectedProjects: string[];
}

export function CustomReportBuilder({ onClose }: CustomReportBuilderProps) {
  const [report, setReport] = useState<CustomReport>({
    name: '',
    description: '',
    sections: [],
    includeCompanyLogo: true,
    includeProjectFilter: true,
    selectedProjects: []
  });
  
  const [availableDataSources] = useState<DataSource[]>([
    {
      id: 'projects',
      label: 'Projects',
      description: 'Project details, status, contract values',
      icon: '🏗️',
      fields: ['name', 'client', 'contract_value', 'status', 'start_date', 'due_date', 'completion_percentage'],
      category: 'project'
    },
    {
      id: 'expenses',
      label: 'Expenses',
      description: 'Project expenses and cost tracking',
      icon: '💰',
      fields: ['project_id', 'amount', 'category', 'date', 'vendor', 'status', 'description'],
      category: 'financial'
    },
    {
      id: 'project_billing',
      label: 'Project Billing',
      description: 'Billing records and payment tracking',
      icon: '🧾',
      fields: ['project_id', 'billed_amount', 'paid_amount', 'status', 'invoice_date', 'due_date'],
      category: 'financial'
    },
    {
      id: 'change_orders',
      label: 'Change Orders',
      description: 'Project change orders and modifications',
      icon: '📋',
      fields: ['project_id', 'number', 'description', 'amount', 'date', 'status'],
      category: 'project'
    },
    {
      id: 'payment_applications',
      label: 'Payment Applications',
      description: 'G702 payment applications',
      icon: '📄',
      fields: ['project_id', 'application_number', 'period_to', 'original_contract_sum', 'current_payment_due'],
      category: 'financial'
    },
    {
      id: 'sov_items',
      label: 'Schedule of Values',
      description: 'SOV line items and progress',
      icon: '📊',
      fields: ['project_id', 'item_number', 'description', 'scheduled_value', 'percent_complete'],
      category: 'project'
    },
    {
      id: 'equipment',
      label: 'Equipment',
      description: 'Equipment inventory and usage',
      icon: '🚛',
      fields: ['name', 'category', 'status', 'hourly_rate', 'total_hours_used', 'value'],
      category: 'operations'
    },
    {
      id: 'equipment_usage_logs',
      label: 'Equipment Usage',
      description: 'Equipment usage logs and hours',
      icon: '⏱️',
      fields: ['equipment_id', 'project_id', 'hours_used', 'start_time', 'end_time', 'operator_name'],
      category: 'operations'
    },
    {
      id: 'tasks',
      label: 'Tasks & Schedule',
      description: 'Project tasks and scheduling',
      icon: '📅',
      fields: ['project_id', 'title', 'status', 'start_date', 'end_date', 'progress'],
      category: 'project'
    },
    {
      id: 'subcontractors',
      label: 'Subcontractors',
      description: 'Subcontractor information and ratings',
      icon: '👷',
      fields: ['name', 'company', 'specialties', 'rating', 'status', 'phone', 'email'],
      category: 'hr'
    }
  ]);

  const [projects, setProjects] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);

  useEffect(() => {
    fetchProjects();
    fetchCompanySettings();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client, status')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

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

  const addSection = () => {
    const newSection: ReportSection = {
      id: `section-${Date.now()}`,
      name: `Section ${report.sections.length + 1}`,
      dataSources: [],
      fields: []
    };
    setReport(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const updateSection = (sectionId: string, updates: Partial<ReportSection>) => {
    setReport(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const removeSection = (sectionId: string) => {
    setReport(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const fetchData = async (dataSourceId: string) => {
    if (dataSourceId === 'projects') {
      let query = supabase.from('projects').select('*');
      
      if (report.includeProjectFilter && report.selectedProjects.length > 0) {
        query = query.in('id', report.selectedProjects);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else if (dataSourceId === 'expenses') {
      let query = supabase.from('expenses').select('*');
      
      if (report.includeProjectFilter && report.selectedProjects.length > 0) {
        query = query.in('project_id', report.selectedProjects);
      }
      
      if (report.dateRange?.from && report.dateRange?.to) {
        query = query
          .gte('date', report.dateRange.from.toISOString().split('T')[0])
          .lte('date', report.dateRange.to.toISOString().split('T')[0]);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else if (dataSourceId === 'project_billing') {
      let query = supabase.from('project_billing').select('*');
      
      if (report.includeProjectFilter && report.selectedProjects.length > 0) {
        query = query.in('project_id', report.selectedProjects);
      }
      
      if (report.dateRange?.from && report.dateRange?.to) {
        query = query
          .gte('billing_period_end', report.dateRange.from.toISOString().split('T')[0])
          .lte('billing_period_start', report.dateRange.to.toISOString().split('T')[0]);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else if (dataSourceId === 'change_orders') {
      let query = supabase.from('change_orders').select('*');
      
      if (report.includeProjectFilter && report.selectedProjects.length > 0) {
        query = query.in('project_id', report.selectedProjects);
      }
      
      if (report.dateRange?.from && report.dateRange?.to) {
        query = query
          .gte('date', report.dateRange.from.toISOString().split('T')[0])
          .lte('date', report.dateRange.to.toISOString().split('T')[0]);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else if (dataSourceId === 'payment_applications') {
      let query = supabase.from('payment_applications').select('*');
      
      if (report.includeProjectFilter && report.selectedProjects.length > 0) {
        query = query.in('project_id', report.selectedProjects);
      }
      
      if (report.dateRange?.from && report.dateRange?.to) {
        query = query
          .gte('period_end_date', report.dateRange.from.toISOString().split('T')[0])
          .lte('period_end_date', report.dateRange.to.toISOString().split('T')[0]);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else if (dataSourceId === 'sov_items') {
      let query = supabase.from('sov_items').select('*');
      
      if (report.includeProjectFilter && report.selectedProjects.length > 0) {
        query = query.in('project_id', report.selectedProjects);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else if (dataSourceId === 'equipment') {
      const { data, error } = await supabase.from('equipment').select('*');
      if (error) throw error;
      return data || [];
    } else if (dataSourceId === 'equipment_usage_logs') {
      let query = supabase.from('equipment_usage_logs').select('*');
      
      if (report.includeProjectFilter && report.selectedProjects.length > 0) {
        query = query.in('project_id', report.selectedProjects);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else if (dataSourceId === 'tasks') {
      let query = supabase.from('tasks').select('*');
      
      if (report.includeProjectFilter && report.selectedProjects.length > 0) {
        query = query.in('project_id', report.selectedProjects);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else if (dataSourceId === 'subcontractors') {
      const { data, error } = await supabase.from('subcontractors').select('*');
      if (error) throw error;
      return data || [];
    }
    
    return [];
  };

  const generateReport = async () => {
    if (!report.name.trim()) {
      toast.error('Please enter a report name');
      return;
    }

    if (report.sections.length === 0) {
      toast.error('Please add at least one section to the report');
      return;
    }

    setLoading(true);
    try {
      const reportData: any = {
        reportInfo: {
          name: report.name,
          description: report.description,
          generatedAt: new Date().toLocaleString(),
          generatedBy: companySettings?.company_name || 'Company',
          dateRange: report.dateRange?.from && report.dateRange?.to 
            ? `${report.dateRange.from.toLocaleDateString()} - ${report.dateRange.to.toLocaleDateString()}`
            : 'All Time'
        },
        sections: {}
      };

      for (const section of report.sections) {
        const sectionData: any = {};
        
        for (const dataSourceId of section.dataSources) {
          const data = await fetchData(dataSourceId);
          sectionData[dataSourceId] = data;
        }
        
        reportData.sections[section.name] = sectionData;
      }

      setGeneratedData(reportData);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'excel' | 'pdf' | 'csv') => {
    if (!generatedData) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      if (format === 'pdf') {
        await generateCustomPDF();
      } else {
        const exportData = {
          title: report.name,
          data: Object.values(generatedData.sections).flat(),
          metadata: generatedData.reportInfo
        };

        switch (format) {
          case 'excel':
            exportToExcel(exportData);
            break;
          case 'csv':
            exportToCSV(exportData);
            break;
        }
      }
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const generateCustomPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = margin;

    // Add company logo if enabled and available
    if (report.includeCompanyLogo && companySettings?.logo_url) {
      try {
        doc.addImage(companySettings.logo_url, 'PNG', margin, yPosition, 40, 30);
        yPosition += 40;
      } catch (error) {
        console.warn('Could not add logo to PDF');
      }
    }

    // Report header
    doc.setFontSize(18);
    doc.text(report.name, margin, yPosition);
    yPosition += 10;
    
    if (report.description) {
      doc.setFontSize(12);
      doc.text(report.description, margin, yPosition);
      yPosition += 8;
    }
    
    doc.setFontSize(10);
    doc.text(`Generated: ${generatedData.reportInfo.generatedAt}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Date Range: ${generatedData.reportInfo.dateRange}`, margin, yPosition);
    yPosition += 15;

    // Report sections
    Object.entries(generatedData.sections).forEach(([sectionName, sectionData]: [string, any]) => {
      doc.setFontSize(14);
      doc.text(sectionName, margin, yPosition);
      yPosition += 10;

      Object.entries(sectionData).forEach(([dataSource, data]: [string, any]) => {
        doc.setFontSize(12);
        doc.text(dataSource.replace('_', ' ').toUpperCase(), margin, yPosition);
        yPosition += 8;

        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]).slice(0, 5); // Limit columns for PDF
          
          // Headers
          doc.setFontSize(9);
          const cellWidth = (pageWidth - 2 * margin) / headers.length;
          headers.forEach((header, index) => {
            doc.text(header, margin + index * cellWidth, yPosition);
          });
          yPosition += 6;

          // Data rows (limit to prevent overflow)
          const maxRows = Math.min(data.length, 10);
          for (let i = 0; i < maxRows; i++) {
            const row = data[i];
            headers.forEach((header, index) => {
              const value = row[header]?.toString().substring(0, 20) || '';
              doc.text(value, margin + index * cellWidth, yPosition);
            });
            yPosition += 5;

            if (yPosition > doc.internal.pageSize.height - margin) {
              doc.addPage();
              yPosition = margin;
            }
          }
        }
        yPosition += 10;
      });
    });

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${totalPages} | ${companySettings?.company_name || 'Company'}`,
        margin,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`${report.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Custom Report Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Report Name</label>
              <Input
                value={report.name}
                onChange={(e) => setReport(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter report name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={report.description}
                onChange={(e) => setReport(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Report description (optional)"
                rows={3}
              />
            </div>
          </div>

          {/* Report Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Report Options</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeLogo"
                  checked={report.includeCompanyLogo}
                  onCheckedChange={(checked) => 
                    setReport(prev => ({ ...prev, includeCompanyLogo: checked as boolean }))
                  }
                />
                <label htmlFor="includeLogo" className="text-sm font-medium">
                  Include Company Logo
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="projectFilter"
                  checked={report.includeProjectFilter}
                  onCheckedChange={(checked) => 
                    setReport(prev => ({ ...prev, includeProjectFilter: checked as boolean }))
                  }
                />
                <label htmlFor="projectFilter" className="text-sm font-medium">
                  Enable Project Filtering
                </label>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium">Date Range (Optional)</label>
            <DatePickerWithRange 
              date={report.dateRange} 
              onDateChange={(dateRange) => setReport(prev => ({ ...prev, dateRange }))}
            />
          </div>

          {/* Project Selection */}
          {report.includeProjectFilter && (
            <div>
              <label className="text-sm font-medium">Select Projects</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={project.id}
                      checked={report.selectedProjects.includes(project.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setReport(prev => ({
                            ...prev,
                            selectedProjects: [...prev.selectedProjects, project.id]
                          }));
                        } else {
                          setReport(prev => ({
                            ...prev,
                            selectedProjects: prev.selectedProjects.filter(id => id !== project.id)
                          }));
                        }
                      }}
                    />
                    <label htmlFor={project.id} className="text-sm">
                      {project.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Sections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Report Sections</CardTitle>
          <Button onClick={addSection} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.sections.map((section) => (
            <Card key={section.id} className="border-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Input
                  value={section.name}
                  onChange={(e) => updateSection(section.id, { name: e.target.value })}
                  className="font-medium"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeSection(section.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Data Sources</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {availableDataSources.map((dataSource) => (
                      <div key={dataSource.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${section.id}-${dataSource.id}`}
                          checked={section.dataSources.includes(dataSource.id)}
                          onCheckedChange={(checked) => {
                            const newDataSources = checked
                              ? [...section.dataSources, dataSource.id]
                              : section.dataSources.filter(id => id !== dataSource.id);
                            updateSection(section.id, { dataSources: newDataSources });
                          }}
                        />
                        <label htmlFor={`${section.id}-${dataSource.id}`} className="text-sm flex items-center gap-1">
                          <span>{dataSource.icon}</span>
                          {dataSource.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {section.dataSources.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {section.dataSources.map((sourceId) => {
                      const source = availableDataSources.find(s => s.id === sourceId);
                      return (
                        <Badge key={sourceId} variant="secondary">
                          {source?.icon} {source?.label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {report.sections.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No sections added yet. Click "Add Section" to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate & Export */}
      <Card>
        <CardHeader>
          <CardTitle>Generate & Export Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={generateReport} 
              disabled={loading || !report.name.trim() || report.sections.length === 0}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>

            {generatedData && (
              <div className="space-y-4">
                <div className="text-sm text-green-600 font-medium">
                  ✓ Report generated successfully with {Object.keys(generatedData.sections).length} section(s)
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => exportReport('excel')}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportReport('pdf')}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportReport('csv')}
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
    </div>
  );
}
