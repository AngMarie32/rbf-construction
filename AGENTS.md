# Project decisions

- Sort project choices with `sortProjectsOpenFirst` using project status, keeping completed and closed projects selectable after open projects; one rule prevents inconsistent ordering across pages.- QuickBooks report parsing in `qbImport.ts` skips bill-payment/transfer rows and reads vendor names from group-header rows, so vendor-grouped reports don't double count costs.
- Financial report imports (`financialReportImport.ts`) tag overhead_items and project_billing rows with `[batch:<id>]` in notes, because those tables lack import_batch_id and undo must find them.
