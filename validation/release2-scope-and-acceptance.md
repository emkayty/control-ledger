# Release 2 Scope and Acceptance Criteria

## Product promise

Release 2 extends Control Ledger from a receivable-and-evidence control desk into a **linked order-to-cash and stock-control workspace**. It does not attempt a premature full ERP replacement. The simple operating promise is: **record the order, confirm the goods movement, issue the linked receivable, follow up the collection, and investigate only the values that do not agree.**

## Included Release 2 capabilities

| Capability | Release 2 decision | Safety boundary |
|---|---|---|
| Product catalogue | Add scoped products with unit and reorder point. | New records only; no seeded operational products. |
| Batch/expiry | Add optional batch/lot records for FMCG traceability. | A lot cannot be created with a non-positive quantity. |
| Order-to-cash | Add customer orders, order lines, delivery confirmation, and invoices linked to new receivable obligations. | Release 1 receivables remain unchanged; invoice creation records a new linked obligation only. |
| Inventory | Add append-only stock movements and a derived branch stock position. | No mutable “current stock” is the source of truth; delivery/transfer movements must be positive exact whole units. |
| Collections | Add a derived collection queue, customer statement, and append-only follow-ups with clear short-payment reasons. | Follow-up does not settle or close a receivable. |
| Operational UX | Add compact Operations and Collections workspaces with role-aware next actions and plain business language. | No dummy orders, stock, invoices, or collection notes are created. |
| Security governance | Add provider-remediation register and evidence-retention review records. | A legacy object can be marked provider-confirmed only with a provider reference; this does not delete an object through the app. |

## Explicitly deferred rather than faked

The full double-entry general ledger, bank/PSP webhooks, external ERP connectors, route optimisation, demand forecasting, and an offline native field application require independent design, integration agreements, and real operating data. Release 2 establishes the linked facts and audit controls those later modules require; it must not manufacture a ledger balance, payment confirmation, or external settlement.

## Acceptance criteria

1. Every Release 2 write is tenant- and branch-scoped, protected, idempotent, and audit-recorded in its database transaction.
2. Product, order, delivery, invoice, stock movement, and collection records are append-oriented; corrections use new records rather than overwrite financial history.
3. Invoice issuance creates a **new** receivable obligation for the invoice and leaves Release 1 obligations untouched.
4. The stock position is derived from approved movement records; stock cannot become negative through a delivery or transfer action.
5. A collection follow-up changes no receivable, evidence, reconciliation, or exception status.
6. The provider-remediation register cannot claim legacy file exposure is resolved without a non-empty external provider reference.
7. The user interface gives each role one clear next action, handles mobile width, and distinguishes “recorded,” “matched,” “needs follow-up,” and “requires approval.”
8. Type checks, all Release 1 tests, new Release 2 tests, desktop render checks, and available real-device acceptance evidence pass before release checkpointing.
