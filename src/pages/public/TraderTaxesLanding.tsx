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
import { ArrowRight, Check, Scale } from 'lucide-react';
import { FEE_SCHEDULE } from '@/utils/traderTax/leadScoring';
import { getTaxYearConfig, DEFAULT_TAX_YEAR } from '@/utils/traderTax/taxYearConfig';

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

export default function TraderTaxesLanding() {
  const cfg = getTaxYearConfig(DEFAULT_TAX_YEAR);
  const lossLimit = cfg.capitalLossLimit.single;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <span className="text-sm font-semibold tracking-tight">TraderTaxHQ</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link to="/prop-firm-taxes">Funded accounts</Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/trader-status-check">Status check</Link>
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
              Self-directed traders
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              You lost {money(40000)} trading. You can deduct {money(lossLimit)}.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              That is the rule that catches most active traders, and no amount of claiming "trader
              status" changes it on its own. We prepare returns for traders at every size, and we will
              tell you plainly when a position you read about online does not apply to you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/trader-status-check">
                  <Scale className="mr-2 h-4 w-4" />
                  Check your status and loss
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/inquiry?source=landing">Get a quote</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Free, no email required. Trading a funded account instead?{' '}
              <Link to="/prop-firm-taxes" className="underline">
                That is taxed differently
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* --- The four things ------------------------------------------------ */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          What actually goes wrong on a trader's return
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Issue
            title={`The ${money(lossLimit)} limit`}
            body={`Capital losses offset capital gains without limit, but only ${money(
              lossLimit
            )} a year reaches ordinary income. The rest carries forward indefinitely — which for a large loss can mean decades before it is fully used.`}
          />
          <Issue
            title="Wash sales you did not know you had"
            body="Buying back within 30 days disallows the loss and rolls it into the replacement position's basis. Usually that is a timing problem, not a permanent one — unless the replacement was bought in an IRA, where the deduction is gone for good."
          />
          <Issue
            title="Trader status claimed when it does not apply"
            body="There is no bright-line test, and most people who trade actively do not meet it. Claiming it puts the expenses and any related election at risk, and the burden of proof sits with you, not the IRS."
          />
          <Issue
            title="Basis and 1099-B mismatches"
            body="Transfers between brokers, options assignments, and corporate actions routinely produce a 1099-B that does not match reality. Filing it as-issued can quietly overstate your gain."
          />
        </div>
      </section>

      {/* --- The 475 explainer ---------------------------------------------- */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight">
              The one thing that actually changes the loss rule
            </h2>
            <p className="mt-4 text-muted-foreground">
              A section 475(f) mark-to-market election makes trading gains and losses{' '}
              <strong className="text-foreground">ordinary instead of capital</strong>. That removes
              the annual loss limit for future years and switches off wash sale deferral for the
              trading activity. It is the real answer behind most of what gets called "trader tax
              status" online.
            </p>
            <p className="mt-4 text-muted-foreground">
              The catch is the timing, and it is unforgiving. For an existing taxpayer the election
              statement is due by the unextended due date of the <em>prior</em> year's return — in
              practice, April 15 of the year you want it to apply. Miss it and the earliest it can
              apply is the following year. It cannot be made retroactively, and it does nothing for a
              loss already sitting in the capital bucket.
            </p>
            <p className="mt-4 text-muted-foreground">
              It also has a cost: you give up long-term capital gain rates on that activity, and it
              binds future years until revoked on the same calendar. It is a real decision, not a
              default, and it should be modelled against your own numbers before you make it.
            </p>
            <Button className="mt-6" variant="outline" asChild>
              <Link to="/trader-status-check">See where you stand</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* --- Pricing --------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Flat fees, quoted up front</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Priced by what your return actually involves. You get the number before we start.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Price
            name="Quick answer"
            price={FEE_SCHEDULE.quickConsult}
            body="One specific question answered properly in writing. Credited against a return if you engage us."
            points={['Written answer', 'A few days turnaround', 'Credited if you engage']}
          />
          <Price
            name="Trader return"
            price={FEE_SCHEDULE.smallTraderReturn}
            featured
            body="For an active trader who does not claim trader tax status: the return done correctly, with wash sales and carryforwards handled properly."
            points={[
              'Federal return with Schedule D and 8949',
              'Wash sale and basis review',
              'Carryforward tracking',
              'A straight answer on the 475 question',
            ]}
          />
          <Price
            name="Trader status return"
            price={FEE_SCHEDULE.traderStatusReturn}
            body="Where the facts support a trader tax status position: Schedule C for the business expenses, plus the election analysis and its deadlines."
            points={[
              'Everything in the trader return',
              'Schedule C business expenses',
              'Factor substantiation for the file',
              '475 election decision and filing',
            ]}
          />
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Add-ons where they apply: extra states {money(FEE_SCHEDULE.adders.additionalState)}, crypto{' '}
          {money(FEE_SCHEDULE.adders.crypto)}, section 1256 contracts{' '}
          {money(FEE_SCHEDULE.adders.sec1256)}, high trade volume{' '}
          {money(FEE_SCHEDULE.adders.highVolume)}, the 475 election and Form 3115{' '}
          {money(FEE_SCHEDULE.adders.election475)}.
        </p>
      </section>

      {/* --- FAQ -------------------------------------------------------------- */}
      <section className="mx-auto max-w-3xl px-6 pb-16">
        <h2 className="text-2xl font-semibold tracking-tight">Questions we get every week</h2>
        <Accordion type="single" collapsible className="mt-6">
          <Faq
            q="How many trades do I need to be a trader for tax purposes?"
            a="There is no number in the statute, which is why every article gives a different one. Courts weigh frequency, holding period, hours, continuity, and whether the activity is carried on in a businesslike way with the intent to profit from short-term movements. Practitioners tend to defend roughly 720 trades across most trading days with an average holding period measured in days, but that is a convention, not a rule. Someone trading 300 times a year around a full-time job is very unlikely to meet it."
          />
          <Faq
            q="Does trader status let me deduct my losses in full?"
            a="No, and this is the most common misconception. Trader tax status lets you deduct business expenses — data, software, home office — on Schedule C. Your gains and losses stay capital, and the annual limit against ordinary income still applies. Only a timely section 475(f) election changes the character of the losses, and only for years it covers."
          />
          <Faq
            q="I have a big carryforward. Can the 475 election free it up?"
            a="No. An election made now applies going forward. A loss already characterized as capital stays capital and works its way out against future capital gains and the annual limit. The election is about protecting the next loss, not recovering the last one."
          />
          <Faq
            q="My broker reported wash sales. Did I actually lose that deduction?"
            a="Usually not permanently. The disallowed loss is added to the basis of the replacement position, so you recover it when you close that position and stay out for 30 days. Two exceptions matter: positions still open at year end carry the deferral into next year, and a replacement bought inside an IRA destroys the deduction entirely with no basis adjustment to recover it."
          />
          <Faq
            q="Do I need an LLC to trade?"
            a="For tax purposes, almost never on its own. An entity does not create trader tax status, does not change the loss rules, and does not make expenses deductible that would not be otherwise. It can make sense for other reasons — several traders pooling capital, a specific retirement plan structure — but forming one because someone on YouTube said it lowers your taxes is how people end up paying for a return they did not need."
          />
          <Faq
            q="What about crypto?"
            a="Digital assets are property, not securities. That puts them outside a section 475(f) securities election and, as the rule is currently written, outside the wash sale rule as well. Basis has to be tracked per wallet or account. If crypto is a meaningful part of your activity, say so early — reconstructing basis is often the largest part of the work."
          />
          <Faq
            q="I trade a funded account too. Same thing?"
            a="No — very different. Prop firm payouts usually arrive on a 1099-NEC as self-employment income, which means Schedule C and 15.3% self-employment tax, with none of the capital gain rules above applying to that income. If both apply to you, they are handled separately on the same return."
          />
        </Accordion>
      </section>

      {/* --- CTA ---------------------------------------------------------------- */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Find out where you stand</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            The checker gives you an honest read on trader status and shows exactly what happens to
            your loss. If it tells you what you needed and you file it yourself, good.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/trader-status-check">
                Open the checker
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
            Nothing on this page is tax advice, and reading it does not make anyone your tax preparer.
            Every situation turns on its own facts. Figures are federal only and exclude state tax.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Issue({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </Card>
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
          Most traders
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
      <Button className="mt-auto w-full" variant={featured ? 'default' : 'outline'} asChild>
        <Link to="/inquiry?source=landing">Get started</Link>
      </Button>
    </Card>
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
