import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Calculator, Info } from 'lucide-react';
import { FilingStatus } from '@/types/tradertax';
import { estimatePayoutTax, setAsideRule } from '@/utils/traderTax/payoutCalculator';
import { DEFAULT_TAX_YEAR } from '@/utils/traderTax/taxYearConfig';
import { useSeo } from '@/hooks/useSeo';
import { pageMetaFor } from '@/utils/seo/pageMetaFor';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/**
 * Public lead magnet. It answers the question funded traders ask before any
 * other — "how much of this is actually mine?" — using the same engine that
 * runs on a real engagement, so the marketing number and the working number
 * agree.
 */
export default function PropTaxCalculator() {
  useSeo(pageMetaFor('/prop-firm-taxes/calculator'));
  const [payouts, setPayouts] = useState('45000');
  const [fees, setFees] = useState('2500');
  const [otherExpenses, setOtherExpenses] = useState('0');
  const [ownWages, setOwnWages] = useState('0');
  const [householdIncome, setHouseholdIncome] = useState('0');
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');
  const [age, setAge] = useState('32');

  const result = useMemo(
    () =>
      estimatePayoutTax({
        taxYear: DEFAULT_TAX_YEAR,
        grossPayouts: Number(payouts) || 0,
        evaluationFees: Number(fees) || 0,
        otherExpenses: Number(otherExpenses) || 0,
        ownW2Wages: Number(ownWages) || 0,
        otherHouseholdIncome: Number(householdIncome) || 0,
        filingStatus,
        age: Number(age) || 35,
      }),
    [payouts, fees, otherExpenses, ownWages, householdIncome, filingStatus, age]
  );

  const rule = setAsideRule(result.setAsidePercent);
  const hasPayouts = (Number(payouts) || 0) > 0;

  const inquiryHref =
    `/inquiry?source=calculator&prop=1&payouts=${encodeURIComponent(payouts)}` +
    `&fees=${encodeURIComponent(fees)}&filing=${encodeURIComponent(filingStatus)}`;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link to="/prop-firm-taxes" className="text-sm font-semibold tracking-tight">
            TraderTaxHQ
          </Link>
          <Button size="sm" variant="outline" asChild>
            <Link to="/prop-firm-taxes">How we work</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Funded account tax estimator
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            What do you actually keep from a funded payout?
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Prop firm payouts usually arrive on a 1099-NEC, which makes them self-employment income —
            so on top of income tax there is 15.3% self-employment tax, and nothing was withheld from
            any of it. This works out what to set aside.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* --- Inputs --------------------------------------------------- */}
          <Card className="p-6">
            <h2 className="text-base font-semibold">Your year</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rough numbers are fine. Nothing here is sent anywhere — the whole calculation runs in
              your browser.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                id="payouts"
                label="Total payouts received"
                hint="What actually reached your bank or wallet. Not account balance."
                value={payouts}
                onChange={setPayouts}
                prefix="$"
              />
              <Field
                id="fees"
                label="Evaluation, reset, and platform fees"
                hint="Everything you paid the firms, including attempts that failed."
                value={fees}
                onChange={setFees}
                prefix="$"
              />
              <Field
                id="otherExpenses"
                label="Other business expenses"
                hint="Data, charting, a dedicated machine, education."
                value={otherExpenses}
                onChange={setOtherExpenses}
                prefix="$"
              />
              <Field
                id="ownWages"
                label="Your W-2 wages this year"
                hint="From a job. Affects which tax bracket the payouts land in."
                value={ownWages}
                onChange={setOwnWages}
                prefix="$"
              />
              <Field
                id="householdIncome"
                label="Spouse or other household income"
                hint="Only if filing jointly."
                value={householdIncome}
                onChange={setHouseholdIncome}
                prefix="$"
              />
              <div className="space-y-2">
                <Label htmlFor="filing">Filing status</Label>
                <Select value={filingStatus} onValueChange={(v) => setFilingStatus(v as FilingStatus)}>
                  <SelectTrigger id="filing">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="mfj">Married filing jointly</SelectItem>
                    <SelectItem value="mfs">Married filing separately</SelectItem>
                    <SelectItem value="hoh">Head of household</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field id="age" label="Your age" value={age} onChange={setAge} />
            </div>
          </Card>

          {/* --- Results -------------------------------------------------- */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card className="overflow-hidden">
              <div className="bg-primary p-6 text-primary-foreground">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
                  Set aside from every payout
                </p>
                <p className="mt-2 text-5xl font-semibold tabular-nums">
                  {hasPayouts ? `${rule}%` : '—'}
                </p>
                <p className="mt-2 text-sm opacity-90">
                  {hasPayouts
                    ? `On a ${money(1000)} payout, that is ${money(
                        (1000 * rule) / 100
                      )} straight into a separate account.`
                    : 'Enter your payouts to see the number.'}
                </p>
                {hasPayouts && (
                  <p className="mt-2 text-xs opacity-75">
                    Your actual rate works out at {(result.setAsidePercent * 100).toFixed(1)}%. Round up
                    — it costs nothing to be over, and state tax is not in this number.
                  </p>
                )}
              </div>

              <div className="space-y-1 p-6">
                <Row label="Gross payouts" value={money(Number(payouts) || 0)} />
                <Row label="Less business expenses" value={`−${money((Number(fees) || 0) + (Number(otherExpenses) || 0))}`} />
                <Row label="Net profit" value={money(result.netProfit)} strong />
                <div className="my-3 border-t" />
                <Row label="Self-employment tax" value={money(result.selfEmploymentTax)} />
                <Row label="Federal income tax on payouts" value={money(result.incomeTaxOnPayouts)} />
                {result.qbiDeduction > 0 && (
                  <Row
                    label="Qualified business income deduction"
                    value={`−${money(result.qbiDeduction)} taxable income`}
                    muted
                  />
                )}
                <div className="my-3 border-t" />
                <Row label="Total federal tax" value={money(result.totalTaxOnPayouts)} strong />
                <Row label="You keep" value={money(result.keepFromPayouts)} strong accent />
                <div className="my-3 border-t" />
                <Row label="Quarterly estimate" value={money(result.quarterlyEstimate)} />
              </div>
            </Card>

            <Button size="lg" className="w-full" asChild>
              <Link to={inquiryHref}>
                Have us handle it
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* --- Levers ----------------------------------------------------- */}
        {hasPayouts && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Lever
              title="Your fees are deductible"
              value={money(result.feeDeductionValue)}
              body="Evaluations, resets, and platform fees are ordinary business expenses — including every attempt that failed. That is what those deductions are worth to you at this income level."
            />
            <Lever
              title="A Solo 401(k) needs no entity"
              value={money(result.soloCapacity)}
              body={`Schedule C profit is earned income, so you can open a Solo 401(k) directly — no LLC, no S-corp. Contributing the maximum would cut this year's tax by roughly ${money(
                result.soloTaxSaving
              )}.`}
            />
            <Lever
              title={result.sCorpWorthModelling ? 'An S-corp may be worth modelling' : 'You do not need an entity yet'}
              value={result.sCorpWorthModelling ? 'Worth a look' : 'Not yet'}
              body={
                result.sCorpWorthModelling
                  ? 'At this profit level, paying yourself a reasonable salary through an S corporation can shrink the self-employment tax base. It also costs payroll administration and some of the QBI deduction, so it needs modelling rather than assuming.'
                  : 'At this profit level the payroll and filing cost of an entity would exceed the self-employment tax it saves. Stay a sole proprietor and revisit when profit is consistently higher.'
              }
            />
          </div>
        )}

        {/* --- Notes and disclaimer --------------------------------------- */}
        <Card className="mt-6 p-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">What this does and does not cover</p>
              <p>
                Federal only, using {DEFAULT_TAX_YEAR} figures. It excludes state tax, credits, other
                deductions, and anything else on your return. It assumes your payouts are reported on
                a 1099-NEC and treated as self-employment income, which is the usual case — but the
                form your firm actually issues drives the answer, so check it.
              </p>
              {result.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
              <p>
                This is an estimate to help you plan, not tax advice, and no one has reviewed your
                facts. If the number matters — and at these amounts it does — have someone look at it
                properly.
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-10 rounded-xl border bg-background p-8 text-center">
          <h2 className="text-xl font-semibold">Want this filed correctly?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            We work with funded and small-scale traders all season. Flat fees, quoted before we start,
            and a straight answer if you do not need us.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to={inquiryHref}>Get a quote</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/prop-firm-taxes">See how it works</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  prefix,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          className={prefix ? 'pl-6' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  accent,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className={`text-sm ${muted ? 'text-muted-foreground' : ''}`}>{label}</span>
      <span
        className={`tabular-nums ${strong ? 'text-base font-semibold' : 'text-sm'} ${
          accent ? 'text-emerald-700' : ''
        } ${muted ? 'text-muted-foreground' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

function Lever({ title, value, body }: { title: string; value: string; body: string }) {
  return (
    <Card className="p-5">
      <Badge variant="outline" className="text-[10px]">
        {value}
      </Badge>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Card>
  );
}
