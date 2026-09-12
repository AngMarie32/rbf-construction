# TraderTaxHQ — consultation & filing system

End-to-end workflow for a trader tax practice, built into this app:

```
client intake  ->  secure documents  ->  analysis  ->  consultation  ->  filings
   (token link)      (TitanFile)        (engines + AI)   (agenda/notes)   (checklist)
```

Everything is scoped to an **engagement** — one client, one tax year, one service.

---

## 1. Where things live

| Area | Path |
|---|---|
| Database schema | `supabase/migrations/20260912170000_tradertaxhq_consultation_system.sql` |
| Domain types | `src/types/tradertax.ts` |
| Typed DB accessor | `src/integrations/supabase/tradertax.ts` |
| Tax year parameters | `src/utils/traderTax/taxYearConfig.ts` |
| Intake questionnaire | `src/utils/traderTax/intakeSchema.ts` |
| Document catalog | `src/utils/traderTax/documentCatalog.ts` |
| TTS factor analysis | `src/utils/traderTax/ttsAnalysis.ts` |
| Prop firm / funded accounts | `src/utils/traderTax/propFirmAnalysis.ts` |
| Section 475 / elections | `src/utils/traderTax/electionEngine.ts` |
| Entity & retirement model | `src/utils/traderTax/entityAnalysis.ts` |
| Federal projection | `src/utils/traderTax/projection.ts` |
| Filing matrix | `src/utils/traderTax/filingMatrix.ts` |
| Orchestrator | `src/utils/traderTax/consultationEngine.ts` |
| Memo PDF | `src/utils/traderTax/consultationPdf.ts` |
| Firm deadline engine | `src/utils/traderTax/deadlineEngine.ts` |
| Firm obligation catalog | `src/utils/traderTax/firmObligations.ts` |
| Security control catalog | `src/utils/traderTax/securityProgram.ts` |
| WISP generator | `src/utils/traderTax/wispDocument.ts` |
| Lead triage and fee quoting | `src/utils/traderTax/leadScoring.ts` |
| Prior-year rollover | `src/utils/traderTax/rollover.ts` |
| Practice metrics | `src/utils/traderTax/practiceMetrics.ts` |
| State treatment notes | `src/utils/traderTax/stateConformity.ts` |
| Engagement letter | `src/utils/traderTax/engagementLetter.ts` |
| Payout calculator | `src/utils/traderTax/payoutCalculator.ts` |
| Capital loss calculator | `src/utils/traderTax/lossCalculator.ts` |
| Pages | `src/pages/tradertax/` |
| Public marketing pages | `src/pages/public/` |
| Panels | `src/components/tradertax/` |
| Edge functions | `supabase/functions/tth-intake-public`, `tth-analyze`, `titanfile-sync`, `tth-lead-capture` |

Routes: `/tradertax` (pipeline dashboard), `/tradertax/leads`, `/tradertax/clients`,
`/tradertax/clients/:clientId`, `/tradertax/calendar`, `/tradertax/analytics`, `/tradertax/security`,
and the public `/intake/:token`, `/inquiry`, `/prop-firm-taxes`, `/prop-tax-calculator`,
`/trader-taxes`, and `/trader-status-check`.

Acquisition is documented separately in `docs/tradertaxhq-marketing.md`.

---

## 2. Setup

### 2.1 Apply the migration

```sh
supabase db push          # or paste the migration into the SQL editor
```

Creates `tth_clients`, `tth_engagements`, `tth_intakes`, `tth_document_requests`, `tth_analyses`,
`tth_positions`, `tth_filings`, `tth_consultations`, `tth_activity` — all RLS-protected and scoped
through `has_company_access` on the client's company.

### 2.2 Regenerate Supabase types (optional)

`src/integrations/supabase/types.ts` is generated and does not know about the new tables.
`src/integrations/supabase/tradertax.ts` re-types the shared client from the hand-written domain types,
so nothing breaks. After regenerating types you can keep or drop that shim.

### 2.3 Migrations, in order

