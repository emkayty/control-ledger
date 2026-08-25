# Release 1–3 Consolidated Control Baseline

**Consolidated:** 25 August 2026

Control Ledger is now presented and implemented as one mobile-first economic-control baseline. The work is intentionally modular: each layer adds a controlled consequence to the prior layer instead of retroactively overwriting facts or pretending an unverified integration is complete.

## Verified implementation baseline

| Layer | Implemented control chain | User-facing workspace | Boundary preserved |
|---|---|---|---|
| Release 1 | Scoped receivables, evidence, append-only corrections, deterministic reconciliation, exceptions, investigation, approval separation, controlled preview, and audit. | Control desk, Receivables, Evidence intake, Exceptions, Audit trail. | Evidence is not settlement; the NGN 29,997.78 variance remains open. |
| Release 2 | Products, batches, stock movement, orders, confirmed delivery, invoice-linked new receivable, collection queue/follow-up, and evidence-governance records. | Operations and Collections. | Inventory is movement-derived; follow-up does not settle debt; new invoices do not alter Release 1 obligations. |
| Release 3 | Canonical economic events, chart accounts, exact balanced journal preparation, independent posting, reversal preparation, and derived balances. | Ledger. | Prepared journals are not posted entries; ledger posting does not mark invoice payment or resolve an exception. |
| Consolidated reporting | Active-scope balance CSV, active-scope journal-line CSV, formatted Ledger PDF report, and inclusive UTC prepared-date filtering. | Ledger reporting controls. | Export is read-only; formula-like CSV cells are neutralised and no reporting action changes a record. |

## Completed validation

The implementation passed TypeScript validation and **24 automated test files / 83 tests**. Desktop and mobile previews verified the consolidated dashboard panel, Operations, Collections, Ledger navigation, date filter, CSV actions, and PDF-report action. The code does not seed products, accounts, orders, invoices, evidence, movements, follow-ups, decisions, or balances for demonstration.

## Remaining gates that cannot be represented as completed code

| Gate | Why it remains open | Required evidence or action |
|---|---|---|
| Provider-level legacy receipt-object remediation | The application cannot rotate or revoke a previously exposed provider-managed object key. | Provider confirmation/reference, object rotation or revocation, then protected-path re-test. |
| Published hosting mapping | A prior configured domain observation served an earlier release/hosting-level 404. | Confirm that the configured public domain serves the current checkpoint and Release 2–3 routes. |
| Genuine real-device acceptance | A real authenticated mobile flow and genuine independent business approval cannot be fabricated. | Authorised users must validate on their devices without inventing a variance resolution. |
| External financial completeness | Tax, bank/PSP integration, opening balances, inventory valuation, statutory reporting, and external accounting synchronisation require separate verified policy and source data. | Independent design, approved accounting policy, integrations, and operating evidence. |

The external gates do not erase the implemented control baseline. They restrict the claims that can be made about unrestricted production readiness, provider security closure, statutory accounting, and real-world operational acceptance.

## Published-route observation

On 25 August 2026, the configured public domain successfully loaded the authenticated `/ledger` route and its existing application shell. An earlier observation displayed the prior Ledger interface without the newly saved UTC period fields or Ledger PDF action. A subsequent cache-busted public check of the current checkpoint confirmed the active **Prepared from (UTC)** and **Prepared to (UTC)** fields, **Ledger PDF** action, and filtered journal empty-state text. The latest Ledger reporting controls are therefore live on the configured public domain. No public-page action created or changed a business record.
