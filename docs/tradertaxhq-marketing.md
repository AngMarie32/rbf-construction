# TraderTaxHQ — acquisition plan

For a volume practice serving funded-account and small-scale traders. This is a plan to test, not
a forecast: **there is no keyword volume data behind any of it.** Nobody has pulled search numbers,
so treat every intent below as a hypothesis with an obvious way to check it, and let the leads table
settle the argument within one season.

---

## 1. What is built

Two audiences, two tracks, one inquiry form.

| Asset | Route | Audience | Job |
|---|---|---|---|
| Funded landing | `/prop-firm-taxes` | Prop traders | Converts someone who suspects they have a problem |
| Payout calculator | `/prop-tax-calculator` | Prop traders | Lead magnet — what do I keep from a payout |
| Trader landing | `/trader-taxes` | Self-directed | Leads with the capital loss limit |
| Status + loss check | `/trader-status-check` | Self-directed | Lead magnet — do I qualify, and what happens to my loss |
| State index | `/trader-taxes/states` | Both | Routes to the state pages |
| State page | `/trader-taxes/:state` | Both | 15 states where we have something real to say |
| Inquiry form | `/inquiry` | Both | Captures the lead, pre-filled where possible |

The tracks cross-link in both directions, because plenty of traders do both and arrive at the wrong
one. Every page carries a line pointing to the other.

Both calculators run the same engines the internal analysis uses — self-employment tax, the trader
status factor model, and the section 1211(b) loss math. That is deliberate: a marketing calculator
that disagrees with the firm's own working paper is a liability, not an asset.

Leads arrive tagged `calculator`, `landing`, or `inquiry_form`, and conversion by source shows up in
`/tradertax/analytics`.

---

## 2. Why the calculator is the centre of this

For this segment the calculator is a better acquisition asset than any article, for three reasons:

1. **It answers the question they actually have.** Not "what is trader tax status" — *"how much of
   this payout is mine?"* That question has a number as its answer, and a number is shareable.
2. **It is free, useful, and asks for nothing.** No email gate. A gated calculator gets screenshotted
   and passed around with the gate cropped out; an ungated one gets linked.
3. **It self-qualifies.** Someone who runs $80,000 of payouts through it and sees a $20,000 bill has
   just been shown why they need you. Someone who runs $900 through it has been shown why they do
   not, and they leave happy instead of becoming an unprofitable client.

The set-aside percentage is the piece designed to travel. "Set aside 25% of every payout" is a rule
someone repeats in a Discord channel; a tax article is not.

The self-directed side has the same shape with a different number. "At $3,000 a year, this loss takes
20 years to use up" is the line that makes an active trader finally read about the section 475
election — and it is true, checkable, and nobody else leads with it.

---

## 3. Intent hypotheses

Ranked by how close the intent sits to hiring someone. Each needs a page or a section; the last
column is how you find out whether the hypothesis is right.

| Intent | Where it lands | How to validate |
|---|---|---|
| "do I pay taxes on prop firm payouts" | Landing hero + FAQ 1 | Highest-intent guess. Check whether landing sessions convert at all before building more |
| "prop firm payout tax calculator" | Calculator | Direct. If this does not draw traffic, the whole content plan is wrong |
| "is prop trading self-employment income" | FAQ 1, deserves its own page | The SE tax surprise is the wedge — test as a standalone article |
| "[firm name] 1099 / taxes" | One short page per major firm | Very high intent, very low volume each. Only worth it if the generic page proves the channel |
| "can I deduct evaluation fees" | FAQ 3, deserves its own page | Cheap to write, and the answer has a real caveat most competitors skip |
| "prop firm trader LLC / S-corp" | FAQ 4 | Popular question, usually answered badly online. Being the honest answer is the differentiator |
| "paid in crypto by prop firm taxes" | FAQ 5 | Narrow, but nobody covers it |
| "didn't report prop payouts" | FAQ 6 | Low volume, high value, high urgency |
| "day trader taxes small account" | `/trader-taxes` | The other half of the segment |
| "how much trading loss can I deduct" | Status + loss check | The $3,000 shock — likely the strongest single hook on the self-directed side |
| "do I qualify as a day trader for taxes" | Status + loss check | High intent, and most existing answers are wrong or vague |
| "wash sale rule explained" | `/trader-taxes` FAQ, deserves its own page | High volume guess, low intent — useful for reach, weak for conversion |
| "475 mark to market election" | `/trader-taxes` 475 section | Low volume, very high intent — these people are ready to hire |

