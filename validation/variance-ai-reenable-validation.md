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

## Public propagation observation

The first cache-busted public check for `ceb73677` loaded the authenticated Variance centre and preserved the disabled policy, the open NGN 29,997.78 case, and the separate human controls. It still displayed the previous, more verbose AI card, however, rather than the new focused **Enable AI assistance** entry. This was a normal publication-propagation delay.

A second cache-busted check after the deployment-success notice rendered the current focused policy card. It shows the compact disabled state, a single **Enable AI assistance** owner action, the proposal-only boundary, and the concise human-authority explanation. The page continues to show the untouched open NGN 29,997.78 variance, an empty decision form, and no AI suggestion. No activation, analysis request, evidence action, settlement, resolution, or approval was submitted during public verification.

## Confirmed owner activation

Following the owner’s explicit confirmation, the policy was enabled on **27 August 2026 at 00:11 UTC** through the in-product guarded form. The acknowledgement was selected and the exact phrase `ENABLE VARIANCE AI` was entered before the activation was submitted.

The public Variance centre then displayed **AI variance assistance is enabled for this organisation**, a single **Request AI suggestions** action, the three-analysis-per-24-hour boundary, and the separate human controlled-decision form. The scoped Audit trail shows the new **variance ai · policy enabled** organisation event by the owner with correlation ID `aa909232-14ea-4451-a54a-b1e1cf0d24ff`.

The direct scoped-record verification confirmed `varianceAiAssistanceEnabled = 1`, a policy-acceptance timestamp, and actor ID `1`. It also confirmed **zero** rows in `varianceAiSuggestions` for the existing discrepancy and that exception `8338df03-8947-4623-a1e8-b1d75c14a42f` remains `open` with exact minor-unit impact `2999778` and no resolution timestamp.

> The policy is enabled, but no analysis has been requested. AI remains an explicitly user-triggered, proposal-only investigation aid; no financial or control-workflow state was changed by enabling it.
