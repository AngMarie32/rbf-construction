
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { FileText, Download, Calendar, DollarSign, User, Building, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DateRange } from 'react-day-picker';

interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  start_date: string;
  due_date: string;
  contract_value: number;
  completion_percentage: number;
  description?: string;
  field_leader?: string;
  address?: string;
  project_code?: string;
  type?: string;
}

interface ProjectReportProps {
  projects: Project[];
  totalExpenses: Record<string, number>;
  totalBilled: Record<string, number>;
  totalReceived: Record<string, number>;
}

export const ProjectReport: React.FC<ProjectReportProps> = ({
  projects,
  totalExpenses,
  totalBilled,
  totalReceived
}) => {
  const [selectedFieldLeader, setSelectedFieldLeader] = useState<string>('all');
  const [fieldLeaders, setFieldLeaders] = useState<string[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>(projects);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [pendingExpenses, setPendingExpenses] = useState<Record<string, number>>({});

  useEffect(() => {
    // Extract unique field leaders
    const leaders = [...new Set(projects.map(p => p.field_leader).filter(Boolean))] as string[];
    setFieldLeaders(leaders);
    
    // Fetch company information and pending expenses
    fetchCompanyInfo();
    fetchPendingExpenses();
  }, [projects]);

  useEffect(() => {
    // Filter projects by field leader and date range
    let filtered = projects;
    
    if (selectedFieldLeader !== 'all') {
      filtered = filtered.filter(p => p.field_leader === selectedFieldLeader);
    }
    
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(p => {
        const projectStart = new Date(p.start_date);
        return projectStart >= dateRange.from! && projectStart <= dateRange.to!;
      });
    }
    
    setFilteredProjects(filtered);
  }, [selectedFieldLeader, projects, dateRange]);

  const fetchCompanyInfo = async () => {
    try {
      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .maybeSingle();
      setCompanyInfo(data);
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  const fetchPendingExpenses = async () => {
    try {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('project_id, amount')
        .eq('status', 'Pending Field Approval');

      const pendingByProject: Record<string, number> = {};
      (expenses || []).forEach(expense => {
        if (!pendingByProject[expense.project_id]) {
          pendingByProject[expense.project_id] = 0;
        }
        pendingByProject[expense.project_id] += Number(expense.amount) || 0;
      });
      
      setPendingExpenses(pendingByProject);
    } catch (error) {
      console.error('Error fetching pending expenses:', error);
    }
  };

  const calculateTotals = () => {
    return filteredProjects.reduce((acc, project) => ({
      totalContractValue: acc.totalContractValue + (project.contract_value || 0),
      totalExpenses: acc.totalExpenses + (totalExpenses[project.id] || 0),
      totalBilled: acc.totalBilled + (totalBilled[project.id] || 0),
      totalReceived: acc.totalReceived + (totalReceived[project.id] || 0),
      totalPending: acc.totalPending + (pendingExpenses[project.id] || 0),
    }), {
      totalContractValue: 0,
      totalExpenses: 0,
      totalBilled: 0,
      totalReceived: 0,
      totalPending: 0,
    });
  };

  const totals = calculateTotals();
  const profitMargin = totals.totalContractValue > 0 
    ? ((totals.totalReceived - totals.totalExpenses) / totals.totalContractValue) * 100 
    : 0;

  const exportToPDF = async () => {
    const element = document.getElementById('project-report');
    if (!element) return;

    try {
      // Create a new window for better PDF rendering
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      // Clone the element to avoid modifying the original
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      // Add styles for better PDF rendering
      const styles = `
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
          .grid { display: grid; gap: 1rem; }
          .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
          .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
          .bg-blue-50 { background-color: #eff6ff; }
          .bg-green-50 { background-color: #f0fdf4; }
          .bg-orange-50 { background-color: #fffbeb; }
          .bg-purple-50 { background-color: #faf5ff; }
          .bg-gray-50 { background-color: #f9fafb; }
          .p-4 { padding: 1rem; }
          .p-6 { padding: 1.5rem; }
          .rounded-lg { border-radius: 0.5rem; }
          .border { border: 1px solid #e5e7eb; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .text-2xl { font-size: 1.5rem; }
          .text-lg { font-size: 1.125rem; }
          .text-sm { font-size: 0.875rem; }
          .text-xs { font-size: 0.75rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mb-3 { margin-bottom: 0.75rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mt-2 { margin-top: 0.5rem; }
          .mt-3 { margin-top: 0.75rem; }
          .space-y-4 > * + * { margin-top: 1rem; }
          .flex { display: flex; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          .gap-2 { gap: 0.5rem; }
          .gap-4 { gap: 1rem; }
        </style>
      `;

      printWindow.document.write(`
        <html>
          <head>
            <title>Project Report</title>
            ${styles}
          </head>
          <body>
            ${clonedElement.outerHTML}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 1000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-500';
      case 'active': return 'bg-blue-500';
      case 'on hold': return 'bg-yellow-500';
      case 'planning': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Project Report
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date Range</label>
                <DatePickerWithRange 
                  date={dateRange} 
                  onDateChange={setDateRange}
                  className="w-64"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Field Leader</label>
                <Select value={selectedFieldLeader} onValueChange={setSelectedFieldLeader}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Field Leader" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Field Leaders</SelectItem>
                    {fieldLeaders.map(leader => (
                      <SelectItem key={leader} value={leader}>
                        {leader}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={exportToPDF} className="gap-2 mt-6">
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Project Report */}
      <div id="project-report" className="bg-white p-8 space-y-8">
        {/* Header */}
        <div className="text-center border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {companyInfo?.company_name || 'Construction Company'}
          </h1>
          <p className="text-gray-600 text-lg">Project Report</p>
          <p className="text-sm text-gray-500 mt-2">
            Generated on {format(new Date(), 'MMMM dd, yyyy')}
          </p>
          {selectedFieldLeader !== 'all' && (
            <p className="text-sm text-blue-600 mt-1">
              Field Leader: {selectedFieldLeader}
            </p>
          )}
          {dateRange?.from && dateRange?.to && (
            <p className="text-sm text-blue-600 mt-1">
              Date Range: {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
            </p>
          )}
        </div>

        {/* Executive Summary */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Executive Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Projects</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{filteredProjects.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">Contract Value</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                ${totals.totalContractValue.toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-600">Total Billed</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                ${totals.totalBilled.toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">Profit Margin</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {profitMargin.toFixed(1)}%
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">Pending Expenses</span>
              </div>
              <p className="text-2xl font-bold text-red-900">
                ${totals.totalPending.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Details</h2>
          <div className="space-y-4">
            {filteredProjects.map(project => (
              <div key={project.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-gray-600">{project.client}</p>
                    {project.project_code && (
                      <p className="text-sm text-gray-500">Code: {project.project_code}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(project.status)} text-white`}>
                      {project.status}
                    </Badge>
                    {pendingExpenses[project.id] > 0 && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Pending Expenses
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Contract Value</p>
                    <p className="font-semibold">${project.contract_value?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completion</p>
                    <p className="font-semibold">{project.completion_percentage || 0}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Field Leader</p>
                    <p className="font-semibold">{project.field_leader || 'Not assigned'}</p>
                  </div>
                </div>

                {project.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="w-3 h-3" />
                    {project.address}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Start: {project.start_date ? format(new Date(project.start_date), 'MMM dd, yyyy') : 'Not set'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {project.due_date ? format(new Date(project.due_date), 'MMM dd, yyyy') : 'Not set'}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Expenses</p>
                    <p className="text-sm font-medium text-red-600">
                      ${(totalExpenses[project.id] || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Billed</p>
                    <p className="text-sm font-medium text-blue-600">
                      ${(totalBilled[project.id] || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Received</p>
                    <p className="text-sm font-medium text-green-600">
                      ${(totalReceived[project.id] || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="text-sm font-medium text-orange-600">
                      ${(pendingExpenses[project.id] || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Revenue</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Contract Value:</span>
                    <span className="font-medium">${totals.totalContractValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Billed:</span>
                    <span className="font-medium">${totals.totalBilled.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Received:</span>
                    <span className="font-medium">${totals.totalReceived.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Performance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Expenses:</span>
                    <span className="font-medium text-red-600">${totals.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending Expenses:</span>
                    <span className="font-medium text-orange-600">${totals.totalPending.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Outstanding:</span>
                    <span className="font-medium text-orange-600">
                      ${(totals.totalBilled - totals.totalReceived).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit Margin:</span>
                    <span className="font-medium text-green-600">{profitMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t text-sm text-gray-500">
          <p>This report contains confidential and proprietary information.</p>
          <p>© {new Date().getFullYear()} {companyInfo?.company_name || 'Construction Company'}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
