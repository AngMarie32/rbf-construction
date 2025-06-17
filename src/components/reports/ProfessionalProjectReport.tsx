
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Calendar, DollarSign, User, Building, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

interface ProfessionalProjectReportProps {
  projects: Project[];
  totalExpenses: Record<string, number>;
  totalBilled: Record<string, number>;
  totalReceived: Record<string, number>;
}

export const ProfessionalProjectReport: React.FC<ProfessionalProjectReportProps> = ({
  projects,
  totalExpenses,
  totalBilled,
  totalReceived
}) => {
  const [selectedFieldLeader, setSelectedFieldLeader] = useState<string>('all');
  const [fieldLeaders, setFieldLeaders] = useState<string[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>(projects);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    // Extract unique field leaders
    const leaders = [...new Set(projects.map(p => p.field_leader).filter(Boolean))] as string[];
    setFieldLeaders(leaders);
    
    // Fetch company information
    fetchCompanyInfo();
  }, [projects]);

  useEffect(() => {
    // Filter projects by field leader
    if (selectedFieldLeader === 'all') {
      setFilteredProjects(projects);
    } else {
      setFilteredProjects(projects.filter(p => p.field_leader === selectedFieldLeader));
    }
  }, [selectedFieldLeader, projects]);

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

  const calculateTotals = () => {
    return filteredProjects.reduce((acc, project) => ({
      totalContractValue: acc.totalContractValue + (project.contract_value || 0),
      totalExpenses: acc.totalExpenses + (totalExpenses[project.id] || 0),
      totalBilled: acc.totalBilled + (totalBilled[project.id] || 0),
      totalReceived: acc.totalReceived + (totalReceived[project.id] || 0),
    }), {
      totalContractValue: 0,
      totalExpenses: 0,
      totalBilled: 0,
      totalReceived: 0,
    });
  };

  const totals = calculateTotals();
  const profitMargin = totals.totalContractValue > 0 
    ? ((totals.totalReceived - totals.totalExpenses) / totals.totalContractValue) * 100 
    : 0;

  const exportToPDF = async () => {
    const element = document.getElementById('professional-report');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = selectedFieldLeader === 'all' 
        ? 'project-report-all.pdf'
        : `project-report-${selectedFieldLeader.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      
      pdf.save(fileName);
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Professional Project Report
            </CardTitle>
            <div className="flex items-center gap-4">
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
              <Button onClick={exportToPDF} className="gap-2">
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Professional Report */}
      <div id="professional-report" className="bg-white p-8 space-y-8">
        {/* Header */}
        <div className="text-center border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {companyInfo?.company_name || 'Construction Company'}
          </h1>
          <p className="text-gray-600 text-lg">Project Performance Report</p>
          <p className="text-sm text-gray-500 mt-2">
            Generated on {format(new Date(), 'MMMM dd, yyyy')}
          </p>
          {selectedFieldLeader !== 'all' && (
            <p className="text-sm text-blue-600 mt-1">
              Field Leader: {selectedFieldLeader}
            </p>
          )}
        </div>

        {/* Executive Summary */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Executive Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <Badge className={`${getStatusColor(project.status)} text-white`}>
                    {project.status}
                  </Badge>
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

                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
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