**Now built:** state pages for 15 states, covering the six with something specific to say (CA, IL,
MA, NJ, NY, PA) and the nine with no individual income tax.

**Gap worth closing next:** an email sequence. Someone who runs a calculator in November and is not
ready to engage has no reason to remember you in February, which is exactly when they need you. That
is the highest-value missing piece, and it needs an email platform rather than more code here.

---

## 3A. How the state pages compound

The state pages are the only asset here that gets better on its own.

Research done for a client goes into `tth_state_positions` as an internal note. That note may
reference the client's own facts, so it is never published. Instead the preparer writes a separate
client-safe summary and flips a publish toggle — a database constraint refuses to publish a row
without one. The public page then serves the shipped structural content plus anything published, and
the next prospect from that state reads an answer somebody already paid for.

**One rule governs what is publishable: only what is structural.** New Jersey taxing income by
category is structural. Massachusetts taxing short-term gains on their own schedule is structural.
A rate, a threshold, or a conformity date is not — those move, and a stale figure on a public page is
a liability. The pages say so explicitly and list what the firm confirms on the actual return
instead. There is a test asserting that no published copy contains a dollar figure or a percentage.

Notes flagged `research` in the dataset never reach a public page. A state with nothing researched
gets no page rather than a thin one, and the index says plainly that we only publish states we have
actually looked at. That is both more honest and better positioning than fifty generated pages.

---

## 4. Distribution

These clients are not on LinkedIn and they are not searching Google Scholar. They are in:

- **YouTube** — prop firm review and funded-trader channels. The calculator is the natural mention:
  a creator can link it without endorsing a tax firm, which is exactly why they will.
- **Discord** — most funded programs have one. Read the rules before posting anything; the useful
  play is being the person who answers tax questions accurately, not the person who drops links.
- **Reddit** — r/Daytrading, r/FuturesTrading, and prop-firm-specific subs. Same rule, more strictly
  enforced.
- **The firms themselves.** Prop firms field tax questions constantly and have no good answer to
  give. A referral relationship costs nothing and is the highest-quality traffic available. This is
  the single highest-leverage item on the page and it is a phone call, not a campaign.

Seasonality is extreme: January through April is most of the year's demand, and the traders who
find you in November are the profitable ones because there is still time to act.

---

## 5. What to measure

Everything needed is already in the app:

- **Leads by source** — `tth_leads.source` distinguishes `calculator`, `landing`, `inquiry_form`
- **Conversion by source** — the funnel on `/tradertax/analytics`
- **Fit distribution** — if most calculator leads score `low_fit`, the calculator is drawing the
  wrong traffic and the copy needs to be more specific about who this is for
- **Effective rate by service** — whether the flat fees actually work at the hours the work takes

One season of data settles nearly every argument above. Until then it is guesswork with a plan
attached.

---

## 6. Rules for the copy

The segment is young, sceptical, and has been marketed at badly by trading educators. What works:

- **Lead with the bad news.** "Your payout is self-employment income" outperforms "expert tax
  services for traders" because it is specific, checkable, and slightly alarming.
- **Give the real answer away.** The FAQ answers the questions properly, including the caveats. A
  prospect who reads an honest answer to a hard question trusts the next thing you say.
- **Publish the price.** This segment assumes any firm hiding its fee is expensive. Flat fees on the
  page pre-qualify and remove the discovery call from the cheap end of the funnel.
