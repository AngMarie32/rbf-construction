# Making the portal beat the big platforms

## What the research found

I compared Procore, Autodesk Build, Buildertrend, CoConstruct, Fieldwire, Raken, Knowify and Contractor Foreman.

- Procore and Autodesk are strong on field work and job cost, but heavy and expensive.
- Fieldwire and Raken are excellent in the field but hand money off to another system.
- Knowify and Contractor Foreman are built around QuickBooks, but their cost tracking gets thin once you have phases, retainage or AIA billing.
- **Nobody lets you simply upload a QuickBooks report and have costs land on the right job.** Every one of them requires you to pre-configure QuickBooks to match their code list first. That is the gap we exploit.

Your portal already has a strong money side: schedule of values, G702/G703, change orders, payment applications, cash flow, loans, operating costs. What is missing is (a) the daily field record and (b) a painless path from your QuickBooks reports into job costs.

## Phase 1 — QuickBooks report import with automatic job matching

The headline feature. You export a report from QuickBooks Desktop (Job Profitability Detail, Transaction Detail, or a plain Excel/CSV export) and drop it in.

1. **Upload** an Excel or CSV export. The importer reads the columns itself, no fixed template required.
2. **Automatic matching.** Each line gets matched to a project and a cost category using: exact customer/job name, then fuzzy name matching, then vendor history (if Ferguson always went to Plumbing on Job X, it learns that), then the account/item name.
3. **Review screen.** Every row shows a confidence level. High-confidence rows are pre-checked; anything uncertain is flagged in red with dropdowns to fix job and category. Fix one row and matching rules can apply to the rest of the batch.
4. **Duplicate protection.** Lines already imported (same vendor, date, amount, reference) are detected and skipped so re-importing an overlapping report cannot double-count.
5. **Memory.** Every correction you make is saved as a mapping rule, so the next import needs less cleanup. Over time this approaches one-click.
6. **Import history** page: what was imported, when, by whom, totals, and a one-click undo of a whole batch.

Also included: a **cost code library** (CSI-style divisions matched to your existing categories) so costs roll up consistently across expenses, SOV, and reports, and a mapping table linking your QuickBooks account/item names to those codes.

## Phase 2 — Field execution

Built for office staff to review, with a phone-friendly capture screen for the field.

- **Daily logs** per project: date, crew and headcount, hours, work performed, weather pulled automatically, delays and their cause, deliveries, visitors, safety notes.
- **Photos** attached to a log or a project, with date, uploader, and optional tag to a cost code or punch item.
- **RFIs**: numbered, assigned, due-dated, with status (Open / Answered / Closed), response text and attachments.
- **Submittals**: spec section, type, ball-in-court, revision number, approval status.
- **Upgraded punch list**: assignee, due date, before/after photos, room/location, and a printable close-out report.
- **Daily log digest** emailed to whoever subscribes, reusing the existing report scheduler.

## Phase 3 — Cost intelligence

- **Committed cost tracking**: subcontracts and purchase orders recorded as commitments, so each job shows Budget / Committed / Actual / Remaining — something QuickBooks cannot do.
- **Cost-to-complete and WIP report**: percent complete, earned revenue, over/under billing, projected final cost and margin per job, plus a company-wide WIP schedule.
- **Job cost dashboard** per project tying daily log hours and imported costs to the same cost codes as the schedule of values.

## Order of work

I suggest shipping Phase 1 first since that is your stated pain, then Phase 2, then Phase 3. Each phase is usable on its own.

## Technical notes

- New tables: `cost_codes`, `qb_import_batches`, `qb_import_lines`, `qb_mapping_rules`, `daily_logs`, `daily_log_photos`, `rfis`, `submittals`, `commitments`, `commitment_items`. All company-scoped with RLS via `has_company_access`, following the existing pattern; `expenses` gains `cost_code_id`, `source`, `import_batch_id`, and an external reference for duplicate detection.
- Parsing uses SheetJS (already used by the export utilities) in the browser; matching runs client-side with a deterministic scorer, with an optional AI fallback through the existing Gemini function for stubborn rows.
- New pages: `/cost-import`, `/daily-logs`, `/rfis`, `/submittals`, `/wip`, plus tabs on Project Detail. Existing Expenses, Analytics, and Burn Analysis read the new cost code field.
