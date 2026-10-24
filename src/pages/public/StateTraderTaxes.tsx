import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Check, Info, MapPin } from 'lucide-react';
import {
  PublishedPosition,
  publishableStates,
  statePageContent,
} from '@/utils/traderTax/stateContent';
import { useSeo } from '@/hooks/useSeo';
import { statePageMeta } from '@/utils/seo/routeMeta';
import { pageMetaFor } from '@/utils/seo/pageMetaFor';

/**
 * Public state pages. Content comes from two places: the structural notes that
 * ship with the app, and any position the firm has researched and explicitly
 * published. The second kind is the point — research done once for a client
 * becomes a permanent asset that answers the same question for everyone else.
 */
export default function StateTraderTaxes() {
  const { state } = useParams<{ state: string }>();
  const code = (state ?? '').toUpperCase();
  const content = useMemo(() => (code ? statePageContent(code) : null), [code]);
  const [published, setPublished] = useState<PublishedPosition[]>([]);

  // An unknown state code renders a not-found body, so it must not claim to be
  // an indexable page describing a state we do not cover.
  useSeo(
    content
      ? statePageMeta(content)
      : {
          path: `/trader-taxes/${(state ?? '').toLowerCase()}`,
          title: 'State not found',
          description: 'We do not have a page for this state yet.',
          noindex: true,
        }
  );

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    supabase.functions
      .invoke('tth-state-content', { body: { state: code } })
      .then(({ data }) => {
        if (cancelled) return;
        setPublished((data as { positions?: PublishedPosition[] })?.positions ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!content) return <StateIndex />;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/trader-taxes" className="hover:underline">
              Trader taxes
            </Link>
            <span>/</span>
            <Link to="/trader-taxes/states" className="hover:underline">
              By state
            </Link>
            <span>/</span>
            <span className="text-foreground">{content.name}</span>
          </div>

          <Badge variant="outline" className="mb-4">
            <MapPin className="mr-1 h-3 w-3" />
            {content.name}
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{content.headline}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{content.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/inquiry?source=landing">Get a quote</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/trader-status-check">Check your status</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-14">
        <h2 className="text-2xl font-semibold tracking-tight">
          What {content.name} traders should know
        </h2>
        <div className="mt-8 space-y-6">
          {content.points.map((p) => (
            <div key={p.title} className="border-l-2 border-primary/30 pl-5">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-2 text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {published.length > 0 && (
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-4xl px-6 py-14">
            <h2 className="text-2xl font-semibold tracking-tight">
              Positions we have researched here
            </h2>
            <p className="mt-2 text-muted-foreground">
              Work we did for a {content.name} client, written up so the next person does not have to
              pay for the same research.
            </p>
            <div className="mt-8 space-y-4">
              {published.map((p, i) => (
                <Card key={`${p.topic}-${i}`} className="p-5">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {p.topic.replace(/_/g, ' ')}
                  </Badge>
                  <p className="mt-3">{p.public_summary}</p>
                  {p.citation && (
                    <p className="mt-2 text-xs italic text-muted-foreground">{p.citation}</p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-6 py-14">
        <Card className="p-6">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">What we confirm for your return</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This page sticks to what is structural — the things that stay true year to year.
                Rates, thresholds, and conformity dates change, so they are deliberately not quoted
                here. On an actual return we confirm:
              </p>
              <ul className="mt-4 space-y-2">
                {content.weConfirm.map((c) => (
                  <li key={c} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Trading from {content.name}?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Tell us about your year and we will quote a flat fee. If your situation is simpler than
            you think, we will say that too.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/inquiry?source=landing">
                Get a quote
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/trader-taxes/states">Other states</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export function StateIndex() {
  useSeo(pageMetaFor('/trader-taxes/states'));
  const states = publishableStates();
  const taxing = states.filter((s) => !s.noIncomeTax);
  const noTax = states.filter((s) => s.noIncomeTax);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <Badge variant="outline" className="mb-4">
            By state
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your state changes the answer more than you would expect.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            A section 475 election is federal. Whether your state respects the ordinary treatment,
            whether a trading loss can offset your wages, and whether short-term gains carry their own
            rate are separate questions with different answers in different places.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-14">
        <h2 className="text-xl font-semibold tracking-tight">States with something specific to know</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {taxing.map((s) => (
            <Link key={s.code} to={`/trader-taxes/${s.code.toLowerCase()}`}>
              <Card className="h-full p-5 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {s.code}
                  </Badge>
                  <span className="font-semibold">{s.name}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.headline}</p>
              </Card>
            </Link>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">No individual income tax</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Simpler, but residency and other-state income still need attention.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {noTax.map((s) => (
            <Link key={s.code} to={`/trader-taxes/${s.code.toLowerCase()}`}>
              <Badge variant="secondary" className="px-3 py-1.5 text-sm hover:bg-muted">
                {s.name}
              </Badge>
            </Link>
          ))}
        </div>

        <Card className="mt-12 p-6">
          <h3 className="font-semibold">Not listed?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            We only publish a page once we have actually researched the state, rather than filling in
            fifty pages with guesses. If yours is missing, ask — we research it for your return either
            way, and it usually becomes a page afterwards.
          </p>
          <Button className="mt-4" variant="outline" asChild>
            <Link to="/inquiry?source=landing">Ask about your state</Link>
          </Button>
        </Card>
      </section>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link to="/trader-taxes" className="text-sm font-semibold tracking-tight">
          TraderTaxHQ
        </Link>
        <div className="flex flex-wrap justify-end gap-2">
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
  );
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="text-xs text-muted-foreground">
          Nothing on this page is tax advice, and reading it does not make anyone your tax preparer.
          State rules change; this page covers what is structural and deliberately does not quote
          rates or thresholds. Every situation turns on its own facts.
        </p>
      </div>
    </footer>
  );
}
