/**
 * Profit driven by the estimated profit entered on the project.
 * Cost budget = contract (incl. approved COs) − estimated profit.
 * Costs above the cost budget eat into the estimated profit.
 * With no estimated profit entered, falls back to contract − costs.
 */
export function projectProfit(contract: number, costs: number, estimatedProfit?: number | null) {
  if (estimatedProfit == null || isNaN(Number(estimatedProfit))) {
    return { hasTarget: false, costBudget: contract, overBudget: 0, profit: contract - costs };
  }
  const target = Number(estimatedProfit);
  const costBudget = contract - target;
  const overBudget = Math.max(0, costs - costBudget);
  return { hasTarget: true, costBudget, overBudget, profit: target - overBudget };
}
