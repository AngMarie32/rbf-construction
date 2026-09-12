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

**Gap worth closing next:** state-specific pages. Traders in California, New Jersey, and
Pennsylvania face genuinely different answers, the state register in the app already tracks those
positions, and nobody is writing about it.

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
