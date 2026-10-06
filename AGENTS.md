# Project decisions

- Sort project choices with `sortProjectsOpenFirst` using project status, keeping completed and closed projects selectable after open projects; one rule prevents inconsistent ordering across pages.- QuickBooks report parsing in `qbImport.ts` skips bill-payment/transfer rows and reads vendor names from group-header rows, so vendor-grouped reports don't double count costs.
