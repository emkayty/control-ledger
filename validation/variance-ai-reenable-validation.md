# Variance AI Re-enablement Validation

**Author:** Manus AI  
**Date:** 26 August 2026  
**Scope:** Safe owner re-enablement path for the existing proposal-only Variance AI assistant.

## Implemented safeguards

The current organisation remains disabled. It can now be re-enabled only through a clearer owner-controlled flow: the owner opens the focused activation panel, acknowledges the processing boundary, and types **`ENABLE VARIANCE AI`** exactly. This deliberate confirmation prevents an accidental click from authorising variance metadata processing.

| Safeguard | Result |
| --- | --- |
| Owner-only activation | The protected router continues to require the owner role; controller and operator calls fail before a policy change. |
| Typed confirmation | An enable request fails closed unless the exact displayed confirmation phrase is supplied with the notice acknowledgement. |
| Re-enable audit | The transactional append-only policy event records the purpose, notice version, and owner-typed confirmation method. |
| Duplicate activation | An enabled policy cannot be silently re-enabled or have its terms overwritten; it must be disabled first. |
| Prompt minimisation | Evidence-source names are removed from the model input and stored candidate snapshot. Raw files, storage URLs/keys, customer details, and investigation notes remain excluded. |
| Request budget | A case accepts at most three saved analyses in the previous 24 hours; the fourth request is rejected before any model call. |
| Human control | AI output remains a suggestion only. It cannot add notes, prefill a resolution, reconcile, settle, post, approve, or resolve anything. |

## User-focused interface

The disabled state is reduced to a single status, one calm explanation, and one owner action. The detailed notice and typed confirmation are disclosed only after the owner chooses to enable the feature. Once enabled, authorised users get one primary **Request AI suggestions** action, a compact three-per-day budget hint, and no controls that could imply automatic record changes. The existing human resolution and independent-approval workflow remains visually separate.

English and Hausa labels were updated for the shorter activation sequence. The confirmation phrase intentionally remains canonical English to ensure the server can enforce one unambiguous owner action.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | `pnpm check` passed. |
| Regression suite | **28 test files / 102 tests** passed. |
| Production package | `pnpm build` passed. |
| Typed owner confirmation | Covered by helper and protected-router tests. |
| Budget gate before LLM call | Covered by protected-router test. |
| Source-name exclusion | Covered by protected-router prompt inspection. |
| Disabled policy interface | Reviewed at desktop and 375 px mobile widths. The card is compact, the decision form remains separate, and no policy change was submitted. |

> **Live activation boundary:** No policy enablement or analysis request was made during development or validation. The owner must still make the explicit in-product confirmation after this version is published.