```
20260912170000_tradertaxhq_consultation_system.sql   clients, engagements, intake, docs, analysis, filings
20260912190000_tradertaxhq_practice_operations.sql   firm profile, deadlines, security program, leads
20260912210000_tradertaxhq_rollover_time_states.sql  time entries, state positions, rollover lineage
```

The second migration also adds `assigned_to` / `reminder_days` to `tth_filings` and `retention_until`
to `tth_engagements`.

### 2.4 Edge function secrets

| Secret | Used by | Notes |
|---|---|---|
| `TITANFILE_SUBDOMAIN` | `titanfile-sync` | e.g. `acme` for `https://acme.titanfile.com` |
| `TITANFILE_API_ID` | `titanfile-sync` | JWT username |
| `TITANFILE_API_KEY` | `titanfile-sync` | JWT password |
| `TITANFILE_OWNER_EMAIL` | `titanfile-sync` | optional; act on behalf of a user you have delegation rights for |
| `LOVABLE_API_KEY` | `tth-analyze` | same gateway the other AI functions use |

`tth-lead-capture` needs no secrets — it runs on the service role and only writes lead rows.

```sh
supabase functions deploy tth-intake-public tth-analyze titanfile-sync tth-lead-capture
```

`tth-intake-public` runs with `verify_jwt = false` (clients have no login); the other two require a
session and re-check engagement access against RLS before doing anything.

### 2.5 Verify the tax year parameters — do this before quoting numbers

Every year in `taxYearConfig.ts` ships as `status: 'unverified'`. Check the brackets, standard
deduction, wage base, and plan limits against the IRS revenue procedure named in `sourceNote`, then
flip that year's `status` to `'verified'`. Until you do, the analysis screen and the exported memo
both carry a visible DRAFT warning.

### 2.6 Set your own prices

`FEE_SCHEDULE` in `leadScoring.ts` is a placeholder rate card so the quote calculator runs. Every
figure in it is invented. Replace them before a quote reaches a prospect.

---

## 3. The workflow

### Step 1 — Client and engagement
`/tradertax/clients` → **New client**. Creates the client plus a first engagement (tax year + service).
Add later years with **New year** on the client page.

### Step 2 — Intake
**Intake** tab → **Generate client link**. Produces `/intake/<48-hex-token>`, valid 45 days, copied to
your clipboard. The client fills it out with no login; answers autosave every few seconds and the
questionnaire locks on submit.

The schema is ~90 questions across 11 sections. Fields tagged `drivesAnalysis` feed a calculation —
the intake panel lists the ones still blank, because a missing trade count silently degrades the TTS
score rather than erroring.

You can also fill or correct answers internally on the same tab.

### Step 3 — Secure documents (TitanFile)
**Documents** tab:

1. **Build from intake** — filters the ~30-item catalog down to what this client's facts actually
   require (futures 1099-B only if they trade 1256 contracts, IRA statements only if they trade in an
   IRA, FBAR support only if there is a foreign account, and so on).
2. **Create channel** — `POST /channels/` on TitanFile, stores the channel id and URL on the
   engagement and client.
3. **Invite client** — `POST /channel_contacts/` with `sharing_permissions: contributor`.
4. **Send request list** — posts the checklist as one formatted secure message (`POST /messages/`).
5. **Sync uploads** — pages `GET /channel_files/`, matches each file back to an open request (by
   document code in the filename or path first, then keyword match on the request name), and flips
   matched requests to `received`. Unmatched files are reported so you can assign them by hand.

No API credentials? **Link existing** stores a channel URL and id you created manually in TitanFile.
Status can always be driven by hand from the dropdown on each row.

### Step 4 — Analysis
**Analysis** tab. The deterministic engines recompute live from whatever is currently in the intake:

- **Trader tax status** — weighted factor model (frequency 24%, holding period 22%, hours 18%,
  volume 16%, continuity 10%, businesslike conduct 10%) producing a 0–100 composite and a tier, with
  the observed value, benchmark, and case cite behind every factor. There is no bright-line test; the
  benchmarks are what practitioners defend, not authority.
