# Dedicated Variance Centre Validation

**Validated:** 26 August 2026

The Variance centre is a dedicated, active-scope workspace over the existing Release 1 exception and approval records. It does not introduce a second financial record, duplicate a reconciliation result, or create a separate resolution mechanism. It presents the same append-only investigation notes, proposed-resolution submission, decision history, and independent approval/return controls in a clearer queue-and-detail layout.

## Verified behaviour

| Control | Verified result |
|---|---|
| Scope | The queue uses the existing protected branch-scoped exception list. |
| Exact values | Outstanding totals aggregate integer minor units by currency; no float calculation is used. |
| Workflow states | Open work, awaiting independent decision, resolved, and all-case filters keep investigation, review, and final history distinct. |
| Resolution boundary | A proposal does not settle a receivable, alter evidence, post a ledger entry, or automatically resolve a variance. |
| Independence | The existing server control still prevents a submitter from approving their own resolution proposal. |
| Live case | The NGN 29,997.78 unmatched-record variance remains open with no proposal or decision submitted. |

`pnpm check` and `pnpm test` passed with **25 test files and 92 tests**. New pure queue tests cover open versus approval versus resolved filtering and exact multi-case currency totals. Desktop and phone-sized previews verified the selected real variance, queue filters, decision boundary, and collapsible investigation trail.
