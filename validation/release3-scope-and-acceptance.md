# Release 3 Scope and Acceptance Criteria

## Product promise

Release 3 adds the **economic-control core** beneath the existing receivable, evidence, order-to-cash, stock, and collection workflows. Its promise is simple: **when an authorised business event has an accounting consequence, Control Ledger can prepare, independently approve, post, and audit a balanced journal without rewriting the original operational fact.**

This is a controlled ledger foundation, not a claim that Control Ledger is now a complete ERP, statutory accounting system, bank integration, or tax engine.

## Included Release 3 capabilities

| Capability | Release 3 decision | Safety boundary |
|---|---|---|
| Canonical event envelope | Add an append-only economic-event record with source, actor, correlation, occurred/recorded time, payload version, and source-reference uniqueness. | Events describe an operational consequence; they do not replace the source order, invoice, evidence, or exception record. |
| Chart of accounts | Add organisation-scoped accounts, including code, name, account class, normal balance, and active state. | No default or fabricated customer balances, revenue, inventory, or opening balances will be seeded. |
| Balanced journals | Add journal headers and debit/credit lines in exact minor units. Posting is permitted only when each currency is balanced and every account is in scope and active. | Drafts are not ledger facts; posting is append-only, and posted transactions cannot be edited or deleted. |
| Source-linked invoice posting | Permit an authorised user to prepare a receivable/revenue journal for a valid Release 2 invoice, then have an independent authorised reviewer post it. | This creates a new ledger consequence only; it never changes the invoice, its receivable obligation, a payment, reconciliation, or collection state. |
| Independent approval | Require the poster not to be the journal preparer for source-linked accounting entries. | No self-approval and no silent auto-posting. |
| Derived ledger view | Provide journal and account-balance views derived from posted lines. | Derived balances are reporting views, not mutable source-of-truth columns. |

## Explicitly excluded from Release 3

Release 3 does not retrospectively post Release 1 evidence, receivables, the live NGN 29,997.78 variance, or existing Release 2 invoices. It will not manufacture opening balances, costs of goods sold, inventory valuation, bank confirmations, tax treatment, payment-provider webhooks, external accounting synchronisation, a transactional outbox/worker system, a statutory period-close process, or offline field sync. Those require verified accounting policy, real source data, and separate operating decisions.

## Role and control model

Owners and controllers may manage the chart of accounts. Managers and controllers may prepare a source-linked journal, subject to branch scope. Owners, controllers, and approvers may post it only when they did not prepare it. Operators cannot manage accounts or create/post journals. Every material write must remain organisation- and branch-scoped, idempotent, append-oriented, and audit-recorded in the same transaction.

## Acceptance criteria

1. A chart account is scoped, unique by organisation/code, and cannot be used once inactive.
2. Every posted journal has at least two lines, exactly balances debit and credit by currency using integer minor units, and has traceable source/event/correlation metadata.
3. Posted journals are immutable; correction uses an independently prepared and posted reversal or correcting journal rather than mutation.
4. A source-linked invoice journal verifies invoice organisation/branch/customer/currency/value and does not alter the existing invoice or receivable obligation.
5. A preparer cannot post their own source-linked journal, and a rejected/invalid posting leaves no partial journal, event, or audit record.
6. Account balances and journal history are derived from posted lines only.
7. The mobile-first ledger workspace clearly distinguishes **draft**, **ready for independent posting**, **posted**, and **reversed/corrected** without implying settlement or payment.
8. Type checks, Release 1–2 regressions, Release 3 protected-route tests, exact-money tests, desktop/mobile visual checks, and migration review pass before checkpointing.
