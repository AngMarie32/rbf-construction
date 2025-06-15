
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { CategoryAnalysis, AdvancedBurnData, RiskAssessment } from './burnAnalytics';

export interface ExportOptions {
  includeCharts: boolean;
  includeRiskAssessment: boolean;
  includeRecommendations: boolean;
  includeForecasts: boolean;
  customLogo?: string;
  reportTitle?: string;
}

export class AdvancedExportManager {
  static async generateExecutiveSummaryPDF(
    burnData: AdvancedBurnData[],
    categoryAnalysis: CategoryAnalysis[],
    riskAssessment: RiskAssessment,
    projectNames: string[],
    options: ExportOptions = {
      includeCharts: true,
      includeRiskAssessment: true,
      includeRecommendations: true,
      includeForecasts: true
    }
  ): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(options.reportTitle || 'Executive Burn Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy')}`, pageWidth / 2, yPosition, { align: 'center' });
    doc.text(`Projects: ${projectNames.join(', ')}`, pageWidth / 2, yPosition + 10, { align: 'center' });

    yPosition += 30;

    // Executive Summary Section
    this.addSection(doc, 'Executive Summary', yPosition);
    yPosition += 15;

    const totalBudget = categoryAnalysis.reduce((sum, c) => sum + c.plannedBudget, 0);
    const totalActual = categoryAnalysis.reduce((sum, c) => sum + c.actualSpend, 0);
    const totalVariance = totalActual - totalBudget;
    const variancePercent = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;

    const summaryData = [
      ['Total Budget', `$${totalBudget.toLocaleString()}`],
      ['Actual Spend', `$${totalActual.toLocaleString()}`],
      ['Variance', `${totalVariance >= 0 ? '+' : ''}$${totalVariance.toLocaleString()} (${variancePercent.toFixed(1)}%)`],
      ['Overall Risk', riskAssessment.overallRisk],
      ['Overrun Probability', `${(riskAssessment.probabilityOfOverrun * 100).toFixed(1)}%`]
    ];

    yPosition = this.addTable(doc, summaryData, yPosition);
    yPosition += 20;

    // Risk Assessment Section
    if (options.includeRiskAssessment) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      this.addSection(doc, 'Risk Assessment', yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.text('Risk Factors:', 20, yPosition);
      yPosition += 8;

      riskAssessment.riskFactors.forEach(factor => {
        doc.text(`• ${factor}`, 25, yPosition);
        yPosition += 6;
      });

      yPosition += 10;
    }

    // Recommendations Section
    if (options.includeRecommendations) {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      this.addSection(doc, 'Recommendations', yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      riskAssessment.recommendations.forEach(rec => {
        doc.text(`• ${rec}`, 20, yPosition);
        yPosition += 6;
      });

      yPosition += 15;
    }

    // Category Analysis Section
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }

    this.addSection(doc, 'Category Analysis', yPosition);
    yPosition += 15;

    const categoryData = categoryAnalysis.map(cat => [
      cat.category,
      `$${cat.plannedBudget.toLocaleString()}`,
      `$${cat.actualSpend.toLocaleString()}`,
      `${cat.variancePercent >= 0 ? '+' : ''}${cat.variancePercent.toFixed(1)}%`,
      cat.status
    ]);

    categoryData.unshift(['Category', 'Planned', 'Actual', 'Variance %', 'Status']);
    this.addTable(doc, categoryData, yPosition);

    // Save the PDF
    doc.save(`burn-analysis-executive-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  static exportDetailedExcel(
    burnData: AdvancedBurnData[],
    categoryAnalysis: CategoryAnalysis[],
    riskAssessment: RiskAssessment,
    projectNames: string[]
  ): void {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Burn Analysis Report'],
      ['Generated:', format(new Date(), 'MMMM dd, yyyy')],
      ['Projects:', projectNames.join(', ')],
      [''],
      ['EXECUTIVE SUMMARY'],
      ['Total Budget', categoryAnalysis.reduce((sum, c) => sum + c.plannedBudget, 0)],
      ['Actual Spend', categoryAnalysis.reduce((sum, c) => sum + c.actualSpend, 0)],
      ['Total Variance', categoryAnalysis.reduce((sum, c) => sum + c.variance, 0)],
      ['Overall Risk', riskAssessment.overallRisk],
      ['Overrun Probability', riskAssessment.probabilityOfOverrun],
      ['Estimated Overrun', riskAssessment.estimatedOverrunAmount],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Burn Data Sheet
    const burnDataFormatted = burnData.map(data => ({
      Month: data.month,
      'Planned Spending': data.plannedSpending,
      'Actual Spending': data.actualSpending,
      'Forecasted Spending': data.forecastedSpending,
      'Variance': data.variance,
      'Variance %': data.variancePercentage,
      'Confidence': data.confidence
    }));

    const burnSheet = XLSX.utils.json_to_sheet(burnDataFormatted);
    XLSX.utils.book_append_sheet(workbook, burnSheet, 'Burn Data');

    // Category Analysis Sheet
    const categoryDataFormatted = categoryAnalysis.map(cat => ({
      Category: cat.category,
      'Planned Budget': cat.plannedBudget,
      'Actual Spend': cat.actualSpend,
      'Variance': cat.variance,
      'Variance %': cat.variancePercent,
      'Remaining': cat.remaining,
      'Status': cat.status,
      'Risk Level': cat.riskLevel,
      'Trend': cat.trend,
      'Forecasted Total': cat.forecastedTotal,
      'Alerts': cat.alerts.join('; ')
    }));

    const categorySheet = XLSX.utils.json_to_sheet(categoryDataFormatted);
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Category Analysis');

    // Risk Assessment Sheet
    const riskData = [
      ['RISK ASSESSMENT'],
      ['Overall Risk Level', riskAssessment.overallRisk],
      ['Probability of Overrun', riskAssessment.probabilityOfOverrun],
      ['Estimated Overrun Amount', riskAssessment.estimatedOverrunAmount],
      [''],
      ['RISK FACTORS'],
      ...riskAssessment.riskFactors.map(factor => [factor]),
      [''],
      ['RECOMMENDATIONS'],
      ...riskAssessment.recommendations.map(rec => [rec])
    ];

    const riskSheet = XLSX.utils.aoa_to_sheet(riskData);
    XLSX.utils.book_append_sheet(workbook, riskSheet, 'Risk Assessment');

    // Save the workbook
    XLSX.writeFile(workbook, `burn-analysis-detailed-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  static generateAutomatedEmailReport(
    burnData: AdvancedBurnData[],
    categoryAnalysis: CategoryAnalysis[],
    riskAssessment: RiskAssessment,
    projectNames: string[]
  ): string {
    const totalBudget = categoryAnalysis.reduce((sum, c) => sum + c.plannedBudget, 0);
    const totalActual = categoryAnalysis.reduce((sum, c) => sum + c.actualSpend, 0);
    const variancePercent = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0;

    const criticalCategories = categoryAnalysis.filter(c => c.riskLevel === 'Critical');
    const atRiskCategories = categoryAnalysis.filter(c => c.riskLevel === 'High');

    return `
      <h2>Weekly Burn Analysis Report</h2>
      <p><strong>Projects:</strong> ${projectNames.join(', ')}</p>
      <p><strong>Report Date:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>

      <h3>Executive Summary</h3>
      <ul>
        <li><strong>Total Budget:</strong> $${totalBudget.toLocaleString()}</li>
        <li><strong>Actual Spend:</strong> $${totalActual.toLocaleString()}</li>
        <li><strong>Variance:</strong> ${variancePercent >= 0 ? '+' : ''}${variancePercent.toFixed(1)}%</li>
        <li><strong>Overall Risk:</strong> ${riskAssessment.overallRisk}</li>
      </ul>

      ${criticalCategories.length > 0 ? `
        <h3>🚨 Critical Issues</h3>
        <ul>
          ${criticalCategories.map(cat => `
            <li><strong>${cat.category}:</strong> ${cat.variancePercent.toFixed(1)}% variance (${cat.status})</li>
          `).join('')}
        </ul>
      ` : ''}

      ${atRiskCategories.length > 0 ? `
        <h3>⚠️ At Risk Categories</h3>
        <ul>
          ${atRiskCategories.map(cat => `
            <li><strong>${cat.category}:</strong> ${cat.variancePercent.toFixed(1)}% variance</li>
          `).join('')}
        </ul>
      ` : ''}

      <h3>Key Recommendations</h3>
      <ul>
        ${riskAssessment.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    `;
  }

  private static addSection(doc: jsPDF, title: string, y: number): void {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, y);
    doc.line(20, y + 2, 190, y + 2);
  }

  private static addTable(doc: jsPDF, data: string[][], startY: number): number {
    const rowHeight = 8;
    const colWidth = 35;
    let currentY = startY;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    data.forEach((row, index) => {
      row.forEach((cell, colIndex) => {
        const x = 20 + (colIndex * colWidth);
        doc.text(cell, x, currentY);
      });
      currentY += rowHeight;
    });

    return currentY;
  }
}