- **Section 475(f)** — current state, recommendation, the full pro/con, and every deadline with the
  IRC 7503 weekend/holiday shift applied: election statement by the unextended due date of the prior
  year's return (Rev. Proc. 99-17), the 75-day internal election for a new entity, Form 3115
  perfection, revocation, and the section 988 forex election.
- **Entity** — prices the S-corp management company against staying put: Solo 401(k) capacity from
  W-2 compensation, section 162(l) health premiums, payroll tax cost, and administrative drag, netted
  at the client's marginal rate.
- **Projection** — ordinary vs capital split under the current election posture, 1256 60/40, the
  section 1211(b) capital loss limit and carryforward, NIIT, and the estimated tax safe harbor with a
  quarterly number.
- **Findings** ranked critical → info, and **proposed positions** ready to push to the action plan.

Buttons on that tab: save a snapshot, push positions to the action plan, build the filing checklist,
draft the memo with AI, export the PDF.

**Draft memo** sends only the engine output to `tth-analyze`. The model is barred from computing
anything or citing authority that is not already in the payload — it turns structured findings into a
client memo and a call script. Everything it writes is editable before it leaves the screen.

### Step 5 — Consultation
**Consultation** tab. Schedule it, pull the agenda straight from the analysis, work the "ask the
client" list, take notes, and capture action items with owners and dates.

### Step 6 — Filings
**Filings** tab. The checklist is derived from the client's facts: 1040 and schedules, 4797 vs
Schedule D/8949 depending on the 475 posture, 6781, 3115, 8829, 8960/8959, 8995, 1065/1120-S and
payroll forms, FinCEN 114 and 8938, 8621, state returns, 1040-ES, and the extensions. Each row tracks
due date, extended due date, status, and confirmation number, with overdue rows flagged.

---

## 3A. The client segment this is built for

**Funded-account traders and small-scale traders.** That choice is baked into the engines, the
pricing, and the lead routing, and it is worth understanding because a funded trader is not a trader
for tax purposes in the way a self-directed trader is.

### Why prop traders are a different tax animal

A funded trader is usually being paid by a firm for performance, and the firm usually reports it on a
Form 1099-NEC. That one fact inverts almost everything:

| | Self-directed trader | Funded (prop) trader |
|---|---|---|
| Character of income | Capital gain | Ordinary, on Schedule C |
| Self-employment tax | None — trading gains are not earned income | **15.3% applies** |
| Section 475 election | Central question | Largely irrelevant — no own-account securities to mark |
| Trader tax status | Gates the expense deductions | Much less load-bearing — Schedule C is already available |
| Solo 401(k) | Needs an S corporation to create earned income | **Works with no entity at all** |
| Why an S corporation | To *create* W-2 comp for a retirement plan | To *shrink* the SE tax base |

`propFirmAnalysis.ts` implements the right-hand column: characterization from the actual form the
firm issued, self-employment tax on 92.35% of net profit with the wage-base cap and additional
Medicare tax, evaluation and reset fee deductibility, section 183 profit-motive risk for traders who
buy evaluations and never get funded, a QBI estimate with the specified-service-trade caveat, Solo
401(k) capacity on self-employment earnings, and a sole-proprietor vs S-corporation comparison that
prices the SE tax saved against payroll cost *and the QBI deduction the wages give up*.

When a client trades only a funded account, the orchestrator suppresses the trader-status, section
475, and self-directed entity findings rather than reporting them as problems — they are the wrong
questions for that client — and the filing matrix drops Schedule D, Form 8949, and Form 6781, because
there are no own-account dispositions to report.

### What that means for pricing and routing

`FEE_SCHEDULE` is shaped for a volume practice: flat-fee products (funded account return, small
trader return, trader-status return) with small add-ons, rather than one high-touch fee. The numbers
are still placeholders — the *shape* is the part that matters.

