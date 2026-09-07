// QuickBooks Desktop export helpers.
// Produces tab-delimited .IIF files (importable via File > Utilities > Import > IIF Files)
// and plain CSV files for review or spreadsheet-based import.

export interface QbdRow {
  date: string; // ISO yyyy-mm-dd
  name: string; // vendor / customer
  memo: string;
  docNum: string;
  amount: number;
  account: string; // expense or income account
  class?: string;
}

export const QBD_DEFAULTS = {
  apAccount: 'Accounts Payable',
  arAccount: 'Accounts Receivable',
  bankAccount: 'Checking',
  incomeAccount: 'Construction Income',
  expenseAccount: 'Job Expenses',
  loanAccount: 'Notes Receivable',
  interestIncomeAccount: 'Interest Income',
};

export const fmtDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return '';
  return `${m}/${d}/${y}`;
};

const amt = (n: number) => (Number(n) || 0).toFixed(2);

const clean = (s: unknown) =>
  String(s ?? '')
    .replace(/[\t\r\n]+/g, ' ')
    .trim();

const TRNS_HEADER = [
  '!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO',
  '!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO',
  '!ENDTRNS',
].join('\n');

function transaction(
  type: string,
  headerAccount: string,
  row: QbdRow,
  headerAmount: number,
  splitAmount: number,
) {
  const d = fmtDate(row.date);
  const name = clean(row.name);
  const memo = clean(row.memo);
  const doc = clean(row.docNum);
  const cls = clean(row.class);
  return [
    `TRNS\t\t${type}\t${d}\t${headerAccount}\t${name}\t${cls}\t${amt(headerAmount)}\t${doc}\t${memo}`,
    `SPL\t\t${type}\t${d}\t${clean(row.account)}\t${name}\t${cls}\t${amt(splitAmount)}\t${doc}\t${memo}`,
    'ENDTRNS',
  ].join('\n');
}

/** Bills (money owed to vendors) — expenses and repair costs. */
export function buildBillsIif(rows: QbdRow[], apAccount = QBD_DEFAULTS.apAccount) {
  const body = rows.map((r) => transaction('BILL', apAccount, r, -r.amount, r.amount));
  return [TRNS_HEADER, ...body].join('\n') + '\n';
}

/** Invoices (money owed to you by customers). */
export function buildInvoicesIif(rows: QbdRow[], arAccount = QBD_DEFAULTS.arAccount) {
  const body = rows.map((r) => transaction('INVOICE', arAccount, r, r.amount, -r.amount));
  return [TRNS_HEADER, ...body].join('\n') + '\n';
}

/** Deposits (money received) — loan payments collected. */
export function buildDepositsIif(rows: QbdRow[], bankAccount = QBD_DEFAULTS.bankAccount) {
  const body = rows.map((r) => transaction('DEPOSIT', bankAccount, r, r.amount, -r.amount));
  return [TRNS_HEADER, ...body].join('\n') + '\n';
}

/** Vendor / customer name lists so QuickBooks doesn't create blanks on import. */
export function buildNamesIif(names: string[], type: 'VEND' | 'CUST') {
  const unique = Array.from(new Set(names.map(clean).filter(Boolean))).sort();
  const header = type === 'VEND' ? '!VEND\tNAME\tPRINTAS' : '!CUST\tNAME\tPRINTAS';
  const body = unique.map((n) => `${type}\t${n}\t${n}`);
  return [header, ...body].join('\n') + '\n';
}

export function buildCsv(rows: QbdRow[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Date', 'Name', 'Account', 'Class', 'Ref No', 'Memo', 'Amount'];
  const lines = rows.map((r) =>
    [fmtDate(r.date), r.name, r.account, r.class || '', r.docNum, r.memo, amt(r.amount)]
      .map(esc)
      .join(','),
  );
  return [head.map(esc).join(','), ...lines].join('\n') + '\n';
}

export function downloadFile(filename: string, contents: string, mime = 'text/plain') {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
