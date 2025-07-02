
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, eachMonthOfInterval, format, parseISO, differenceInDays } from 'date-fns';

export interface Task {
  id: string;
  title: string;
  progress: number;
  budget_allocation: number;
  actual_cost: number;
  start_date: string;
  end_date: string;
  status: string;
}

export interface EnhancedBurnData {
  month: string;
  plannedValue: number;        // PV - What should have been done
  earnedValue: number;         // EV - Value of work actually completed
  actualCost: number;          // AC - What was actually spent
  budgetAtCompletion: number;  // BAC - Total project budget
  estimateAtCompletion: number; // EAC - Forecasted final cost
  schedulePerformanceIndex: number; // SPI = EV/PV
  costPerformanceIndex: number;     // CPI = EV/AC
  scheduleVariance: number;    // SV = EV - PV
  costVariance: number;        // CV = EV - AC
}

export interface CategoryAnalysis {
  category: string;
  plannedBudget: number;
  actualSpend: number;
  earnedValue: number;
  variance: number;
  variancePercent: number;
  remaining: number;
  status: 'On Track' | 'At Risk' | 'Over Budget';
  scheduleImpact: number;
  hasRealData: boolean;
}

export interface MilestoneAnalysis {
  name: string;
  targetDate: string;
  actualDate?: string;
  budgetCheckpoint: number;
  actualSpent: number;
  completionPercentage: number;
  status: string;
  variance: number;
  daysDelayed: number;
}

