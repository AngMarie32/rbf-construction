import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

export interface AdvancedBurnData {
  month: string;
  plannedSpending: number;
  actualSpending: number;
  forecastedSpending: number;
  budgetThreshold: number;
  variance: number;
  variancePercentage: number;
  confidence: number;
}

export interface CategoryAnalysis {
  category: string;
  categoryId: string;
  plannedBudget: number;
  actualSpend: number;
  variance: number;
  variancePercent: number;
  remaining: number;
  status: 'On Track' | 'At Risk' | 'Over Budget';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  trend: 'improving' | 'stable' | 'declining';
  forecastedTotal: number;
  alerts: string[];
  hasRealData: boolean;
}

export interface RiskAssessment {
  overallRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  riskFactors: string[];
  recommendations: string[];
  probabilityOfOverrun: number;
  estimatedOverrunAmount: number;
}

export class BurnAnalyticsEngine {
  static async calculateAdvancedBurnData(
    projectIds: string[],
    dateRange?: { from: Date; to: Date }
  ): Promise<AdvancedBurnData[]> {
    if (projectIds.length === 0) return [];

    const projects = await this.getProjectsData(projectIds);
    const expenses = await this.getExpensesData(projectIds, dateRange);
    const billing = await this.getBillingData(projectIds, dateRange);
    const forecasts = await this.getForecastData(projectIds);

    const totalBudget = projects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const months = this.getMonthsInRange(dateRange);

    return months.map((month, index) => {
      const monthlyPlanned = totalBudget / 12;
      const cumulativePlanned = monthlyPlanned * (index + 1);
      
      const actualToDate = this.calculateActualSpendToDate(month, expenses, billing);
      const forecast = this.getForecastForMonth(month, forecasts, actualToDate, cumulativePlanned);
      
      const variance = actualToDate - cumulativePlanned;
      const variancePercentage = cumulativePlanned > 0 ? (variance / cumulativePlanned) * 100 : 0;

      return {
        month: format(month, 'MMM'),
        plannedSpending: cumulativePlanned,
        actualSpending: actualToDate,
        forecastedSpending: forecast.predicted,
        budgetThreshold: totalBudget,
        variance,
        variancePercentage,
        confidence: forecast.confidence
      };
    });
  }

  static async calculateCategoryAnalysis(
    projectIds: string[],
    dateRange?: { from: Date; to: Date }
  ): Promise<CategoryAnalysis[]> {
    if (projectIds.length === 0) return [];

    const categories = await this.getExpenseCategories();
    const expenses = await this.getExpensesData(projectIds, dateRange);
    const billing = await this.getBillingData(projectIds, dateRange);
    const variances = await this.getBudgetVariances(projectIds, dateRange);
    const projects = await this.getProjectsData(projectIds);

    const totalBudget = projects.reduce((sum, p) => sum + (p.contract_value || 0), 0);

    // Check if we have actual budget variance data for these projects
    const hasVarianceData = variances.length > 0;

    // Get actual expenses by category
    const expensesByCategory = this.groupExpensesByCategory(expenses);
    const billingByCategory = this.groupBillingByCategory(billing);

    return categories.map(category => {
      // Check if this category has real budget allocation data
      const categoryVariances = variances.filter(v => v.category_id === category.id);
      const hasRealBudgetData = categoryVariances.length > 0;

      // Calculate actual spending for this category
      const categoryExpenses = expensesByCategory[category.name] || 0;
      const categoryBilling = billingByCategory[category.name] || 0;
      const actualSpend = categoryExpenses + categoryBilling;

      // Only show category if it has real data (either budget allocation or actual spending)
      if (!hasRealBudgetData && actualSpend === 0) {
        return null;
      }

      // Use real planned budget if available, otherwise show only actual data
      const plannedBudget = hasRealBudgetData 
        ? categoryVariances.reduce((sum, v) => sum + v.planned_amount, 0)
        : 0;

      const variance = actualSpend - plannedBudget;
      const variancePercent = plannedBudget > 0 ? (variance / plannedBudget) * 100 : 0;

      const trend = this.calculateTrend(categoryVariances);
      const riskLevel = this.assessRiskLevel(variancePercent, trend, hasRealBudgetData);
      const status = this.determineStatus(riskLevel);

      return {
        category: category.name,
        categoryId: category.id,
        plannedBudget,
        actualSpend,
        variance,
        variancePercent,
        remaining: Math.max(0, plannedBudget - actualSpend),
        status,
        riskLevel,
        trend,
        forecastedTotal: this.forecastCategoryTotal(actualSpend, plannedBudget, trend),
        alerts: this.generateCategoryAlerts(category.name, variancePercent, riskLevel, hasRealBudgetData),
        hasRealData: hasRealBudgetData || actualSpend > 0
      };
    }).filter(Boolean) as CategoryAnalysis[];
  }

