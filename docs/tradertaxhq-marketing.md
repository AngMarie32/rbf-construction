# TraderTaxHQ — acquisition plan

For a volume practice serving funded-account and small-scale traders. This is a plan to test, not
a forecast: **there is no keyword volume data behind any of it.** Nobody has pulled search numbers,
so treat every intent below as a hypothesis with an obvious way to check it, and let the leads table
settle the argument within one season.

---

## 1. What is built

| Asset | Route | Job |
|---|---|---|
| Landing page | `/prop-firm-taxes` | Converts someone who already suspects they have a problem |
| Payout tax calculator | `/prop-tax-calculator` | Lead magnet — gives real value before asking for anything |
| Inquiry form | `/inquiry` | Captures the lead, pre-filled from the calculator |

The three are wired together: the calculator's CTA carries payouts, fees, and filing status into the
inquiry form as query parameters, so a prospect who has already done the work is not asked to do it
twice. Leads arrive tagged `calculator` or `landing`, and conversion by source shows up in
`/tradertax/analytics`.

The calculator runs the same self-employment tax engine the internal analysis uses. That is
deliberate: a marketing calculator that disagrees with the firm's own working paper is a liability.

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
| "day trader taxes small account" | Needs a small-trader page | The other half of the segment, currently under-served by the site |

**Gap worth closing next:** everything built so far speaks to funded traders. Small-scale
self-directed traders — the other half of the stated market — have no page. They arrive at
`/inquiry` cold.

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
