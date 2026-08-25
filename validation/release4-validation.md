# Release 4 Validation Record

**Validated:** 25 August 2026

Release 4 adds **accounting-period governance** to the Release 3 ledger without changing any pre-existing journal, invoice, receivable, stock, evidence, exception, or variance record. Migration `0009_lying_thundra.sql` was reviewed and applied as an additive change: two new governance tables plus a nullable `periodId` reference for future journals.

## Implemented control chain

| Step | Release 4 control | Financial boundary |
|---|---|---|
| Define a period | Owner/controller creates a real branch-scoped period with UTC start/end and a rationale. Overlapping windows are rejected. | Creating a period does not create a balance, opening entry, invoice, or journal. |
| Prepare a new consequence | Once periods exist for a branch, new invoice-journal and reversal preparation must resolve to an active open period. | Existing Release 3 journals remain unmodified; a branch without configured periods remains backward-compatible. |
| Request close | An owner/controller/manager requests close only when no ready journals remain within the period. | Requesting close changes only period governance state. |
| Independent decision | A different owner/controller/approver approves closure or rejects it back to open with a rationale. | The decision does not post a journal, settle a receivable, or resolve any exception. |
| Inspect state | The Ledger workspace shows open, awaiting independent close, or closed states and the latest decision. | The empty state does not seed a period or operating data. |

## Validation evidence

`pnpm check && pnpm test` completed successfully with **24 test files and 90 tests**. New regression coverage verifies inclusive UTC period boundaries, operator denial, overlap rejection, ready-journal close blocking, active-period linkage for a newly prepared invoice journal, self-closure denial, and independent authorised closure. Desktop and full mobile Ledger previews confirmed the compact Release 4 accounting-period panel, setup entry point, no-data safety state, and existing reporting controls.

## Preserved facts and remaining gates

The live Release 1 OPay evidence trail, reconciliation history, and **NGN 29,997.78** open variance remain unchanged. Release 4 is not a statutory close, tax filing, inventory valuation, bank/PSP integration, external accounting sync, or production certification. The existing provider-level legacy receipt-object remediation and genuine authorised real-device acceptance remain external, incomplete gates.

## Public propagation observation

Immediately after checkpoint `d66fb1fb`, two cache-busted checks of the configured public `/ledger` route still showed the earlier Release 3 Ledger interface without the **Release 4 · accounting periods** panel. The current Release 4 behaviour is validated in the authorised development preview, but current-version public propagation remains unverified and must not be represented as live until the public route updates.
