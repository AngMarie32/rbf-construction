import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowRight, Check, Calculator } from 'lucide-react';
import { FEE_SCHEDULE } from '@/utils/traderTax/leadScoring';

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

const COMPARISON: { row: string; self: string; funded: string }[] = [
  { row: 'How the income is taxed', self: 'Capital gain', funded: 'Ordinary income on Schedule C' },
  { row: 'Self-employment tax', self: 'None', funded: '15.3% applies' },
  { row: 'Where it is reported', self: 'Schedule D and Form 8949', funded: 'Schedule C and Schedule SE' },
  { row: 'Section 475 election', self: 'Often the central decision', funded: 'Usually irrelevant' },
  { row: 'Retirement plan', self: 'Needs an S-corp to create wages', funded: 'Solo 401(k) works with no entity' },
  { row: 'Withholding', self: 'None', funded: 'None — and the bill is bigger' },
];

export default function PropFirmTaxesLanding() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <span className="text-sm font-semibold tracking-tight">TraderTaxHQ</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link to="/prop-tax-calculator">Calculator</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/inquiry?source=landing">Get a quote</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* --- Hero ---------------------------------------------------------- */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-4">
              Funded traders · small-scale traders
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Your prop firm payout is self-employment income.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              Most funded traders find that out in April. The payout arrives on a 1099-NEC with
              nothing withheld, and 15.3% self-employment tax lands on top of income tax. We do the
              returns for traders in exactly this position — flat fee, quoted before we start.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/prop-tax-calculator">
                  <Calculator className="mr-2 h-4 w-4" />
                  Work out what you owe
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/inquiry?source=landing">Get a quote</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The calculator is free and runs in your browser. No email required.
            </p>
          </div>
        </div>
      </section>

      {/* --- The three surprises -------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          Three things that catch funded traders out
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Surprise
            n="Self-employment tax"
            body="A 1099-NEC makes your payouts business income, which carries 15.3% self-employment tax on top of income tax. A trader who cleared $60,000 and set aside nothing for it is short several thousand dollars before income tax is even counted."
          />
          <Surprise
            n="Nothing is withheld"
            body="No employer, no withholding, and the IRS expects payment quarterly, not in April. Missing the quarters adds an underpayment penalty to a bill that was already bigger than expected."
          />
          <Surprise
            n="Deductions get missed"
            body="Evaluation fees, resets, platform fees, data, and the machine you trade on are deductible — including every evaluation that failed. Most first-time filers deduct none of it and overpay."
          />
        </div>
      </section>

      {/* --- Comparison ------------------------------------------------------ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            A funded trader is not taxed like a retail trader
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Almost every rule you will read about "trader taxes" online is written for someone
            trading their own account. Here is what actually differs.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 text-left font-medium text-muted-foreground" />
                  <th className="py-3 text-left font-medium">Trading your own account</th>
                  <th className="py-3 text-left font-medium">Funded account</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((r) => (
                  <tr key={r.row} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{r.row}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{r.self}</td>
                    <td className="py-3 font-medium">{r.funded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
            One thing genuinely goes your way: because the income is earned income, you can open a
            Solo 401(k) with no entity at all. A self-directed trader has to build an S corporation
            first to get the same result.
          </p>
        </div>
      </section>

      {/* --- Pricing --------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Flat fees, quoted up front</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          You get the price before we start. If the records turn out to be materially worse than what
          you showed us, we stop and agree a new number with you rather than surprising you later.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Price
            name="Quick answer"
            price={FEE_SCHEDULE.quickConsult}
            body="One specific question, answered properly in writing. Credited against a return if you engage us."
            points={['Written answer', 'Turnaround in a few days', 'Credited if you engage']}
          />
          <Price
            name="Funded account return"
            price={FEE_SCHEDULE.propReturn}
            featured
            body="The standard package for a funded trader: Schedule C, Schedule SE, expense substantiation, and the estimated tax plan for next year."
            points={[
              'Federal return with Schedule C and SE',
              'Every deductible fee captured',
              '1099 reconciliation with each firm',
              'Quarterly estimate schedule',
            ]}
          />
          <Price
            name="Consultation"
            price={FEE_SCHEDULE.consultation}
            body="An hour on your situation — entity, retirement, prior-year cleanup — with a written memo afterwards."
            points={['Written memo', 'Action plan with deadlines', 'No obligation to file with us']}
          />
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Add-ons where they apply: extra prop firms {money(FEE_SCHEDULE.adders.additionalPropFirm)},
          extra states {money(FEE_SCHEDULE.adders.additionalState)}, crypto payouts{' '}
          {money(FEE_SCHEDULE.adders.cryptoPayouts)}, a non-US firm with no 1099{' '}
          {money(FEE_SCHEDULE.adders.foreignPropFirm)}, prior-year cleanup{' '}
          {money(FEE_SCHEDULE.adders.priorYearCleanup)} per year.
        </p>
      </section>

      {/* --- Process --------------------------------------------------------- */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            <Step n={1} title="Tell us about your year" body="A short form — five minutes, rough numbers are fine." />
            <Step n={2} title="Get a quote" body="A flat fee based on what your return actually involves, before any work starts." />
            <Step n={3} title="Send documents securely" body="Everything moves through an encrypted portal. Never email a tax document." />
            <Step n={4} title="Review and file" body="You see the return and the reasoning behind every position before it goes anywhere." />
          </div>
        </div>
      </section>

      {/* --- FAQ ------------------------------------------------------------- */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Questions we get every week</h2>
        <Accordion type="single" collapsible className="mt-6">
          <Faq
            q="My firm sent a 1099-NEC. Do I really owe self-employment tax?"
            a="On the default treatment, yes. A 1099-NEC reports nonemployee compensation, which goes on Schedule C and carries self-employment tax. Some people argue funded payouts are trading gains rather than services income and report them as capital — that position exists, but it conflicts with the form the firm filed, and the mismatch generates an automated notice. If you want to take it, it needs to be documented before you file, not defended afterwards."
          />
          <Faq
            q="I never got any tax form. Is it still taxable?"
            a="Yes. Firms outside the United States generally do not issue US information returns, and some smaller firms simply do not. The income is reportable either way. What changes is that you have no paper trail, so pull your full payout history from the firm's dashboard while you still have account access — closed accounts take their records with them."
          />
          <Faq
            q="Can I deduct evaluations I failed?"
            a="If the activity is carried on as a business for profit, yes — failed attempts are an ordinary cost of it. The caveat is real though: if you have bought evaluations for years and never been funded, the IRS can treat the activity as not engaged in for profit and limit the deductions. Being profitable in three of five years creates a presumption in your favour; without that, the facts have to carry it."
          />
          <Faq
            q="Should I set up an LLC or S-corp?"
            a="Usually not at first, and for a different reason than you would guess. You do not need an entity to deduct expenses or to open a Solo 401(k) — Schedule C already gives you both. An S corporation becomes worth modelling once profit is consistently high enough that the self-employment tax it saves exceeds payroll cost and the qualified business income deduction it gives up. Also check whether your firm will even contract with an entity — many will not."
          />
          <Faq
            q="I got paid in crypto. Does that change anything?"
            a="It adds a second taxable event. The payout is income at its value on the day you received it, and that value becomes your basis. When you later convert or spend it, the difference is a separate gain or loss. Record the value on the day each payout lands — reconstructing it later from exchange history is painful and imprecise."
          />
          <Faq
            q="I did not report payouts in a previous year. What now?"
            a="Tell us on the first call. Unreported income keeps the assessment window open indefinitely, and if a 1099 was filed the IRS already has it. It is fixable, and it is far cheaper to fix before a notice arrives than after. We sequence the cleanup before taking any new positions."
          />
          <Faq
            q="Do you work with traders who lost money?"
            a="Yes, and it is often the more useful conversation. A losing year raises how the loss is treated, whether the fees are still deductible, and whether the activity reads as a business at all. Those answers shape what you do next year."
          />
        </Accordion>
      </section>

      {/* --- CTA -------------------------------------------------------------- */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Start with the number</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Run your year through the calculator. If it tells you what you needed to know and you
            handle it yourself, that is a fine outcome. If you would rather not, we are here.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/prop-tax-calculator">
                Open the calculator
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/inquiry?source=landing">Get a quote</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-xs text-muted-foreground">
            Nothing on this page is tax advice, and reading it does not make anyone your tax
            preparer. Every situation turns on its own facts. Figures shown by the calculator are
            federal estimates only and exclude state tax.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Surprise({ n, body }: { n: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold">{n}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Price({
  name,
  price,
  body,
  points,
  featured,
}: {
  name: string;
  price: number;
  body: string;
  points: string[];
  featured?: boolean;
}) {
  return (
    <Card className={`flex flex-col gap-0 p-6 ${featured ? 'border-primary/50 shadow-md' : ''}`}>
      {featured && (
        <Badge variant="primary" className="mb-3 w-fit">
          Most funded traders
        </Badge>
      )}
      <h3 className="font-semibold">{name}</h3>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{money(price)}</p>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
      <ul className="mb-6 mt-4 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {/* mt-auto keeps the call to action on the same baseline across cards. */}
      <Button className="mt-auto w-full pt-0" variant={featured ? 'default' : 'outline'} asChild>
        <Link to="/inquiry?source=landing">Get started</Link>
      </Button>
    </Card>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {n}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <AccordionItem value={q}>
      <AccordionTrigger className="text-left text-base">{q}</AccordionTrigger>
      <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
    </AccordionItem>
  );
}
