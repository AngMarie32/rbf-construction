/**
 * Payment application (G702 / G703) math, shared by the editor and the PDFs.
 * Column letters follow the G703 continuation sheet.
 */

export interface PayAppLine {
  /** sov_items.id, or "new-…" for a change-order line not saved yet */
  id: string;
  itemNumber: string;
  description: string;
  category?: string | null;
  /** C: scheduled value (original) */
  scheduledValue: number;
  /** Change orders added to this line; C on the form is scheduled + changes */
  changeOrders: number;
  /** D: work completed from previous applications */
  previous: number;
  /** E: work completed this period */
  thisPeriod: number;
  /** F: materials presently stored (not in D or E) */
  stored: number;
}

export interface PayAppSettings {
  retainageWorkPct: number;
  retainageStoredPct: number;
  /** Original contract sum (G702 line 1) */
  originalContractSum: number;
  /** Sum of payments certified on earlier applications (G702 line 7) */
  previousCertificates: number;
}

export const lineContract = (l: PayAppLine) => (Number(l.scheduledValue) || 0) + (Number(l.changeOrders) || 0);
export const lineCompleted = (l: PayAppLine) => (Number(l.previous) || 0) + (Number(l.thisPeriod) || 0) + (Number(l.stored) || 0);
export const linePercent = (l: PayAppLine) => {
  const c = lineContract(l);
  return c > 0 ? (lineCompleted(l) / c) * 100 : 0;
};
export const lineBalance = (l: PayAppLine) => lineContract(l) - lineCompleted(l);
export const lineRetainage = (l: PayAppLine, s: Pick<PayAppSettings, 'retainageWorkPct' | 'retainageStoredPct'>) =>
  (((Number(l.previous) || 0) + (Number(l.thisPeriod) || 0)) * (s.retainageWorkPct || 0)) / 100 +
  ((Number(l.stored) || 0) * (s.retainageStoredPct || 0)) / 100;
/** Billed past 100% of the line */
export const lineOverbilled = (l: PayAppLine) => lineCompleted(l) - lineContract(l) > 0.005;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function payAppTotals(lines: PayAppLine[], s: PayAppSettings) {
  const scheduled = lines.reduce((a, l) => a + (Number(l.scheduledValue) || 0), 0);
  const netChangeOrders = lines.reduce((a, l) => a + (Number(l.changeOrders) || 0), 0);
  const work = lines.reduce((a, l) => a + (Number(l.previous) || 0) + (Number(l.thisPeriod) || 0), 0);
  const stored = lines.reduce((a, l) => a + (Number(l.stored) || 0), 0);
  const thisPeriod = lines.reduce((a, l) => a + (Number(l.thisPeriod) || 0), 0);
  // Line 1: use the contract sum on the project when set, else the SOV total
  const original = s.originalContractSum > 0 ? s.originalContractSum : scheduled;
  const contractSumToDate = original + netChangeOrders; // line 3
  const completedAndStored = work + stored; // line 4
  const retainageWork = (work * (s.retainageWorkPct || 0)) / 100; // 5a
  const retainageStored = (stored * (s.retainageStoredPct || 0)) / 100; // 5b
  const totalRetainage = retainageWork + retainageStored; // 5
  const earnedLessRetainage = completedAndStored - totalRetainage; // 6
  const lessPrevious = s.previousCertificates || 0; // 7
  const currentPaymentDue = earnedLessRetainage - lessPrevious; // 8
  const balanceToFinish = contractSumToDate - earnedLessRetainage; // 9 (incl. retainage)
  const sovTotal = scheduled + netChangeOrders;
  return {
    scheduled: round2(scheduled),
    originalContractSum: round2(original),
    netChangeOrders: round2(netChangeOrders),
    contractSumToDate: round2(contractSumToDate),
    work: round2(work),
    stored: round2(stored),
    thisPeriod: round2(thisPeriod),
    completedAndStored: round2(completedAndStored),
    retainageWork: round2(retainageWork),
    retainageStored: round2(retainageStored),
    totalRetainage: round2(totalRetainage),
    earnedLessRetainage: round2(earnedLessRetainage),
    lessPrevious: round2(lessPrevious),
    currentPaymentDue: round2(currentPaymentDue),
    balanceToFinish: round2(balanceToFinish),
    percentComplete: contractSumToDate > 0 ? (completedAndStored / contractSumToDate) * 100 : 0,
    /** SOV lines don't add up to the contract sum on line 1 */
    sovMismatch: s.originalContractSum > 0 && Math.abs(scheduled - s.originalContractSum) > 0.5,
    sovTotal: round2(sovTotal),
  };
}

export type PayAppTotals = ReturnType<typeof payAppTotals>;
