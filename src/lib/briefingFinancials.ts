import { projectProfit } from '../utils/projectProfit';

interface Project { id: string; status: string; contract_value: number | null; estimated_profit?: number | null }
interface Expense { project_id: string; amount: number; status: string }
interface ChangeOrder { project_id: string; amount: number; status: string | null }
interface Billing { project_id: string; billed_amount: number; paid_amount: number; due_date: string | null }

export function briefingFinancials(projects: Project[], expenses: Expense[], changes: ChangeOrder[], billings: Billing[], today: string) {
  const projectIds = new Set(projects.map(p => p.id));
  const active = projects.filter(p => !/complete|closed|cancel/i.test(p.status));
  const summaries = active.map(p => {
    const contract = Number(p.contract_value || 0) + changes.filter(c => c.project_id === p.id && c.status?.toLowerCase() === 'approved').reduce((sum, c) => sum + Number(c.amount), 0);
    const costs = expenses.filter(e => e.project_id === p.id && e.status !== 'Rejected').reduce((sum, e) => sum + Number(e.amount), 0);
    return { projectId: p.id, contract, costs, ...projectProfit(contract, costs, p.estimated_profit) };
  });
  const receivables = billings.filter(b => projectIds.has(b.project_id) && b.due_date && b.due_date.slice(0, 10) < today && b.billed_amount - b.paid_amount > 0);
  return {
    summaries, receivables,
    contract: summaries.reduce((s, p) => s + p.contract, 0),
    spent: summaries.reduce((s, p) => s + p.costs, 0),
    profit: summaries.reduce((s, p) => s + p.profit, 0),
    pastDue: receivables.reduce((s, b) => s + b.billed_amount - b.paid_amount, 0),
  };
}