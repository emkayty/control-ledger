# AI Variance Assistance and Hausa Interface Safeguards

**Author:** Manus AI  
**Status:** Implementation boundary for the current controlled public pilot  
**Date:** 26 August 2026

## Purpose

This milestone adds two usability aids to Control Ledger: a narrowly scoped AI assistant for investigating an existing variance, and a user-selected Hausa interface for the authenticated control workspace. Neither aid changes the product's source-of-truth records or the chain of human accountability.

> **Control boundary:** An AI suggestion is an investigation aid, not evidence, a reconciliation, a settlement instruction, a posted journal, a resolution proposal, or an approval decision.

## AI assistance boundary

| Area | Required behaviour | Explicitly excluded |
| --- | --- | --- |
| Enablement | Disabled by default. Only an organisation owner may enable it after acknowledging the processing notice. | Silent activation, inherited receipt-extraction consent, or automatic model calls. |
| Invocation | A permitted user must expressly request an analysis for one open scoped exception. | Background analysis, batch analysis, or analysis of a closed exception. |
| Data minimisation | Send only the exception's control attributes and a short, same-branch candidate list: references, record kinds, statuses, currencies, exact minor-unit values, and relevant timestamps. Do not send raw files, signed URLs, storage keys, customer names, contacts, free-text investigation notes, or unrelated branch records. | Evidence bytes, receipt images, customer PII, cross-organisation data, cross-branch data, and raw audit material. |
| Output | Strictly parse a bounded structured proposal containing potential causes, candidate references, confidence, and review steps. Each displayed item is labelled as a suggestion only. | Unstructured action commands, model tool calls, or a model-selected financial action. |
| Persistence | Store an append-only proposal with model identifier, confidence, structured output, actor, correlation ID, and timestamp; write a matching in-transaction audit record. | Editing or deleting a prior suggestion, overwriting the exception, or treating the output as proof. |
| Authority | Resolution notes and independent approval remain in the existing governed workflow and require a human-entered rationale. | Creating a note, matching records, submitting a resolution, settling a debt, posting/reversing a journal, changing period status, or resolving an exception. |

The model is selected at runtime from the available platform catalogue. The intended first choice is the available fast structured-analysis model, with a controlled fallback only when the preferred model is unavailable. The request uses strict JSON-schema output and a bounded output size. A malformed or unavailable model response fails closed and asks the user to continue the normal manual review rather than fabricating a proposal.

## Hausa localisation boundary

The language preference is a local user-interface preference stored in the browser. It must not alter stored timestamps, money values, source references, account codes, statuses, exports, access rights, policies, or any server-side result. English remains available at all times.

| English control concept | Hausa interface wording | Presentation rule |
| --- | --- | --- |
| Control desk | **Wurin kula da aiki** | Use as a navigation label only. |
| Evidence intake | **Shigar da shaida** | Keep source identifiers unchanged. |
| Variance centre | **Cibiyar bambanci** | Pair with the canonical English title in explanatory copy where useful. |
| Open variance | **Bambancin da bai rufe ba** | Keep exact currency and status value visible. |
| Investigation | **Bincike** | Human work remains the authoritative activity. |
| Proposal | **Shawarar warwarewa** | Make clear that it awaits human review. |
| Independent decision | **Yanke hukunci mai zaman kansa** | Keep the English phrase in parenthesis in high-control copy. |
| AI suggestion only | **Shawarar AI kawai** | Always include the no-action-taken boundary. |
| Ledger | **Ledger (rijistar lissafi)** | Retain the canonical accounting term to avoid ambiguity. |
| Audit trail | **Tarihin bincike (audit trail)** | Retain the canonical English term in parentheses. |

Core navigation, the dashboard cues, the Variance centre, and the AI-assistance explanation are manually curated in Hausa. Canonical financial and legal identifiers, controlled statuses where translation could alter their exact meaning, NGN values, invoice and source references, and account codes remain unchanged or appear alongside English. This is deliberate: the language option improves comprehension without changing an auditable business fact.

## Known limitations and acceptance position

The assistant's confidence describes only the quality of the suggestion against the limited input. It is not a verification score and must not be read as payment proof, legal advice, an accounting determination, or approval. The existing unresolved NGN 29,997.78 variance must remain open until an authorised human follows the normal investigation, proposal, and independent-decision process.

This implementation remains a controlled public-pilot feature. It does not close the pre-existing external gates for legacy provider-object rotation/revocation or genuine authorised real-device acceptance.
