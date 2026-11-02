/**
 * TraderTaxHQ — public route metadata, one source of truth.
 *
 * This module is consumed from two places that cannot share a runtime:
 *
 *   1. `useSeo()` in the browser, so the head is correct after client-side
 *      navigation.
 *   2. `scripts/prerender-meta.mjs` at build time, which bakes the same tags
 *      into a static HTML file per route and emits the sitemap.
 *
 * The build-time consumer runs in Node, so this file must stay free of React,
 * of `import.meta.env`, and of anything else that only exists in the bundle.
 * The base URL is therefore a parameter rather than an ambient read — each
 * caller supplies it from wherever it legitimately knows it.
 */

import { publishableStates, StatePageContent } from '@/utils/traderTax/stateContent';

/** Fallback only. Real deployments set VITE_PUBLIC_SITE_URL. */
export const DEFAULT_SITE_URL = 'https://tradertaxhq.com';

export const SITE_NAME = 'TraderTaxHQ';

/**
 * Social share image, as a site-root-relative path, or null if there isn't one.
 *
 * This is deliberately null rather than pointing at the construction portal's
 * placeholder: a wrong picture on a shared tax link is worse than none. While
 * it stays null the Twitter card falls back to `summary` instead of claiming
 * `summary_large_image` for an image that does not exist. Drop a 1200x630 asset
 * in `public/` and set the path here to upgrade every page at once.
 */
export const OG_IMAGE_PATH: string | null = null;

/** Twitter needs an image to honour the large card. */
export function twitterCardType(): 'summary' | 'summary_large_image' {
  return OG_IMAGE_PATH ? 'summary_large_image' : 'summary';
}

export interface PageMeta {
  /** Route path, exactly as registered in the router. No trailing slash. */
  path: string;
  title: string;
  description: string;
  /** Keep out of the index and out of the sitemap. */
  noindex?: boolean;
  /** Structured data, built against a known base URL. */
  jsonLd?: (baseUrl: string) => Record<string, unknown>;
}

function normalizeBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export function absoluteUrl(baseUrl: string, path: string): string {
  const base = normalizeBase(baseUrl);
  return path === '/' ? `${base}/` : `${base}${path}`;
}

const organization = (baseUrl: string) => ({
  '@type': 'AccountingService',
  '@id': `${normalizeBase(baseUrl)}/#organization`,
  name: SITE_NAME,
  url: `${normalizeBase(baseUrl)}/`,
  areaServed: 'US',
  knowsAbout: [
    'Trader tax status',
    'Section 475(f) mark-to-market election',
    'Prop firm funded account taxation',
    'Wash sale rules',
    'Self-employment tax',
  ],
});

/**
 * An FAQ block is only worth emitting where the page genuinely answers these
 * questions in its own copy. Structured data that does not match the visible
 * page is a manual-action risk, not a ranking trick.
 */
const faq = (entries: { q: string; a: string }[]) => ({
  '@type': 'FAQPage',
  mainEntity: entries.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});

const graph = (baseUrl: string, nodes: Record<string, unknown>[]) => ({
  '@context': 'https://schema.org',
  '@graph': [organization(baseUrl), ...nodes],
});

