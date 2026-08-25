# Release 4 Scope and Acceptance Criteria

## Release purpose

Release 4 turns the Release 3 ledger foundation into a more controlled operating ledger by introducing **accounting-period governance**. It answers a practical production question: *which accounting window is open, which journals belong to it, and who can independently close it after review?*

This is an additive production-operationalisation release. It does not convert Control Ledger into a statutory accounting suite or invent the operating history that a genuine business must provide.

## Included capabilities

| Capability | Control decision | Safety boundary |
|---|---|---|
| Scoped accounting periods | Owner/controller can define a dated accounting period for an organisation and branch. Overlapping periods are rejected. | No period is seeded or backfilled; a business configures its own calendar. |
| Open-period linkage | New Release 3 invoice journals and reversals require an active open period once a branch has configured periods. | Existing journals remain unchanged; an absence of configured periods retains Release 3 backward compatibility. |
| Close request | An authorised controller/manager can request close of an open period only when there are no ready journals in its window. | Requesting close does not alter a journal, invoice, receivable, stock, evidence, exception, or balance. |
| Independent closure | An owner/controller/approver who did not request the close can finalise it with a rationale. | A requester cannot close their own period; a closed period cannot accept new Release 4-linked journals. |
| Audit and readiness view | Period creation, request, rejection, and closure are append-only, correlation-tracked audit facts; the Ledger workspace displays the current state and next action. | Readiness is not a tax filing, statutory close, or certification. |

## Deliberate exclusions

Release 4 does not create opening balances, calculate tax, value inventory, post cost of goods sold, integrate banks/PSPs/accounting suites, issue filings, backfill historical journals, resolve the open NGN 29,997.78 variance, or close a period automatically. It also does not replace the provider-level receipt-object remediation or genuine real-device acceptance gates.

## Acceptance criteria

1. A period is organisation- and branch-scoped, uses UTC date boundaries, and rejects invalid, overlapping, or duplicate windows.
2. A newly created invoice journal or reversal is linked to an active configured open period; where a branch has no configured periods, existing Release 3 behaviour remains available without silently creating one.
3. A close request is blocked if a ready journal falls within that period. It is audit-recorded and idempotent.
4. An independent eligible reviewer cannot close their own request. Final closure updates only the period state and decision trail in one transaction.
5. New journal preparation for a closed period is rejected. A closure correction is an append-only rejection/reopen policy decision, never a hidden date edit.
6. The mobile-first Ledger workspace exposes period status, pending close decisions, and plain-language next actions without seeding a period or journal.
7. All existing Release 1–3 tests continue to pass, and Release 4 adds protected scope, overlap, period-linkage, no-ready-journal, self-closure, idempotency, and audit rollback coverage.
