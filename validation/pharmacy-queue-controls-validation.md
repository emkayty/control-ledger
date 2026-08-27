# Pharmacy Dispensing Queue Controls Validation

**Date:** 27 August 2026  
**Scope:** Read-only status, date, urgency, and sort controls for the authorised, selected-branch Pharmacy dispensing queue.

## Control boundary

The queue receives only the already scoped `pharmacy.dispensing.list` result. Status, inclusive request-created date range, derived urgency, and sort order are applied client-side. The controls make no mutation, do not reload an unscoped dataset, and cannot change a request’s status, urgency, batch, approval, supply state, or audit history.

Urgency is deliberately derived, not written. A pending-review or approved-for-supply item becomes **Urgent** once one day old; pending-review, approved-for-supply, returned, or a two-day-old draft becomes **Needs attention**; supplied and rejected items are **Completed**. The helper documents and tests this presentation rule so it is not confused with clinical priority, medicine urgency, or a persistent workflow field.

| Control | Observation |
| --- | --- |
| Status filter | Includes all valid request-state projections plus an all-statuses view. |
| Date range | Filters inclusive request creation dates, without modifying the underlying record. |
| Urgency | Read-only time-and-state indication; it never decides pharmacist review or batch eligibility. |
| Sort | Supports urgency-first, newest, oldest, and status ordering deterministically. |
| Mobile layout | Filters stack into full-width, touch-sized controls at 375 px. |

## Initial verification

Focused TypeScript and queue/UI tests passed before full regression: the pure helper covers urgency derivation, status/urgency/date filtering, and urgency-first sorting; the existing Pharmacy feedback tests continue to cover a visible validation loading state and eligible/ineligible message. Desktop and mobile review show the filter bar remains compact and does not displace the disabled policy, authorisation, or no-clinical-automation boundaries.

The full validation command, `pnpm check && pnpm test && pnpm build`, passed after the controls were added. The regression suite has **33 test files / 114 tests**. The production package passed; it retains only the pre-existing Vite large-chunk advisory.

No Pharmacy request, batch, policy, pharmacist authorisation, review, stock movement, supply event, financial record, AI record, or variance changed during this work.