- **Never promise a tax outcome.** No "cut your tax bill in half." Every claim on the site should
  survive being read aloud in an examination.
- **Say when they do not need you.** The calculator tells a $900 trader they can handle it
  themselves. That costs nothing and buys the referral when they are a $90,000 trader.

---

## 7. Compliance notes for anything published

- Nothing on a public page is tax advice, and every page says so.
- Do not name a client, a firm, or a fact pattern that could identify someone.
- Calculator output is a federal estimate excluding state tax, and the page states that where the
  number appears, not only in the footer.
- Circular 230 governs how a practitioner advertises. Keep claims verifiable and avoid anything that
  reads as a guaranteed result.

---

## 8. How the public pages get found

The app is a client-rendered SPA with a single `index.html`, which is a problem for acquisition in
two distinct ways. They have separate fixes, and conflating them wastes effort.

**Google executes JavaScript.** It renders the page and reads the head afterwards, so a title set at
runtime is seen. That is what `useSeo()` in `src/hooks/useSeo.ts` handles, and it is also what keeps
the head correct after client-side navigation — without it every route would keep describing
whichever page the browser loaded first.

**Social scrapers do not.** Twitter, Facebook, LinkedIn and Slack fetch the raw HTML and leave.
Nothing a React hook does is visible to them. Untreated, every trader-tax link shared anywhere
would preview as the construction portal.

So `npm run build` runs `scripts/prerender-meta.mjs` after `vite build`. It writes
`dist/<route>/index.html` for each public route, copying the built shell with that route's title,
description, canonical, Open Graph tags and JSON-LD already in the markup — and stripping the
shell's own RBF Construction title, description and author tags so a crawler never sees two. The
browser still boots the same bundle and renders the same page, so there is one app, not two.

It also emits `sitemap.xml` (indexable pages only) and appends the sitemap line to `robots.txt`.

### Metadata lives in one place

`src/utils/seo/routeMeta.ts` is the source of truth, consumed by both the browser hook and the Node
build script. That is why it must stay free of React and of `import.meta.env`: the base URL is a
parameter, so each caller supplies it from wherever it legitimately knows it.

State pages derive their description from the page's own published intro, which keeps the
publishing-safety rule intact — structural facts only, no rates or dollar figures, because anything
in a meta description also shows up in a search result.

### Set the site URL

`VITE_PUBLIC_SITE_URL` must be set in the deploy environment. Without it, canonical and sitemap URLs
fall back to `DEFAULT_SITE_URL` and the build prints a warning. A wrong canonical is worse than a
missing one — it tells Google the real page lives somewhere else.

### Social share image

`OG_IMAGE_PATH` in `routeMeta.ts` is deliberately `null`. There is no TraderTaxHQ share image yet,
and pointing at the construction portal's placeholder would be worse than none. While it stays null
the Twitter card is `summary` rather than claiming `summary_large_image` for an image that does not
exist. Drop a 1200x630 asset in `public/` and set the path to upgrade every page at once.

### Checks

`npm run check` runs two scripts, neither of which needs a test runner:

- `check:seo` — asserts every unprotected marketing route in the router has registered metadata,
  that titles and descriptions are within renderable length, that `/inquiry` stays out of the index,
  and that no state page quotes a figure. A public route added without metadata fails here instead
  of silently shipping with the construction portal's title.
- `check:engines` — computes the slice of engine files the marketing pages reach transitively and
  asserts it stays self-contained. The marketing site is meant to live in its own deploy, which
  means those files get copied; the copy only builds while none of them imports the Supabase client,
  a context, or an internal page. It also records a checksum per file in `scripts/engine-manifest.json`,
  so a second checkout can be compared with `--against ../tradertaxhq`. Re-record with `--write`
  after deliberately changing an engine.

### What this does not fix

The page *body* is still client-rendered. Google handles that; a crawler that does not run
JavaScript sees correct metadata and an empty `<div id="root">`. Full prerendering of the body would
need a headless browser in the build. Worth doing if organic search becomes the main channel, not
worth it before then.