export class EnhancedBurnAnalyticsEngine {
  static async calculateEnhancedBurnData(
    projectIds: string[],
    dateRange?: { from: Date | undefined; to: Date | undefined }
  ): Promise<EnhancedBurnData[]> {
    if (projectIds.length === 0) return [];

    try {
      // Fetch all necessary data using raw queries to avoid type issues
      const [projects, tasks, expenses] = await Promise.all([
        supabase.from('projects').select('*').in('id', projectIds),
        supabase.rpc('get_tasks_for_projects', { project_ids: projectIds }).then(
          result => result.data || [],
          () => [] // Fallback if RPC doesn't exist
        ).catch(() => []),
        supabase.from('expenses').select('*').in('project_id', projectIds)
      ]);

      const projectsData = projects.data || [];
      const tasksData = tasks || [];
      const expensesData = expenses.data || [];

      // Calculate total project budget (BAC)
      const budgetAtCompletion = projectsData.reduce((sum: number, p: any) => sum + (p.contract_value || 0), 0);

      // Generate monthly data for the past 12 months
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 11);

      const months = eachMonthOfInterval({ start: startDate, end: endDate });

      return months.map(month => {
        const monthStr = format(month, 'MMM yyyy');
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        // Calculate Planned Value (PV) - based on scheduled work
        const plannedValue = this.calculatePlannedValue(tasksData, budgetAtCompletion, monthEnd);

        // Calculate Earned Value (EV) - based on actual progress
        const earnedValue = this.calculateEarnedValue(tasksData, budgetAtCompletion, monthEnd);

        // Calculate Actual Cost (AC) - actual expenses up to this point
        const actualCost = expensesData
          .filter((exp: any) => new Date(exp.date) <= monthEnd)
          .reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);

        // Calculate performance indices
        const schedulePerformanceIndex = plannedValue > 0 ? earnedValue / plannedValue : 1;
        const costPerformanceIndex = actualCost > 0 ? earnedValue / actualCost : 1;

        // Calculate variances
        const scheduleVariance = earnedValue - plannedValue;
        const costVariance = earnedValue - actualCost;

        // Estimate at Completion (EAC)
        const estimateAtCompletion = costPerformanceIndex > 0 ? 
          budgetAtCompletion / costPerformanceIndex : budgetAtCompletion;

        return {
          month: monthStr,
          plannedValue,
          earnedValue,
          actualCost,
          budgetAtCompletion,
          estimateAtCompletion,
          schedulePerformanceIndex,
          costPerformanceIndex,
          scheduleVariance,
          costVariance
        };
      });

    } catch (error) {
      console.error('Error calculating enhanced burn data:', error);
      return [];
    }
  }

  static async calculateEnhancedCategoryAnalysis(
    projectIds: string[],
    dateRange?: { from: Date | undefined; to: Date | undefined }
  ): Promise<CategoryAnalysis[]> {
    if (projectIds.length === 0) return [];

    try {
      const [expenses, tasks] = await Promise.all([
        supabase.from('expenses').select('*').in('project_id', projectIds),
        supabase.rpc('get_tasks_for_projects', { project_ids: projectIds }).then(
          result => result.data || [],
          () => [] // Fallback if RPC doesn't exist
        ).catch(() => [])
      ]);

      const expensesData = expenses.data || [];
      const tasksData = tasks || [];

      // Group expenses by category
      const expensesByCategory: Record<string, number> = {};
      expensesData.forEach((expense: any) => {
        const category = expense.category || 'Other';
        expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(expense.amount);
      });

      // Default categories with some reasonable budget allocations
      const defaultCategories = [
        'Labor', 'Materials', 'Equipment', 'Subcontractors', 'Overhead', 'Insurance', 'Other'
      ];

      // Get all categories from expenses and defaults
      const allCategories = new Set([
        ...defaultCategories,
        ...Object.keys(expensesByCategory)
      ]);

      return Array.from(allCategories).map(category => {
        // For now, use simple estimates for planned budget
        const totalBudget = projectIds.length > 0 ? 100000 : 0; // Placeholder
        const plannedBudget = this.getCategoryBudgetEstimate(category, totalBudget);
        const actualSpend = expensesByCategory[category] || 0;

        // Calculate earned value based on task completion in this category
        const earnedValue = this.calculateCategoryEarnedValue(tasksData, category, plannedBudget);

        const variance = actualSpend - plannedBudget;
        const variancePercent = plannedBudget > 0 ? (variance / plannedBudget) * 100 : 0;
        const remaining = Math.max(0, plannedBudget - actualSpend);

        // Calculate schedule impact
        const scheduleImpact = this.calculateScheduleImpact(tasksData, category);

        // Determine status
        let status: 'On Track' | 'At Risk' | 'Over Budget';
        if (actualSpend > plannedBudget * 1.1) {
          status = 'Over Budget';
        } else if (actualSpend > plannedBudget * 0.9 || scheduleImpact > 0.1) {
          status = 'At Risk';
        } else {
          status = 'On Track';
        }

        return {
          category,
          plannedBudget,
          actualSpend,
          earnedValue,
          variance,
          variancePercent,
          remaining,
          status,
          scheduleImpact,
          hasRealData: plannedBudget > 0 || actualSpend > 0
        };
      });

    } catch (error) {
      console.error('Error calculating enhanced category analysis:', error);
      return [];
    }
  }

  static async getMilestoneAnalysis(projectIds: string[]): Promise<MilestoneAnalysis[]> {
    try {
      // Try to fetch milestones, fallback to empty array if table doesn't exist
      const milestonesResult = await supabase
        .rpc('get_project_milestones', { project_ids: projectIds })
        .then(result => result.data || [], () => [])
        .catch(() => []);

      const expenses = await supabase
        .from('expenses')
        .select('*')
        .in('project_id', projectIds);

      const expensesData = expenses.data || [];

      return (milestonesResult || []).map((milestone: any) => {
        const actualSpent = expensesData
          .filter((exp: any) => new Date(exp.date) <= new Date(milestone.target_date || new Date()))
          .reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

        const variance = actualSpent - (milestone.budget_checkpoint || 0);
        const daysDelayed = milestone.actual_date ? 
          differenceInDays(new Date(milestone.actual_date), new Date(milestone.target_date || new Date())) : 0;

        return {
          name: milestone.name || 'Unnamed Milestone',
          targetDate: milestone.target_date || new Date().toISOString(),
          actualDate: milestone.actual_date,
          budgetCheckpoint: milestone.budget_checkpoint || 0,
          actualSpent,
          completionPercentage: milestone.completion_percentage || 0,
          status: milestone.status || 'Pending',
          variance,
          daysDelayed
        };
      });

    } catch (error) {
      console.error('Error fetching milestone analysis:', error);
      return [];
    }
  }

  private static getCategoryBudgetEstimate(category: string, totalBudget: number): number {
    const percentages: Record<string, number> = {
      'Labor': 0.35,
      'Materials': 0.30,
      'Equipment': 0.15,
      'Subcontractors': 0.12,
      'Overhead': 0.05,
      'Insurance': 0.02,
      'Other': 0.01
    };
    
    return (percentages[category] || 0.05) * totalBudget;
  }

  private static calculatePlannedValue(tasks: any[], totalBudget: number, asOfDate: Date): number {
    const totalDuration = this.calculateProjectDuration(tasks);
    if (totalDuration === 0) return 0;

    // Calculate what percentage of work should be completed by this date
    const completedDuration = this.calculateCompletedDuration(tasks, asOfDate);
    const plannedProgress = Math.min(completedDuration / totalDuration, 1);

    return totalBudget * plannedProgress;
  }

  private static calculateEarnedValue(tasks: any[], totalBudget: number, asOfDate: Date): number {
    if (tasks.length === 0) return 0;
    
    // Calculate earned value based on actual task progress
    const totalProgress = tasks.reduce((sum: number, task: any) => {
      const taskWeight = (task.budget_allocation || 0) / totalBudget;
      return sum + ((task.progress || 0) / 100) * taskWeight;
    }, 0);

    return totalBudget * Math.min(totalProgress, 1);
  }

  private static calculateCategoryEarnedValue(tasks: any[], category: string, categoryBudget: number): number {
    if (tasks.length === 0) return 0;
    
    // Simplified: assume tasks are evenly distributed across categories
    const totalProgress = tasks.reduce((sum: number, task: any) => sum + (task.progress || 0), 0);
    const avgProgress = totalProgress / tasks.length;
    
    return categoryBudget * (avgProgress / 100);
  }

  private static calculateScheduleImpact(tasks: any[], category: string): number {
    if (tasks.length === 0) return 0;
    
    // Calculate how much schedule delays are impacting this category
    const delayedTasks = tasks.filter((task: any) => 
      task.status !== 'Completed' && new Date(task.end_date) < new Date()
    );
    
    return delayedTasks.length / tasks.length;
  }

  private static calculateProjectDuration(tasks: any[]): number {
    if (tasks.length === 0) return 1;
    
    const earliestStart = Math.min(...tasks.map((t: any) => new Date(t.start_date).getTime()));
    const latestEnd = Math.max(...tasks.map((t: any) => new Date(t.end_date).getTime()));
    
    return latestEnd - earliestStart;
  }

  private static calculateCompletedDuration(tasks: any[], asOfDate: Date): number {
    if (tasks.length === 0) return 0;
    
    const earliestStart = Math.min(...tasks.map((t: any) => new Date(t.start_date).getTime()));
    return Math.max(0, asOfDate.getTime() - earliestStart);
  }
}
