# AI Variance Assistance and Hausa Interface Validation

**Author:** Manus AI  
**Date:** 26 August 2026  
**Scope:** Owner-governed AI investigation assistance and curated Hausa core-interface localisation.

## Delivered behaviour

The Variance centre now contains a dedicated AI investigation card for the selected case. It is intentionally independent from investigation notes, resolution submission, and independent approval. The card is disabled by default. An organisation owner must read and affirm a processing notice before enabling it; an authorised owner, controller, or manager can then expressly request a single analysis for an open or investigating variance.

| Control | Verified implementation |
| --- | --- |
| Data model | Additive migration `0010_minor_squadron_supreme` adds disabled-by-default organisation policy fields and the append-only `varianceAiSuggestions` table. |
| Input minimisation | The server sends only the current exception’s control attributes, linked record attributes, and a short same-organisation, same-branch candidate set. It excludes raw files, signed URLs, storage keys, customer names and contacts, free-text notes, and unrelated branch records. |
| Output integrity | The model returns strict JSON-schema output. The server validates it with Zod, bounds the list lengths, and drops any candidate key not produced by the server. Invalid output fails closed. |
| Human authority | Suggestions never create evidence, links, notes, settlement, reconciliation, resolution proposals, approvals, journals, reversals, or period changes. The normal controlled workflow remains separate and blank. |
| Audit and replay safety | A proposal and matching audit event are inserted in one transaction. Requests have actor-and-action-bound idempotency records. |
| Hausa interface | A browser-local English/Hausa preference drives curated shell, dashboard, Variance-centre, and AI-assistance copy. It does not change database values, server results, money, references, roles, statuses, exports, or timestamps. |

## Automated validation

The complete validation command, `pnpm check && pnpm test`, passed on 26 August 2026. The suite now contains **28 test files and 99 tests**, up from the prior 25 files and 92 tests.

| Added verification | Result |
| --- | --- |
| Strict proposal parsing and unknown-candidate rejection | Passed. |
| Exact integer minor-unit candidate ordering | Passed. |
| Disabled AI policy prevents model invocation | Passed. |
| Unauthorised role prevents model invocation | Passed. |
| Defence-in-depth wrong-branch candidate filter excludes it from the model input | Passed. |
| Proposal-only persistence does not write resolution, allocation, or exception-status fields | Passed. |
| Owner policy update writes policy state and matching audit record | Passed. |
| Hausa switch updates curated copy and persists the browser-local preference | Passed. |

## Responsive and state observations

Desktop and 375 px mobile preview checks completed for the dashboard and `/variances`. The language selector remains visible in the compact header, and the disabled AI card fits above the governed decision panel without crowding or pre-populating its resolution field. Development browser and server logs showed no new client errors or failed requests.

The live database was checked after implementation. The organisation’s AI-assistance policy remains disabled with no acceptance timestamp. The existing exception `8338df03-8947-4623-a1e8-b1d75c14a42f` remains **open**, retains its exact `2999778` NGN minor-unit impact, has no resolution timestamp, and has **zero** AI suggestion rows. No model call was made against live business data during this implementation.

> **Acceptance boundary:** This check validates code, protected contracts, preview rendering, and the additive schema. It does not replace genuine signed-in user acceptance, an owner’s meaningful decision to enable AI processing, or the existing external provider-object remediation gate.
