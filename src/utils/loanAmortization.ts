/**
 * Loan amortization helpers.
 * Money is computed at full precision and only rounded to 3 decimals on storage.
 */

export interface AmortizationRow {
  payment_number: number;
  due_date: string; // yyyy-mm-dd
  scheduled_amount: number;
  principal_amount: number;
  interest_amount: number;
  balance_after: number;
}

export interface LoanTerms {
  principal: number;
  annualRatePct: number;
  termMonths: number;
  startDate: string; // yyyy-mm-dd, date of first payment month
  paymentDay: number; // 1-31
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Standard level payment (monthly). Handles 0% interest. */
export function monthlyPayment(principal: number, annualRatePct: number, termMonths: number) {
  const n = Math.max(1, Math.floor(termMonths));
  const i = (Number(annualRatePct) || 0) / 100 / 12;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

function dueDateFor(startDate: string, monthOffset: number, paymentDay: number) {
  const [y, m] = startDate.split('-').map(Number);
  const base = new Date(Date.UTC(y, (m - 1) + monthOffset, 1));
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(Math.max(1, Math.floor(paymentDay) || 1), lastDay);
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), day));
  return localDateISO(d);
}

export function buildAmortization(terms: LoanTerms): AmortizationRow[] {
  const principal = Number(terms.principal) || 0;
  const n = Math.max(1, Math.floor(terms.termMonths) || 1);
  const i = (Number(terms.annualRatePct) || 0) / 100 / 12;
  const pmt = monthlyPayment(principal, terms.annualRatePct, n);

  const rows: AmortizationRow[] = [];
  let balance = principal;

  for (let k = 1; k <= n; k++) {
    const interest = balance * i;
    let principalPart = pmt - interest;
    let payment = pmt;

    if (k === n || principalPart >= balance) {
      principalPart = balance;
      payment = balance + interest;
    }

    balance = balance - principalPart;

    rows.push({
      payment_number: k,
      due_date: dueDateFor(terms.startDate, k - 1, terms.paymentDay),
      scheduled_amount: r3(payment),
      principal_amount: r3(principalPart),
      interest_amount: r3(interest),
      balance_after: r3(Math.max(0, balance)),
    });

    if (balance <= 0) break;
  }

  return rows;
}

export function summarize(rows: AmortizationRow[]) {
  return rows.reduce(
    (a, r) => {
      a.totalPayments += r.scheduled_amount;
      a.totalPrincipal += r.principal_amount;
      a.totalInterest += r.interest_amount;
      return a;
    },
    { totalPayments: 0, totalPrincipal: 0, totalInterest: 0 }
  );
}