Lead triage branches on the same distinction. A prop trader is scored on payout size, form type, and
cleanup needs, not on trader tax status — scoring them on TTS would rank the target client as
unqualified. A small-scale trader with a real return to prepare lands in "qualified" and routes
straight to a flat-fee quote and the intake link, with no call needed. Only two things route to a
call instead: prior-year cleanup, and evaluation fees with no payouts ever received, which is the
section 183 conversation.

---

## 4. Practice operations

### 4.1 Deadline calendar — `/tradertax/calendar`

One list of every date the firm owes anyone. Obligations are assembled at read time from five sources
rather than stored in a table of their own, so nothing goes stale when an intake answer or a filing
status changes:

| Source | What it contributes |
|---|---|
| `tth_filings` | Form due dates. A filed extension moves the live date to the extended one. |
| Election engine | 475(f) windows computed per engagement from the tax year and intake answers. |
| `tth_engagements` | Scheduled consultations. |
| `tth_document_requests` | Outstanding requests carrying a due date. |
| `tth_positions` | Action plan items with a due date. |
| `tth_firm_deadlines` | The firm's own compliance dates. |

Closed work drops out automatically — accepted filings, received documents, implemented positions,
closed engagements, and election windows that lapsed more than a year ago.

Each obligation gets a bucket (overdue / 7 / 30 / 90 / later) and a severity, with statutory dates
escalating faster than internal ones. **Load firm calendar** seeds 16 practice obligations from
`firmObligations.ts` — PTIN renewal, CE hours, EFIN check, WISP review, training, access review,
backup test, vendor review, information returns, the firm's own return, the MeF shutdown, retention
purge, engagement letter refresh, fee review, capacity planning. Completing a recurring one rolls it
forward instead of closing it.

The MeF shutdown date moves every year and the seeded date is a placeholder — the entry says so.

**Export**: `.ics` (with a 7-day alarm per event) to subscribe in Google Calendar or Outlook, and CSV.
Both are snapshots, not live feeds — re-export after changes.

### 4.2 Security program — `/tradertax/security`

A paid preparer is a financial institution under the Gramm-Leach-Bliley Act, which puts the practice
under the FTC Safeguards Rule (16 CFR part 314); the IRS restates it in Pub. 4557 with a template in
Pub. 5708. This page is the register and the plan generator.

- **Controls** — 27 controls across governance, access, data protection, infrastructure, people,
  service providers, and incident response. Each carries the requirement, its citation, a review
  cadence, and a prompt for what evidence to record. Readiness is scored on required controls only,
  with partial credit for in-progress work and **half credit removed when a control's review is
  overdue** — an unreviewed safeguard is a claim, not a control.
- **Plan** — generates a WISP PDF from the firm profile and the register. Open gaps are printed rather
  than hidden, because a plan claiming safeguards the firm does not have is worse than no plan. It
  comes out stamped DRAFT and unsigned.
- **Service providers** — the 314.4(f) register, with contract and MFA status per provider.
- **Training** — the 314.4(e) log, with next-due dates.
- **Incidents** — the log, flagging when taxpayer data was involved and whether the IRS has been
  notified.

Controls carrying `smallFirmExempt` are the ones 16 CFR 314.6 excuses for a firm holding data on
fewer than 5,000 consumers — the written risk assessment, penetration testing, the written incident
response plan, and the annual written report. They stay in the register because they remain good
practice, and because a growing firm crosses that line without noticing.

This is a tracking tool, not legal advice. Have counsel review the plan.

### 4.3 Lead pipeline — `/tradertax/leads` and public `/inquiry`

The public inquiry form asks about 20 questions — contact, trading activity, instruments, situation —
and posts to `tth-lead-capture`, which allowlists the fields it accepts, validates the email,
verifies any `?firm=` id against the companies table, and de-duplicates repeat submissions inside an
hour. It writes a lead row and nothing else: never a client, never an engagement.

