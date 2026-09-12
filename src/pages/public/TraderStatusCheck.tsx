import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Info, Scale } from 'lucide-react';
import { FilingStatus, IntakeAnswers } from '@/types/tradertax';
import { assessTraderTaxStatus, ttsTierLabel } from '@/utils/traderTax/ttsAnalysis';
import { calculateLossUsability } from '@/utils/traderTax/lossCalculator';
import { DEFAULT_TAX_YEAR } from '@/utils/traderTax/taxYearConfig';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/**
 * Lead magnet for the self-directed side of the practice. It answers the two
 * questions a small-scale trader actually has, and it answers them honestly:
 * most people do not qualify for trader tax status, and trader status does not
 * rescue a loss that is already trapped in the capital bucket.
 *
 * Telling someone the truth here costs one engagement and earns the referral.
 */
export default function TraderStatusCheck() {
  const [tradingDays, setTradingDays] = useState('90');
  const [totalTrades, setTotalTrades] = useState('420');
  const [holdingDays, setHoldingDays] = useState('6');
  const [weeklyHours, setWeeklyHours] = useState('12');
  const [monthsActive, setMonthsActive] = useState('9');
  const [otherJob, setOtherJob] = useState(true);
  const [accountEquity, setAccountEquity] = useState('30000');
  const [dedicatedSetup, setDedicatedSetup] = useState(false);

  const [netResult, setNetResult] = useState('-24000');
  const [washSales, setWashSales] = useState('0');
  const [carryforward, setCarryforward] = useState('0');
  const [iraReplacement, setIraReplacement] = useState(false);
  const [otherIncome, setOtherIncome] = useState('80000');
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');

  const tts = useMemo(() => {
    const answers: IntakeAnswers = {
      trading_days: Number(tradingDays) || 0,
      total_trades: Number(totalTrades) || 0,
      avg_holding_days: Number(holdingDays) || 0,
      weekly_hours: Number(weeklyHours) || 0,
      months_active: Number(monthsActive) || 0,
      has_other_fulltime_work: otherJob,
      trading_is_primary_income: !otherJob,
      avg_account_equity: Number(accountEquity) || 0,
      business_setup: dedicatedSetup
        ? ['dedicated_space', 'multi_monitor', 'market_data', 'charting_software', 'trade_journal']
        : [],
    };
    return assessTraderTaxStatus(answers, DEFAULT_TAX_YEAR);
  }, [
    tradingDays,
    totalTrades,
    holdingDays,
    weeklyHours,
    monthsActive,
    otherJob,
    accountEquity,
    dedicatedSetup,
  ]);

  const loss = useMemo(
    () =>
      calculateLossUsability({
        taxYear: DEFAULT_TAX_YEAR,
        netCapitalResult: Number(netResult) || 0,
        washSaleDisallowed: Number(washSales) || 0,
        priorCarryforward: Number(carryforward) || 0,
        otherIncome: Number(otherIncome) || 0,
        filingStatus,
        iraReplacement,
      }),
    [netResult, washSales, carryforward, otherIncome, filingStatus, iraReplacement]
  );

  const qualifies = tts.tier === 'strong' || tts.tier === 'defensible';
  const tone =
    tts.tier === 'strong'
      ? 'success'
      : tts.tier === 'defensible'
      ? 'info'
      : tts.tier === 'weak'
      ? 'warning'
      : 'destructive';

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link to="/trader-taxes" className="text-sm font-semibold tracking-tight">
            TraderTaxHQ
          </Link>
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link to="/prop-tax-calculator">Funded account?</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/trader-taxes">How we work</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Trader status and loss check
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Do you qualify as a trader — and what happens to your loss?
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Two questions, and they are connected. Trader tax status decides whether your expenses are
            deductible. It does not decide what happens to a loss already sitting in the capital
            bucket — that is a separate rule, and it surprises people every April.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          {/* --- Trader status ------------------------------------------- */}
          <Card className="p-6">
            <h2 className="text-base font-semibold">1. Your activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              From your broker's year-end activity report, not memory.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field id="days" label="Days you placed a trade" value={tradingDays} onChange={setTradingDays} />
              <Field id="trades" label="Total executions" value={totalTrades} onChange={setTotalTrades} />
              <Field id="hold" label="Average holding period (days)" value={holdingDays} onChange={setHoldingDays} />
              <Field id="hours" label="Hours a week on trading" value={weeklyHours} onChange={setWeeklyHours} />
              <Field id="months" label="Months active" value={monthsActive} onChange={setMonthsActive} />
              <Field
                id="equity"
                label="Average account equity"
                value={accountEquity}
                onChange={setAccountEquity}
                prefix="$"
              />
              <div className="space-y-2">
                <Label htmlFor="job">Have another full-time job</Label>
                <div className="flex h-10 items-center gap-3">
                  <Switch id="job" checked={otherJob} onCheckedChange={setOtherJob} />
                  <span className="text-sm text-muted-foreground">{otherJob ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="setup">Dedicated setup</Label>
                <div className="flex items-center gap-3">
                  <Switch id="setup" checked={dedicatedSetup} onCheckedChange={setDedicatedSetup} />
                  <span className="text-sm text-muted-foreground">
                    Own trading space, multiple monitors, paid data and charting, a written plan
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-semibold tabular-nums">{tts.score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
                <Badge variant={tone as never}>{ttsTierLabel(tts.tier)}</Badge>
              </div>
              <Progress value={tts.score} className="mt-3 h-1.5" />
              <p className="mt-3 text-sm">
                {qualifies
                  ? 'On these numbers a trader tax status position looks arguable. It is a facts-and-circumstances test decided year by year, and the burden of proof is yours — so it needs substantiation, not just a score.'
                  : 'On these numbers trader tax status is unlikely. That is the normal answer: most people who trade actively still do not meet it, and claiming it anyway puts the deductions and any related election at risk.'}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {tts.factors.map((f) => (
                <div key={f.key}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>{f.label}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round(f.score * 100)}%</span>
                  </div>
                  <Progress value={f.score * 100} className="mt-1 h-1" />
                  <p className="mt-1 text-xs text-muted-foreground">{f.benchmark}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* --- Loss ------------------------------------------------------ */}
          <Card className="p-6">
            <h2 className="text-base font-semibold">2. Your result</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a loss as a negative number.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field id="net" label="Net gain or loss for the year" value={netResult} onChange={setNetResult} prefix="$" />
              <Field id="wash" label="Wash sale losses disallowed" value={washSales} onChange={setWashSales} prefix="$" hint="Off your 1099-B." />
              <Field id="carry" label="Carryforward from prior years" value={carryforward} onChange={setCarryforward} prefix="$" hint="Enter as a positive number." />
              <Field id="income" label="Your other income" value={otherIncome} onChange={setOtherIncome} prefix="$" />
              <div className="space-y-2">
                <Label htmlFor="filing2">Filing status</Label>
                <Select value={filingStatus} onValueChange={(v) => setFilingStatus(v as FilingStatus)}>
                  <SelectTrigger id="filing2">
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
              <div className="space-y-2">
                <Label htmlFor="ira">Rebought in an IRA within 30 days</Label>
                <div className="flex h-10 items-center gap-3">
                  <Switch id="ira" checked={iraReplacement} onCheckedChange={setIraReplacement} />
                  <span className="text-sm text-muted-foreground">{iraReplacement ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-primary p-5 text-primary-foreground">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
                {loss.isGain ? 'Net position' : 'Deductible this year'}
              </p>
              <p className="mt-2 text-4xl font-semibold tabular-nums">
                {loss.isGain ? money(loss.netAfterCarryforward) : money(loss.usableThisYear)}
              </p>
              <p className="mt-2 text-sm opacity-90">{loss.headline}</p>
            </div>

            {!loss.isGain && (
              <div className="mt-4 space-y-1">
                <Row label="Total loss after carryforwards" value={money(Math.abs(loss.netAfterCarryforward))} />
                <Row label={`Usable this year (limit ${money(loss.annualLimit)})`} value={money(loss.usableThisYear)} />
                <Row label="Carries to future years" value={money(loss.carriesForward)} strong />
                <Row label="Tax saved this year" value={money(loss.taxSavedThisYear)} />
                {loss.carriesForward > 0 && (
                  <Row
                    label="Value still waiting to be used"
                    value={money(loss.strandedValue)}
                    muted
                  />
                )}
              </div>
            )}

            {loss.washSalePermanentlyLost > 0 && (
              <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  {money(loss.washSalePermanentlyLost)} of loss is gone permanently
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A wash sale loss is normally added to the basis of the replacement position, so you
                  get it back later. When the replacement is bought inside an IRA there is no basis to
                  adjust, and the deduction is lost for good.
                </p>
              </div>
            )}

            {loss.notes.map((n, i) => (
              <p key={i} className="mt-3 text-sm text-muted-foreground">
                {n}
              </p>
            ))}
          </Card>
        </div>

        {/* --- How the two connect ---------------------------------------- */}
        <Card className="mt-6 p-6">
          <h2 className="text-base font-semibold">How these two answers fit together</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <Connect
              title="Trader status affects expenses, not loss character"
              body="Qualifying lets you deduct data feeds, software, and a home office as business expenses on Schedule C. It does not turn a capital loss into an ordinary one. That distinction is where most online advice goes wrong."
            />
            <Connect
              title="Only a timely 475 election changes the character"
              body="A section 475(f) mark-to-market election makes future trading losses ordinary and switches off wash sales for that activity. It has to be filed by the deadline for the year it first applies — it cannot be made retroactively, and it does not free a loss already trapped."
            />
            <Connect
              title="Which means the decision is about next year"
              body={
                loss.carriesForward > 0
                  ? `Your ${money(loss.carriesForward)} carryforward stays capital whatever you do now. The live question is whether the next loss should be treated differently — and that window closes early in the year.`
                  : 'If this year was profitable, the election question is about protecting a future losing year — and it has to be decided before that year starts.'
              }
            />
          </div>
        </Card>

        {/* --- Disclaimer + CTA -------------------------------------------- */}
        <Card className="mt-6 p-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">What this is</p>
              <p>
                A screening tool using {DEFAULT_TAX_YEAR} federal figures. The trader status score is a
                weighted read of the factors courts have weighed — it is not a test published by the
                IRS, and no score guarantees an outcome. The loss figures exclude state tax and
                anything else on your return.
              </p>
              <p>Not tax advice, and nobody has reviewed your facts.</p>
            </div>
          </div>
        </Card>

        <div className="mt-6 rounded-xl border bg-background p-8 text-center">
          <h2 className="text-xl font-semibold">
            {qualifies ? 'Worth a proper look' : 'Still want it filed right?'}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {qualifies
              ? 'A defensible trader status position needs substantiation and a decision on the 475 election before the deadline. That is a conversation, not a checkbox.'
              : 'Most traders do not qualify, and the return is still worth getting right — wash sales, carryforwards, and basis are where the money quietly leaks.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/inquiry?source=landing">
                Get a quote
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/trader-taxes">See how it works</Link>
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
  value,
  onChange,
  prefix,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  hint?: string;
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
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className={`text-sm ${muted ? 'text-muted-foreground' : ''}`}>{label}</span>
      <span className={`tabular-nums ${strong ? 'text-base font-semibold' : 'text-sm'}`}>{value}</span>
    </div>
  );
}

function Connect({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