  private static groupExpensesByCategory(expenses: any[]): Record<string, number> {
    return expenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + (expense.amount || 0);
      return acc;
    }, {});
  }

  private static groupBillingByCategory(billing: any[]): Record<string, number> {
    // For now, we'll categorize billing as Labor since most billing is labor-related
    // This could be enhanced with better categorization logic
    return billing.reduce((acc, bill) => {
      acc['Labor'] = (acc['Labor'] || 0) + (bill.billed_amount || 0);
      return acc;
    }, {});
  }

  static async generateRiskAssessment(
    projectIds: string[],
    categoryAnalysis: CategoryAnalysis[]
  ): Promise<RiskAssessment> {
    const realDataCategories = categoryAnalysis.filter(c => c.hasRealData);
    const overBudgetCategories = realDataCategories.filter(c => c.status === 'Over Budget');
    const atRiskCategories = realDataCategories.filter(c => c.status === 'At Risk');

    const overallRisk = this.calculateOverallRisk(realDataCategories);
    const riskFactors = this.identifyRiskFactors(realDataCategories);
    const recommendations = this.generateRecommendations(realDataCategories, categoryAnalysis.length === 0);
    
    const probabilityOfOverrun = this.calculateOverrunProbability(realDataCategories);
    const estimatedOverrunAmount = this.estimateOverrunAmount(realDataCategories);

    return {
      overallRisk,
      riskFactors,
      recommendations,
      probabilityOfOverrun,
      estimatedOverrunAmount
    };
  }

  private static async getProjectsData(projectIds: string[]) {
    const { data, error } = await supabase
      .from('projects')
      .select('id, contract_value, start_date, due_date')
      .in('id', projectIds);
    
    if (error) throw error;
    return data || [];
  }

  private static async getExpensesData(projectIds: string[], dateRange?: { from: Date; to: Date }) {
    let query = supabase
      .from('expenses')
      .select('project_id, amount, date, category, status')
      .in('project_id', projectIds)
      .in('status', ['Approved', 'Paid']);

    if (dateRange?.from && dateRange?.to) {
      query = query.gte('date', format(dateRange.from, 'yyyy-MM-dd'))
                   .lte('date', format(dateRange.to, 'yyyy-MM-dd'));
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private static async getBillingData(projectIds: string[], dateRange?: { from: Date; to: Date }) {
    let query = supabase
      .from('project_billing')
      .select('project_id, billed_amount, billing_period_start, billing_period_end')
      .in('project_id', projectIds);

    if (dateRange?.from && dateRange?.to) {
      query = query.gte('billing_period_end', format(dateRange.from, 'yyyy-MM-dd'))
                   .lte('billing_period_start', format(dateRange.to, 'yyyy-MM-dd'));
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private static async getForecastData(projectIds: string[]) {
    const { data, error } = await supabase
      .from('budget_forecasts')
      .select('*')
      .in('project_id', projectIds)
      .order('forecast_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private static async getExpenseCategories() {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  private static async getBudgetVariances(projectIds: string[], dateRange?: { from: Date; to: Date }) {
    let query = supabase
      .from('budget_variances')
      .select('*')
      .in('project_id', projectIds);

    if (dateRange?.from && dateRange?.to) {
      query = query.gte('period_end', format(dateRange.from, 'yyyy-MM-dd'))
                   .lte('period_start', format(dateRange.to, 'yyyy-MM-dd'));
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private static getMonthsInRange(dateRange?: { from: Date; to: Date }) {
    const currentYear = new Date().getFullYear();
    const startDate = dateRange?.from || new Date(currentYear, 0, 1);
    const endDate = dateRange?.to || new Date(currentYear, 11, 31);

    return eachMonthOfInterval({ start: startDate, end: endDate });
  }

  private static calculateActualSpendToDate(month: Date, expenses: any[], billing: any[]) {
    const expenseSpend = expenses
      .filter(e => new Date(e.date) <= month)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const billingSpend = billing
      .filter(b => new Date(b.billing_period_end) <= month)
      .reduce((sum, b) => sum + (b.billed_amount || 0), 0);

    return expenseSpend + billingSpend;
  }

  private static getForecastForMonth(month: Date, forecasts: any[], actual: number, planned: number) {
    const monthForecast = forecasts.find(f => 
      format(new Date(f.forecast_month), 'yyyy-MM') === format(month, 'yyyy-MM')
    );

    if (monthForecast) {
      return {
        predicted: monthForecast.predicted_spend,
        confidence: monthForecast.confidence_level
      };
    }

    // Simple trend-based forecast if no ML forecast available
    const trend = actual / planned;
    return {
      predicted: planned * Math.max(0.8, Math.min(1.5, trend)),
      confidence: 0.6
    };
  }

  private static calculatePlannedBudget(categoryName: string, totalBudget: number) {
    const allocations: Record<string, number> = {
      'Labor': 0.35,
      'Materials': 0.30,
      'Equipment': 0.20,
      'Subcontractors': 0.10,
      'Overhead': 0.05
    };
    return totalBudget * (allocations[categoryName] || 0.1);
  }

  private static calculateActualSpend(expenses: any[], billing: any[]) {
    const expenseTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const billingTotal = billing.reduce((sum, b) => sum + (b.billed_amount || 0), 0);
    return expenseTotal + billingTotal;
  }

  private static categorizeBilling(billing: any): string {
    // Simple categorization logic - could be enhanced with ML
    return 'Labor'; // Default categorization
  }

  private static calculateTrend(variances: any[]): 'improving' | 'stable' | 'declining' {
    if (variances.length < 2) return 'stable';
    
    const recent = variances.slice(-3);
    const avgRecentVariance = recent.reduce((sum, v) => sum + v.variance_percentage, 0) / recent.length;
    
    if (avgRecentVariance > 10) return 'declining';
    if (avgRecentVariance < -5) return 'improving';
    return 'stable';
  }

  private static assessRiskLevel(variancePercent: number, trend: string, hasRealData: boolean): 'Low' | 'Medium' | 'High' | 'Critical' {
    if (!hasRealData) return 'Low';
    
    const absVariance = Math.abs(variancePercent);
    
    if (absVariance > 25 || (absVariance > 15 && trend === 'declining')) return 'Critical';
    if (absVariance > 15 || (absVariance > 10 && trend === 'declining')) return 'High';
    if (absVariance > 10 || trend === 'declining') return 'Medium';
    return 'Low';
  }

  private static determineStatus(riskLevel: string): 'On Track' | 'At Risk' | 'Over Budget' {
    if (riskLevel === 'Critical') return 'Over Budget';
    if (riskLevel === 'High' || riskLevel === 'Medium') return 'At Risk';
    return 'On Track';
  }

  private static forecastCategoryTotal(actual: number, planned: number, trend: string): number {
    const trendMultiplier = trend === 'declining' ? 1.2 : trend === 'improving' ? 0.9 : 1.0;
    return Math.max(actual, planned * trendMultiplier);
  }

  private static generateCategoryAlerts(category: string, variancePercent: number, riskLevel: string, hasRealData: boolean): string[] {
    const alerts: string[] = [];
    
    if (!hasRealData) {
      alerts.push('No budget allocation set for this category');
      return alerts;
    }
    
    if (Math.abs(variancePercent) > 15) {
      alerts.push(`${variancePercent > 0 ? 'Over' : 'Under'} budget by ${Math.abs(variancePercent).toFixed(1)}%`);
    }
    
    if (riskLevel === 'Critical') {
      alerts.push('Immediate attention required');
    } else if (riskLevel === 'High') {
      alerts.push('Monitor closely');
    }
    
    return alerts;
  }

  private static calculateOverallRisk(categories: CategoryAnalysis[]): 'Low' | 'Medium' | 'High' | 'Critical' {
    const criticalCount = categories.filter(c => c.riskLevel === 'Critical').length;
    const highCount = categories.filter(c => c.riskLevel === 'High').length;
    
    if (criticalCount > 0) return 'Critical';
    if (highCount > 1) return 'High';
    if (highCount > 0) return 'Medium';
    return 'Low';
  }

  private static identifyRiskFactors(categories: CategoryAnalysis[]): string[] {
    const factors: string[] = [];
    
    categories.forEach(cat => {
      if (cat.variancePercent > 20) {
        factors.push(`${cat.category} significantly over budget`);
      }
      if (cat.trend === 'declining') {
        factors.push(`${cat.category} showing declining performance`);
      }
    });
    
    return factors;
  }

  private static generateRecommendations(categories: CategoryAnalysis[], hasNoData: boolean): string[] {
    const recommendations: string[] = [];
    
    if (hasNoData) {
      recommendations.push('Set up detailed budget allocations by category for better tracking');
      recommendations.push('Enter planned spending amounts for each cost category');
      return recommendations;
    }
    
    categories.forEach(cat => {
      if (cat.status === 'Over Budget') {
        recommendations.push(`Implement cost controls for ${cat.category}`);
      }
      if (cat.trend === 'declining') {
        recommendations.push(`Review ${cat.category} processes and suppliers`);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring spending patterns');
      recommendations.push('Regular budget reviews recommended');
    }
    
    return recommendations;
  }

  private static calculateOverrunProbability(categories: CategoryAnalysis[]): number {
    const totalVariance = categories.reduce((sum, c) => sum + Math.abs(c.variancePercent), 0);
    const avgVariance = totalVariance / categories.length;
    
    return Math.min(0.95, Math.max(0.05, avgVariance / 100));
  }

  private static estimateOverrunAmount(categories: CategoryAnalysis[]): number {
    return categories.reduce((sum, c) => {
      if (c.variance > 0) {
        return sum + (c.forecastedTotal - c.plannedBudget);
      }
      return sum;
    }, 0);
  }
}
