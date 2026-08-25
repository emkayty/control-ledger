# Release 1–3 Consolidation Boundary

## One aligned control chain

Control Ledger now operates as one modular control baseline rather than three disconnected feature sets. Release 1 establishes **expected value, evidence, deterministic reconciliation, exceptions, independent decisions, and audit**. Release 2 extends that chain through **product, order, stock receipt, delivery, invoice, receivable, and collection follow-up**. Release 3 introduces the optional accounting consequence: **canonical economic event, balanced journal preparation, independent posting, reversal, and derived balance**.

> An operational fact remains separate from its financial consequence. An invoice does not become payment, a receipt does not become settlement, a prepared journal does not become a posted entry, and an export never changes any fact.

## Consolidated user journey

| Operating stage | Control Ledger module | Truth boundary |
|---|---|---|
| Record expectation | Receivables and Operations | A receivable or order records a defined obligation or commercial intent. |
| Record proof and movement | Evidence intake and Operations | Evidence, delivery, and stock movement are attributed operational facts. |
| Compare and investigate | Control desk, Collections, Exceptions | Reconciliation and follow-up identify what agrees and what needs accountable action. |
| Make a governed decision | Exceptions and Ledger | An exception resolution and a journal posting each require their own controls; neither implies the other. |
| Review and share | Audit trail and Ledger exports | Audit history, current derived balances, and filtered reports are read-only views of recorded facts. |

## Export and reporting boundary

The consolidated Ledger workspace will provide the following active-scope outputs:

| Output | Contents | Period behaviour | Financial effect |
|---|---|---|---|
| Balance CSV | Current derived balances from independently posted lines | Not period-limited; labelled as current derived balance | None |
| Journal CSV | Journal and journal-line records in the selected inclusive UTC prepared-date range | Filters data before export; blank range means all scoped journals | None |
| Ledger PDF report | Report heading, active organisation/branch, selected period, current derived balances, and filtered journal-entry lines | Uses the same filtered journal data as CSV | None |

Date filters will use date-only inclusive UTC boundaries. A selected end date includes the entire UTC day; an inverted range is rejected before querying or exporting. Empty ranges remain valid and produce a clear empty state or report section, never fabricated rows.

## External gates not represented as completed code work

The following remain deliberately open because they require evidence or action outside ordinary product implementation:

1. The legacy provider-level raw object exposure needs provider rotation or revocation, followed by a re-test.
2. Public hosting mapping and the published deployment need verified current-route availability before production acceptance can be claimed.
3. Authenticated real-device mobile acceptance and genuine operating approval evidence must come from authorised users; they cannot be generated, seeded, or inferred by the application.

These boundaries prevent the consolidated baseline from overstating security, production readiness, accounting certification, or legal compliance.
