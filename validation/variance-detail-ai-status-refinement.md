# Variance Detail and AI-Status Refinement

**Author:** Manus AI  
**Date:** 27 August 2026  
**Scope:** User-focused Variance detail hierarchy and visible active-policy indicator. No financial or AI-analysis action occurred.

## Detail-page refinement

The open case now leads with the only facts needed to orient a reviewer: title, exact value impact, status, severity, and due date. Repeated empty-resolution guidance was removed. The optional investigation-note history now appears before the governed decision area, matching the intended operating sequence: inspect, note evidence, then submit a genuine proposal for independent review.

| Area | Refinement | Safeguard retained |
| --- | --- | --- |
| Case context | Retained a compact title, risk/status line, exact value, and conditional existing proposal. | The value, source status, and decision state remain unaltered. |
| AI assistance | Kept the single request action, the proposal-only boundary, and the three-analysis limit in one quiet card. | AI cannot alter, prefill, reconcile, settle, post, resolve, or approve. |
| Investigation | Moved expandable notes ahead of the decision form. | Notes remain append-only and separately auditable. |
| Controlled decision | Presented after evidence-gathering, with one concise explanation and the existing independent approval flow. | Submission still does not settle a receivable or alter evidence. |

## Dashboard indicator

The dashboard now reads the existing protected `varianceAi.policy.get` state for the active organisation and branch. When the policy is enabled, the hero contains a single linked purple indicator: **AI variance assistance active · Suggestions only · people decide**. It links to the Variance centre and intentionally makes no claim of automatic matching, resolution, or approval. The indicator stays absent if the policy is disabled or the protected status query has no enabled result.

The English/Hausa localisation dictionary includes the short active-policy title and human-authority note. Amounts, statuses, identifiers, exports, and server-side data are unchanged.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | `pnpm check` passed. |
| Regression suite | **28 test files / 102 tests** passed. |
| Localisation coverage | The language-context test now verifies English and Hausa active-policy badge copy. |
| Desktop review | The dashboard badge appears within the hero rather than as a new panel; the Variance detail uses a clear AI → notes → controlled-decision sequence. |
| 375 px mobile review | The active badge remains compact in the hero; exact case facts, optional notes, and the governed decision form stack cleanly without horizontal clipping. |

> The active badge reflects the enabled policy only. No AI suggestion was requested, and the existing NGN 29,997.78 variance remains open and unresolved.
