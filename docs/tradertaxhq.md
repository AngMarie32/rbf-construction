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
| Section 475 / elections | `src/utils/traderTax/electionEngine.ts` |
| Entity & retirement model | `src/utils/traderTax/entityAnalysis.ts` |
| Federal projection | `src/utils/traderTax/projection.ts` |
| Filing matrix | `src/utils/traderTax/filingMatrix.ts` |
| Orchestrator | `src/utils/traderTax/consultationEngine.ts` |
| Memo PDF | `src/utils/traderTax/consultationPdf.ts` |
| Pages | `src/pages/tradertax/` |
| Panels | `src/components/tradertax/` |
| Edge functions | `supabase/functions/tth-intake-public`, `tth-analyze`, `titanfile-sync` |

Routes: `/tradertax` (pipeline dashboard), `/tradertax/clients`, `/tradertax/clients/:clientId`, and the
public `/intake/:token`.

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

### 2.3 Edge function secrets

| Secret | Used by | Notes |
|---|---|---|
| `TITANFILE_SUBDOMAIN` | `titanfile-sync` | e.g. `acme` for `https://acme.titanfile.com` |
| `TITANFILE_API_ID` | `titanfile-sync` | JWT username |
| `TITANFILE_API_KEY` | `titanfile-sync` | JWT password |
| `TITANFILE_OWNER_EMAIL` | `titanfile-sync` | optional; act on behalf of a user you have delegation rights for |
| `LOVABLE_API_KEY` | `tth-analyze` | same gateway the other AI functions use |

```sh
supabase functions deploy tth-intake-public tth-analyze titanfile-sync
```

`tth-intake-public` runs with `verify_jwt = false` (clients have no login); the other two require a
session and re-check engagement access against RLS before doing anything.

### 2.4 Verify the tax year parameters — do this before quoting numbers

Every year in `taxYearConfig.ts` ships as `status: 'unverified'`. Check the brackets, standard
deduction, wage base, and plan limits against the IRS revenue procedure named in `sourceNote`, then
flip that year's `status` to `'verified'`. Until you do, the analysis screen and the exported memo
both carry a visible DRAFT warning.

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

## 4. Design decisions worth knowing

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

## 5. Extending it

- **New intake question** — add a field to a section in `intakeSchema.ts`. It renders everywhere
  automatically. Mark it `drivesAnalysis` if an engine reads it.
- **New document request** — add an entry to `DOCUMENT_CATALOG` with an `appliesIf` predicate.
- **New finding or position** — add it in `consultationEngine.ts`; the PDF, the analysis screen, and
  the action plan all pick it up.
- **New form** — add it to `buildFilingRequirements` in `filingMatrix.ts`.

---

## 6. Limits — read before delivering anything

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
