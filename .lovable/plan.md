## Weekly Report Subscriptions

A new page where each user creates one or more weekly recap subscriptions. Each subscription stores: name, sections to include, recipient list, day of week + hour (with timezone), optional project filter, and enabled flag. A cron job runs every 15 minutes, finds subscriptions whose `next_send_at` has passed, builds the recap, emails it as HTML + PDF attachment via Resend, then advances `next_send_at` by 7 days.

### Sections available
- Project status & progress (active projects, % complete, status)
- Financials (contract value, billed, paid, outstanding, estimated vs actual profit)
- Schedule & tasks (completed last 7 days, upcoming next 7 days, overdue)
- Documents & change orders (documents sent via Document Sender, change orders created/approved)

### UI (new route `/weekly-reports`, linked from sidebar under Settings group)
- List of the current user's subscriptions: name, schedule summary, recipients, enabled toggle, "Send test now", edit, delete
- Create/Edit panel:
  - Name
  - Checkbox group for the 4 sections
  - Recipients (tag input, comma/enter to add, validates emails)
  - Day of week (Sun–Sat) + hour picker
  - Timezone (defaults to browser tz)
  - Project filter (multi-select; empty = all projects)
  - Enabled toggle
- "Send test now" calls the edge function with `subscriptionId` and `test:true` — sends immediately without advancing schedule

### Backend

**Migration**
- `weekly_report_subscriptions` (user_id, name, sections text[], recipients text[], day_of_week int 0–6, hour int 0–23, timezone text, project_ids uuid[] nullable, enabled bool, last_sent_at, next_send_at, timestamps)
- `weekly_report_runs` (subscription_id, sent_at, status, error_message, recipient_count, sections text[])
- RLS: users manage their own subscriptions; runs viewable when the user owns the parent subscription
- Trigger to recompute `next_send_at` on insert/update of day/hour/timezone/enabled
- Enable `pg_cron` + `pg_net` (already standard); schedule a job every 15 min that POSTs to the edge function with the service-role-style invocation (using insert tool, not migration, per project rules)

**Edge function `send-weekly-report`**
- Modes: `cron` (no body / `{cron:true}`) — processes all due subscriptions; `test` (`{subscriptionId, test:true}`) — sends one immediately to its recipients without advancing
- For each subscription:
  - Aggregate data for the last 7 days, restricted to `project_ids` if set, by querying: `projects`, `billings`/`payment_applications`, `schedule_tasks`, `change_orders`, `bulk_invoice_sends` joined to `bulk_invoices`
  - Render HTML email (RBF Construction branding, dark-mode-safe inline styles)
  - Generate PDF using `pdf-lib` with the same content
  - Send via Resend (existing `RESEND_API_KEY`, `noreply@portal.rbfconstruction.com` sender)
  - Log to `weekly_report_runs`; on success advance `next_send_at` += 7 days, set `last_sent_at`

### Technical notes
- Reuse the existing Resend integration pattern from `send-bulk-invoice`
- PDF generation done server-side with `pdf-lib` (already used in client); keep layout simple — section headers + key/value tables, no charts
- `next_send_at` computed in SQL via `date_trunc` + interval math accounting for timezone using `timezone(tz, now())`
- Cron entry created with the insert tool (contains the project's anon key, so not a migration)
- Sidebar entry added under the existing Settings area; page guarded by `ProtectedRoute`

### Out of scope
- Per-recipient unsubscribe links (recipients are user-curated, not marketing)
- Charts/graphs in the PDF
- Editing past runs; runs are append-only history