/** The fixed public routes. State pages are generated separately. */
export const STATIC_PUBLIC_PAGES: PageMeta[] = [
  {
    path: '/prop-firm-taxes',
    title: 'Prop Firm Trader Taxes: How Funded Account Payouts Are Taxed',
    description:
      'Funded account payouts are not capital gains. They arrive on a 1099-NEC as ordinary self-employment income, which changes what you owe and what you can deduct. What prop firm traders need to know, explained plainly.',
    jsonLd: (baseUrl) =>
      graph(baseUrl, [
        faq([
          {
            q: 'Are prop firm payouts capital gains?',
            a: 'No. A funded account payout is generally reported on Form 1099-NEC as ordinary income from self-employment, not as a capital gain. You are paid for performance under a contract rather than trading your own capital, so capital gain treatment and the section 475 election do not apply in the usual way.',
          },
          {
            q: 'Do prop firm traders owe self-employment tax?',
            a: 'Generally yes. Payout income reported on a 1099-NEC is subject to self-employment tax in addition to income tax, which is the single largest surprise for traders in their first funded year.',
          },
          {
            q: 'Do prop firm traders need trader tax status?',
            a: 'Usually it matters far less than for self-directed traders. Payout income is already ordinary business income on Schedule C, so the deductions trader tax status unlocks are largely available without it.',
          },
        ]),
      ]),
  },
  {
    path: '/prop-firm-taxes/calculator',
    title: 'Prop Firm Payout Tax Calculator — Estimate What to Set Aside',
    description:
      'Estimate the federal income tax and self-employment tax on your funded account payouts, and the share of each payout worth setting aside. Free, no sign-up, runs entirely in your browser.',
    jsonLd: (baseUrl) =>
      graph(baseUrl, [
        {
          '@type': 'WebApplication',
          name: 'Prop Firm Payout Tax Calculator',
          url: absoluteUrl(baseUrl, '/prop-firm-taxes/calculator'),
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        },
      ]),
  },
  {
    path: '/trader-taxes',
    title: 'Trader Tax Help for Active and Small-Scale Traders',
    description:
      'The capital loss limit, wash sales, and the section 475 election decide most of what an active trader owes. Straight answers on each, and what trader tax status actually changes.',
    jsonLd: (baseUrl) =>
      graph(baseUrl, [
        faq([
          {
            q: 'How much trading loss can I deduct?',
            a: 'Capital losses offset capital gains without limit, but a net capital loss deductible against other income such as wages is capped each year under section 1211(b). The unused remainder carries forward indefinitely under section 1212(b) rather than being lost.',
          },
          {
            q: 'What does the section 475 election do?',
            a: 'A valid mark-to-market election under section 475(f) converts trading gains and losses to ordinary income, which removes the capital loss limit and takes wash sale adjustments out of the picture. It has a strict deadline and is not revocable at will.',
          },
          {
            q: 'Do I qualify for trader tax status?',
            a: 'Trader tax status is a facts-and-circumstances test rather than a box to check. Trade frequency, holding periods, the continuity of the activity across the year, and whether you run it in a businesslike way all weigh in.',
          },
        ]),
      ]),
  },
  {
    path: '/trader-taxes/status-check',
    title: 'Trader Tax Status Check — Do You Qualify for TTS?',
    description:
      'Answer a few questions about your trading year and see how your facts line up against the factors courts and the IRS actually weigh for trader tax status, plus how much of a loss you could use.',
    jsonLd: (baseUrl) =>
      graph(baseUrl, [
        {
          '@type': 'WebApplication',
          name: 'Trader Tax Status Check',
          url: absoluteUrl(baseUrl, '/trader-taxes/status-check'),
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        },
      ]),
  },
  {
    path: '/trader-taxes/states',
    title: 'Trader Taxes by State — Where Your State Departs from Federal',
    description:
      'Your state may not follow the federal answer on trading losses, the section 475 election, or entity-level tax. A structural guide to the states where the difference actually bites.',
    jsonLd: (baseUrl) =>
      graph(baseUrl, [
        {
          '@type': 'CollectionPage',
          name: 'Trader Taxes by State',
          url: absoluteUrl(baseUrl, '/trader-taxes/states'),
        },
      ]),
  },
  {
    // A thin conversion form. Useful to people, not something to rank.
    path: '/inquiry',
    title: 'Talk to Us About Your Trading Taxes',
    description: 'Tell us about your trading year and we will come back to you with a flat-fee quote.',
    noindex: true,
  },
];

/** Metadata for one state page, derived from the page's own published copy. */
export function statePageMeta(content: StatePageContent): PageMeta {
  const path = `/trader-taxes/${content.code.toLowerCase()}`;
  const title = content.noIncomeTax
    ? `${content.name} Trader Taxes — No State Income Tax, But Not Nothing`
    : `${content.name} Trader Taxes — Where the State Departs from Federal`;

  // The page's own intro is the honest description. Trim to a sane meta length
  // on a word boundary rather than mid-word.
  const description =
    content.intro.length > 300 ? `${content.intro.slice(0, 297).replace(/\s+\S*$/, '')}…` : content.intro;

  return {
    path,
    title,
    description,
    jsonLd: (baseUrl) =>
      graph(baseUrl, [
        {
          '@type': 'Article',
          headline: content.headline,
          description,
          url: absoluteUrl(baseUrl, path),
          about: { '@type': 'Place', name: content.name },
          isPartOf: { '@type': 'CollectionPage', url: absoluteUrl(baseUrl, '/trader-taxes/states') },
        },
      ]),
  };
}

/** Every public page that should get baked metadata, state pages included. */
export function allPublicPages(): PageMeta[] {
  return [...STATIC_PUBLIC_PAGES, ...publishableStates().map(statePageMeta)];
}

/** Sitemap entries only — never the noindex pages. */
export function indexablePages(): PageMeta[] {
  return allPublicPages().filter((p) => !p.noindex);
}
