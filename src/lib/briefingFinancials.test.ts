import { describe, expect, test } from 'bun:test';
import { briefingFinancials } from './briefingFinancials';

describe('executive briefing financials', () => {
  const projects = [{ id: 'a', status: 'Active', contract_value: 100000, estimated_profit: 20000 }];
  test('approved changes and non-rejected costs match project profit', () => {
    const result = briefingFinancials(projects, [
      { project_id: 'a', amount: 95000, status: 'Paid' },
      { project_id: 'a', amount: 30000, status: 'Rejected' },
    ], [
      { project_id: 'a', amount: 10000, status: 'Approved' },
      { project_id: 'a', amount: 50000, status: 'Pending' },
    ], [], '2026-11-26');
    expect(result.contract).toBe(110000);
    expect(result.spent).toBe(95000);
    expect(result.profit).toBe(15000);
    expect(result.summaries[0].overBudget).toBe(5000);
  });
  test('past-due balances include closed projects and retain full precision', () => {
    const result = briefingFinancials([...projects, { id: 'b', status: 'Closed', contract_value: 100, estimated_profit: 0 }], [], [], [
      { project_id: 'b', billed_amount: 100.255, paid_amount: 20, due_date: '2026-11-25' },
      { project_id: 'a', billed_amount: 50, paid_amount: 0, due_date: '2026-11-26' },
      { project_id: 'other-company', billed_amount: 900, paid_amount: 0, due_date: '2026-11-01' },
    ], '2026-11-26');
    expect(result.pastDue).toBe(80.255);
    expect(result.receivables).toHaveLength(1);
    expect(result.summaries).toHaveLength(1);
  });
});