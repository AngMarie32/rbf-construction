import { describe, it, expect } from 'bun:test';
import { projectProfit } from './projectProfit';
describe('projectProfit', () => {
  it('keeps full estimated profit while costs are under budget', () => {
    expect(projectProfit(100000, 50000, 20000).profit).toBe(20000);
  });
  it('costs over the budget reduce estimated profit', () => {
    expect(projectProfit(100000, 85000, 20000).profit).toBe(15000);
  });
  it('falls back to contract minus costs with no target', () => {
    expect(projectProfit(100000, 30000, null).profit).toBe(70000);
  });
});