Triage is **not** computed in the edge function. The leads page recomputes it from the stored answers
using the same TTS factor model the full analysis uses, so there is one implementation and nothing
depends on a score posted by an untrusted client. Fit weighs trader status at half the total, then
revenue signals, urgency, and the complexity the firm is specifically equipped for.

Fit is not the same as trader status: a prospect who fails the factors can still be a good client who
needs to be told no, correctly. The tier drives a suggested next action rather than an accept/reject.

**Convert** creates the client, the engagement, and an intake pre-filled with the screening answers,
so nobody is asked the same question twice.

### 4.4 Engagement letters — Documents tab

Engagement letters ride on the app's existing e-sign module rather than a parallel system. The letter
is generated as a PDF (scope, exclusions, client responsibilities, fees, and the section 7216 consent),
uploaded to the `esign-documents` bucket, and wrapped in an envelope tagged
`source_type = 'tth_engagement'` — so it appears in the e-sign dashboard beside everything else, with
the same reminders, audit trail, and signing certificate.

Scope defaults to the filing checklist; anything not listed is out of scope, which is what prevents
the fee argument in April. When the envelope completes, `engagement_letter_signed_at` is set from the
completion timestamp.

Signature field positions are **measured at draw time**, not hardcoded. The signature block flows with
the content, so a longer scope list pushes it down a page — the generator returns the anchors it
actually drew, and the overlay follows them.

### 4.5 Prior-year rollover — "New year" on a client

Splits last year's intake into what carries and what does not:

- **Carries** — anything describing who the client is: profile, filing status, states, entity details,
  elections in force, instruments traded. Marked as rolled so the client confirms rather than retypes.
- **Clears** — anything describing a period: trade counts, hours, results, income, expenses,
  contributions, point-in-time compliance answers, and this year's goals. A stale figure carried
  forward silently is worse than asking again.
- **Derives** — last year's closing position becomes this year's opening one: the unused capital loss
  from the prior projection, and prior-year tax and AGI for the estimated tax safe harbor.

Optionally carries the recurring filing checklist (dropping one-offs like Form 3115 and extensions)
and any action item still open at year end.

### 4.6 Practice analytics — `/tradertax/analytics`

Revenue, realization, cycle time, and conversion. Every metric returns null rather than zero when the
inputs are missing — a realization rate of "$0/hr" because nobody logged time is a lie, so the page
shows "—" and says why.

Time tracking feeds it: a two-field logger on each engagement's Activity tab writes to
`tth_time_entries`, which is what makes effective rate and utilization computable at all.

Charts use a palette validated with the dataviz validator against both surfaces — light
`#2f7bf5`/`#0f9488`, dark `#3b82f6`/`#0d9488` — passing the lightness band, chroma floor, CVD
separation, normal-vision floor, and contrast checks in both modes.

### 4.7 State treatment — Analysis tab

A section 475 election is federal. Whether a state respects the ordinary characterization, whether a
trading loss can offset wages, and whether short-term gains carry their own rate are separate
questions per state, and they are where trader returns quietly go wrong.

`stateConformity.ts` ships notes for the states where the answer is structural or well known, each
tagged with a confidence:

- `high` — structural (a state has no individual income tax)
- `medium` — a known rule that moves with legislation; verify rate, threshold, and effective date
- `research` — flagged as an area to research; no position asserted

Anything not covered returns an explicit research prompt rather than silence. Positions the firm
confirms are written to `tth_state_positions` and displayed above the shipped notes, so the research
is done once and every future client in that state inherits it.

---

## 5. Design decisions worth knowing

**The engines are pure and run in the browser.** `runConsultationAnalysis` takes intake answers and
document status and returns a plain object. No network, no model. That means the analysis is
reproducible, diffable, and testable, and the AI step is strictly downstream of it.

**AI never computes.** `tth-analyze` receives the finished analysis and writes prose. If a number is
wrong in the memo, it is wrong in the engine, and it is fixable in code.

**Client documents never touch this app's storage.** TitanFile holds the files; this app holds
metadata (file id, name, path, size) and the request status.

