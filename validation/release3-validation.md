# Release 3 Validation Record

**Validated:** 25 August 2026

Release 3 adds a controlled canonical-event and double-entry ledger foundation without backfilling or modifying any Release 1–2 business record. Migration `0008_brown_captain_britain.sql` was reviewed before application and created only five additive tables: `economicEvents`, `ledgerAccounts`, `ledgerJournals`, `ledgerJournalLines`, and `ledgerJournalDecisions`, together with supporting indexes.

## Verified controls

| Control | Verified result |
|---|---|
| Exact balanced entries | A journal needs at least two lines, with one positive debit or credit per line and exact integer-minor debit/credit equality. |
| Scope and least privilege | Ledger account management, preparation, and posting use distinct central permissions and protected branch/organisation membership checks. |
| Source linkage | Invoice journal preparation requires an issued Release 2 invoice in the selected scope and stores a new canonical event plus journal consequence. It does not update the invoice or receivable obligation. |
| Approval separation | A preparer is rejected from posting their own source-linked journal. An independent approver posting a balanced ready journal is covered by regression test. |
| Immutability | Posted journals are not edited or deleted. A reversal is a new equal-and-opposite ready journal requiring independent posting. |
| Derived reporting | Account balances are derived only from independently posted journal lines. |

## Automated and visual evidence

`pnpm check && pnpm test` completed successfully with **22 test files and 76 tests**. Ledger desktop and mobile preview checks rendered the new Ledger workspace, the empty safety state, the explicit account action, role-bound next actions, and the existing application footer. No chart account, event, journal, invoice, payment, stock movement, evidence record, settlement, resolution, or collection follow-up was created during validation.

## Preserved business state and remaining gates

The live Release 1 evidence trail, reconciliation history, and **NGN 29,997.78** open variance remain unchanged. Release 3 does not claim a statutory/general-ledger certification, tax calculation, bank or PSP integration, inventory valuation, opening-balance migration, or production acceptance. The existing provider-level legacy storage remediation, public hosting mapping, and genuine real-device acceptance gates remain open.
