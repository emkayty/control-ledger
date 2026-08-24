# Release 1 Readiness Record

## Implemented control surface

Control Ledger provides a secure, organisation- and branch-scoped Release 1 workflow for receivable obligations, payment and delivery evidence, deterministic reconciliation, stored evidence metadata, and accountable exception handling. The product stores exact minor-unit monetary values, creates append-only financial and audit records, assigns correlation identifiers to material activity, and uses idempotency keys for material write actions.

| Area | Release 1 capability | Status |
|---|---|---|
| Access control | Scoped owner, controller, operator, manager, and approver permissions | Implemented |
| Receivables | Customer and receivable-obligation capture with exact money values | Implemented |
| Evidence | Provenance-aware observation intake, duplicate protection, quarantine path, and managed evidence-file metadata | Implemented |
| Reconciliation | Exact, partial, short, duplicate, delayed, and unmatched rule outcomes with rule-version provenance | Implemented |
| Exceptions | Severity, value impact, owner, due date, notes, resolution, and approval-aware closure | Implemented |
| Auditability | Append-only audit history, linked corrections, correlations, and idempotency contracts | Implemented |

## Quality evidence

The current build passes TypeScript validation and **16 automated tests** covering authentication logout, scope permission decisions, exact-money validation, deterministic reconciliation outcomes, file-scope controls, immutable-record safeguards, idempotency contract presence, and approval separation. The first-workspace entry flow has been inspected on desktop and mobile viewports, and the post-restart development logs contain no active errors.

## Required customer-owned validation before operational launch

The platform deliberately does not create artificial organisations, customers, receivables, payment evidence, or exception records in a customer workspace. Before live use, the workspace owner should create the first real organisation and branch, then perform a controlled acceptance test with approved operational data. This test should validate role assignment, branch boundaries, import/evidence retention, reconciliation choices, exception approval separation, and record correction handling.

> **Compliance readiness is separate from feature readiness.** Before processing live personal data or connecting banks, payment providers, or external data sources, complete the legal, privacy, security, and integration validation gates documented in the delivery package.