**The public intake never touches the browser's Supabase client.** The token resolves server-side in
an edge function running on the service role, which returns only the fields the client's own form
needs — never internal notes, analyses, or other clients' data.

**Tax years are data, not code.** Adding 2027 is one entry in `taxYearConfig.ts`.

---

## 6. Extending it

- **New intake question** — add a field to a section in `intakeSchema.ts`. It renders everywhere
  automatically. Mark it `drivesAnalysis` if an engine reads it.
- **New document request** — add an entry to `DOCUMENT_CATALOG` with an `appliesIf` predicate.
- **New finding or position** — add it in `consultationEngine.ts`; the PDF, the analysis screen, and
  the action plan all pick it up.
- **New form** — add it to `buildFilingRequirements` in `filingMatrix.ts`.
- **New rollover rule** — add the key to `PERIOD_RESULT_KEYS` in `rollover.ts` to clear it; anything
  not listed carries by default.
- **New state note** — add a profile to `STATE_PROFILES` in `stateConformity.ts`, or record it in the
  app so it lands in `tth_state_positions`.
- **New firm deadline** — add a template to `FIRM_OBLIGATION_CATALOG` in `firmObligations.ts`.
- **New security control** — add it to `SECURITY_CONTROL_CATALOG`; the register, the readiness score,
  and the WISP all pick it up.
- **New inquiry question** — add the field to `INQUIRY_SECTIONS` in `leadScoring.ts` AND to
  `ALLOWED_KEYS` in the `tth-lead-capture` function, or it is silently dropped.

---

## 7. Limits — read before delivering anything

- Output is **draft preparer work product**, not tax advice. A licensed practitioner reviews it before
  a client sees it.
- The projection is federal only. No AMT, no credits, no state tax, no QBI computation, no passive
  activity limits.
- Tax year parameters are unverified until a human verifies them (§2.4).
- The TTS factor weights are a scoring convention, not law. Trader status is facts and circumstances,
  determined separately for each tax year, with the burden of substantiation on the taxpayer.
- Deadline math assumes a calendar tax year. Confirm against the client's actual year and filing
  history.
- Digital assets, forex, and prop firm arrangements are flagged for a written position rather than
  resolved automatically — the treatment turns on facts the intake cannot fully capture.
- The prop firm characterization follows the form the firm actually issued. Where a client believes
  the payouts are capital rather than compensation, that is a position to be documented before
  filing, not a setting to toggle. Reporting against a filed 1099 produces a matching notice.
- The security register tracks a program; it does not implement one. Marking MFA "implemented" does
  not turn MFA on.
- The fee schedule is placeholder pricing until you replace it.
- The calendar covers what this system knows about. Anything tracked elsewhere is still invisible to
  it.
- The state dataset covers a minority of states and asserts nothing it has not marked as structural.
  Treat it as a prompt list, not a reference.
- Analytics are only as good as the time logged. No time, no realization.
- The engagement letter is a template. Have counsel review the terms once, then treat that reviewed
  version as the firm's standard.

---

## 8. Still not in scope

Buy these rather than build them:

- **Return preparation and e-file** — Drake, UltraTax, Lacerte, ProConnect. This system tracks the
  forms; it does not produce or transmit them. A PTIN and EFIN are separate prerequisites.
- **Trade accounting** — TradeLog, GainsKeeper. Wash sale computation across accounts, section 475
  mark-to-market accounting, and Form 8949 generation from raw broker data. The intake asks for the
  wash sale number off the 1099-B; it does not derive it.
- **Tax research** — Checkpoint, CCH, Parker. Citations in the engine are not a research library.

Not built, and not bought either:

- **Marketing** — a landing page, calculator, and inquiry form exist and are wired together. There
  is still no content pipeline, email sequence, or analytics beyond lead source. See
  `docs/tradertaxhq-marketing.md`, and note that nothing in it is backed by keyword data yet.
- **Client billing** — engagement fees are recorded, but invoicing and payment collection are not
  wired up. The app's existing invoicing is modeled around construction projects.
