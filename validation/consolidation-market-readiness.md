# Control Ledger Consolidation and Market-Readiness Assessment

**Prepared by:** Manus AI  
**Date:** 27 August 2026  
**Scope:** Codebase consistency, controlled Pharmacy reference search, resilience checks, usability, delivery discipline, commercial positioning, and launch gates.

## Executive position

Control Ledger remains internally coherent when described as an **evidence-to-decision control platform** for FMCG distributors, with optional industry packs sharing the same audit, scope, approval, and exact-value core. It is not a general ERP, clinical system, bank-confirmation service, or legal/compliance certification product. The core operating promise is intentionally narrower:

> **Help an accountable team compare what was expected with the proof received, make mismatches visible, and preserve an independent decision trail before a business consequence is taken.**

The current release is suitable for a **controlled, instrumented pilot** under the retained governance gates. It must not be represented as universally “market certified”, clinically ready, legally compliant in every setting, or able to guarantee that a payment, receipt, decision, or medicine supply is valid. That boundary protects both customers and the product’s credibility.

## Consolidation findings and applied improvements

| Area | Finding | Applied improvement | Result |
| --- | --- | --- | --- |
| Pharmacy lookup | A patient-name or prescription-ID lookup would introduce health-identifying search data into a workflow deliberately designed to store neither. | Replaced the requested field with a `REQ-` **Control Ledger request-reference** search. New drafts receive the reference server-side; the search accepts the `REQ-` format only. | Quick lookup without adding patient names, prescription IDs, prescription text, or clinical search capability. |
| Scope and scale | The Pharmacy queue originally fetched all requests for a branch. | Added organisation/branch-scoped cursor pagination with a maximum page of 100 requests; the UI loads 50 at a time only when the user asks. | Predictable queue work and a more scalable read path. |
| Search safety | A free-text query could be mistaken for personal or prescription searching and could enable wildcard-style lookup. | Server validates the permitted reference prefix and characters before a database lookup. Tests reject patient-style, prescription-style, and `%`-containing queries. | Fail-closed boundary at the service contract, not merely the user interface. |
| Loading continuity | Lazy specialised workspaces initially displayed a bare loading canvas. | Moved the asynchronous fallback inside the existing protected dashboard shell. | Lazy routes retain navigation and product context while loading. |
| Initial load | The main client asset was above 1 MB before specialised-route splitting. | Lazy-loaded all non-dashboard workspaces, including Ledger, Variances, Pharmacy, Records, Operations, Collections, Access, and Audit. | Main application asset reduced to **770.82 kB** uncompressed (**217.31 kB gzip**); reports and specialist packs load only on demand. |
| Delivery discipline | Quality steps existed but were manually composed. | Added a `pnpm verify` command and a locked-dependency GitHub quality gate for typecheck, test, and production build on pushes and pull requests. | Repeatable pre-merge and main-branch verification. |
| Product vocabulary | The new operational workflow was still named “Pharmacy preview” in the navigation. | Consolidated English/Hausa navigation copy to **Pharmacy control** / **Ikon kantin magani**. | A more accurate, professional product language. |

## Reconciled business logic

Control Ledger is consistent when all sectors use the same non-negotiable control sequence: **source fact → evidence or observed event → deterministic comparison/exception → human proposal → independent decision → governed consequence**. A record at one stage is not silently converted into a record at a later stage.

| Domain event | What the platform records | What it must not infer or perform automatically |
| --- | --- | --- |
| FMCG receivable | Expected exact-value obligation, evidence, matching outcome, variance, and decision trail. | That a screenshot settles an invoice, or that an unmatched payment is valid. |
| Order and delivery | Product, stock, delivery, invoice, and resulting receivable facts. | That an operational action extinguishes a debt or posts a journal. |
| Ledger | Independently prepared/postable accounting consequence and period control. | That a journal posting reconciles proof, resolves a variance, or moves cash. |
| Variance AI | Requested, minimised same-branch suggestions saved as investigation material. | Reconciliation, settlement, resolution, approval, posting, or financial decision. |
| Pharmacy control | Owner-controlled policy, pharmacist attestation, Pharmacy batch, draft, separate review, and explicit supply event. | Patient selection, prescribing, dose calculation, substitution, clinical advice, or autonomous supply. |

The control objective follows the product’s existing differentiated position: evidence is not treated as settlement, an exception is not treated as a decision, and a decision is not treated as an unlogged mutation. This is deliberately different from copying broad accounting, merchant, or distributor-management suites feature-for-feature.[1] [2] [3]

## Stress and resilience evidence

| Scenario exercised | Evidence | Result | Interpretation |
| --- | --- | --- |
| Full regression | `pnpm verify` | **33 test files / 118 tests passed**. | Existing access, reconciliation, evidence, variance, ledger, attachment, AI boundary, Pharmacy, and localisation tests remain green. |
| High-volume queue model | 2,000 non-production request records in the pure queue test. | Reference filter and urgency ordering remained deterministic; test completed in **15 ms**. | Demonstrates client model correctness under a larger local list; it is not a substitute for production load testing. |
| Invalid Pharmacy search | Unit calls using patient-like text, prescription-like text, and `REQ-12%`. | All rejected as bad input before a controlled list lookup. | Prevents the new search surface becoming a loosely defined sensitive-data or wildcard search. |
| Pharmacy availability | Existing focused backend tests. | Missing, inactive, expired, insufficient, and valid in-date batch candidates are distinguished. | The code keeps batch eligibility explicit and does not select a batch for the user. |
| Owner control | Existing focused backend test. | An activation phrase that differs from the exact confirmation is rejected before a policy handler runs. | Policy activation is explicit; it is not a toggle-like accidental action. |
| Build and dependency integrity | Production build and production dependency audit. | Build passed; audit reported **no known production dependency vulnerabilities**. | A clean package audit is useful but does not certify the whole deployed environment. |
| Responsive review | Desktop and 375 px mobile review of the Pharmacy control surface. | Compact filter bar, reference search, safety copy, and owner controls stayed legible without horizontal overflow. | The no-data/disabled state was intentionally preserved; no live action was submitted. |

The final desktop review confirmed the **Pharmacy control** navigation label, owner-disabled policy state, clearly separated authorisation/activation cards, compact request-reference search, and the full read-only filter group in one consistent control hierarchy. The 375 px mobile review preserved the same order without horizontal overflow or obscuring the queue search or safety boundary.

Read-only database verification after all changes returned zero records for Pharmacy policies, pharmacist authorisations, dispensing requests, decisions, supply events, and Pharmacy batch balances. The existing control exception remains `open`, has `valueImpactMinor` of `2999778` (NGN 29,997.78), and has no resolution timestamp.

The first cache-busted public observation for checkpoint `af48fae9` loaded the existing controlled Pharmacy workflow and preserved the disabled policy, zero-authorisation state, and no-clinical-data boundary. It was still serving the prior navigation label and prior queue toolbar without the `REQ-` search field, so the consolidation release is recorded as awaiting normal public propagation. No form, filter, search, approval, or supply action was used.

The second cache-busted public observation completed after a short propagation interval but still served the prior **Pharmacy preview** navigation and pre-search queue toolbar. The managed development preview remains verified with the updated `REQ-` reference search, cursor load control, and **Pharmacy control** label. A third public check remains required; no public input or controlled action was used.

After the deployment-success notice, the third cache-busted public check showed **Pharmacy control** in the navigation and the visible **Find by Control Ledger request reference** input. The page explicitly stated that it does not search or store patient names, prescription identifiers, or prescription text, while retaining disabled-by-owner policy, zero pharmacist authorisations, no-clinical-automation, and the unchanged empty queue. No public input, filter, authorisation, activation, batch, review, supply, financial, AI, or variance action was used. This completes public verification of the consolidation milestone.

OWASP ASVS is used as a practical verification reference because it provides a basis for testing web-application technical controls and secure-development requirements.[4] The Pharmacy feedback also follows the WCAG 2.2 principle that detected input errors should identify the failed input and describe the problem in text, rather than relying on colour or a silent failed submit.[5]

## Risk register and remaining launch gates

| Priority | Gate or risk | Current position | Required next evidence |
| --- | --- | --- | --- |
| Critical before health-identifier processing | Patient names, prescription IDs/text, and other health-identifying data. | Not stored, searched, exported, or used by the Pharmacy pack. | Documented lawful basis, data map/classification, data-subject notice, DPIA, retention/deletion design, access review, incident process, and pharmacist/data-protection approval. |
| Critical before real Pharmacy operations | Pharmacist authorisation, licensed premises, storage/handling practice, controlled-drug rules, and operating procedures. | Technical policy is disabled by default and requires owner attestation; it does not independently verify a licence. | Qualified pharmacist-led operational acceptance and any applicable Pharmacy Council / local regulatory review. |
| High | Legacy provider-managed receipt-object exposure. | Application-level signed access protections are in place; historical provider-side rotation/revocation remains external. | Provider evidence that affected historical objects have been rotated/revoked where applicable. |
| High | Pilot acceptance. | Browser, type, test, and build checks are evidenced. | Genuine authenticated user acceptance on real target devices, networks, and operating roles using real approved records. |
| Medium | Production service assurance. | Locked CI, automated tests, scoped server checks, and audit trail exist. | Monitoring/alert ownership, availability objectives, backup/restore exercise, incident runbook, and periodic access-review evidence. |
| Medium | Capacity assurance. | Cursor-controlled Pharmacy queue and route splitting are implemented; local model stress test passed. | Representative traffic/load test against a non-production environment and defined capacity targets. |

The Nigeria Data Protection Commission describes data-subject rights and data-controller responsibilities under the Nigeria Data Protection Act framework.[6] The Pharmacy Council of Nigeria Act publication is the primary authority for external pharmacy practice, premises, storage, distribution, sale, dispensing, and record obligations.[7] These sources are grounds for the gates above; they are not a claim that this application has completed those external obligations.

## Blue Ocean strategic position

Control Ledger should avoid a feature race against ERPs, merchant selling tools, and broad distributor-management suites. Large suites can be appropriate where a business needs extensive accounting, inventory, purchasing, multi-company, field-sales, or analytics functionality; simple merchant tools can be appropriate for straightforward selling and stock tasks.[1] [2] Distributor-management systems often focus on field ordering, schemes, stock visibility, offline work, and distributor analytics.[3] The blue-ocean move is not “more modules”; it is **lower-friction accountable truth for the moments where money, goods, evidence, and responsibility disagree**.

| Strategic move | Eliminate | Reduce | Raise | Create |
| --- | --- | --- | --- | --- |
| Control-first workflow | Generic dashboards, fabricated insight, and hidden corrections. | Data entry, duplicate rekeying, training burden, and report noise. | Evidence linkage, exact values, exception visibility, role clarity, and independent decision rationale. | A compact “what is at risk, what proof exists, and who must act?” control loop. |
| Affordable adoption | Upfront ERP-scale implementation and bundled modules a small distributor does not use. | Branch onboarding scope and non-essential integration work. | Transparent pilot setup, role-based guidance, mobile clarity, and verifiable trails. | A one-branch control pilot that proves daily use before adding operations, ledger, or domain packs. |
| Trustworthy assistance | Autonomous financial/clinical decisions. | Opaque AI and automatic matching. | Human review, data minimisation, traceability, and safe recovery states. | Explicitly requested, proposal-only assistance with hard non-action boundaries. |

## Business Model Canvas

| Block | Control Ledger design |
| --- | --- |
| Customer segments | Small and mid-sized FMCG distributors first; later, controlled school-fee and Pharmacy operating packs for customers that meet their own domain gates. Primary users are owners, branch managers/controllers, cashiers/sales administrators, approvers, and authorised pharmacists. |
| Value proposition | A compact, mobile-first control desk that turns expected value, evidence, mismatch, investigation, independent decision, and governed consequence into one accountable trail. It aims to reduce leakage blind spots and argument-by-memory—not to replace accounting or clinical judgement. |
| Channels | Direct pilot with distributor owners; accountant/controller referrals; sector associations and implementation partners; later API/partner channels for established accounting, PSP, DMS, or school systems. |
| Customer relationships | Guided single-branch onboarding, evidence-based configuration, role-specific training with the customer’s approved sample records, regular control-review check-ins, and expansion only after adoption evidence. |
| Revenue streams | Transparent base subscription per active branch and named operational users; fixed onboarding/migration package; paid optional packs for advanced operations, ledger controls, integrations, or approved domain modules. Avoid charging per safety action or hiding core access controls behind a premium tier. |
| Key activities | Maintain the shared control core; support secure onboarding; assure data quality; run release validation; maintain connectors; collect pilot outcomes; and improve only the workflows that reduce real unanswered questions. |
| Key resources | Control-rule IP, exact-value and audit architecture, secure hosting/storage, product/design discipline, implementation playbooks, trusted domain advisers, and quality/incident processes. |
| Key partners | Distributors and pilot champions; accountants/controllers; payment providers/banks where later authorised; verified data-protection advisers; qualified pharmacists for Pharmacy governance; implementation and training partners. |
| Cost structure | Product engineering, secure infrastructure/storage, support/onboarding, testing/quality, domain/compliance review, customer success, and later integration/notification costs. Cost discipline comes from shared-core reuse and staged packs, not from removing controls. |

## Next practical sequence

The next commercial step is a **measured FMCG pilot**, not immediate multi-industry scale. Define one business outcome such as lower unresolved variance value, faster evidence-to-decision time, or fewer duplicate proof investigations; choose one branch and named roles; complete the external security/device gates; and baseline performance before expansion. Pharmacy should remain a controlled technical pack until a customer has satisfied pharmacist-led and data-governance acceptance. School fees should begin as a separate pack only when its learner/guardian data model, receipt allocation logic, term fee policy, and school-specific acceptance criteria are approved.

## References

[1]: https://www.sage.com/en-ng/inventory-management/ "Sage Nigeria — Inventory Management"
[2]: https://www.getbumpa.com/blog/the-5-best-inventory-management-software-for-small-businesses "Bumpa — Inventory Management Software for Small Businesses"
[3]: https://www.pepupsales.com/blog/distributor-management-software-for-african-markets/ "PepUpSales — Distributor Management Software for African Markets"
[4]: https://owasp.org/www-project-application-security-verification-standard/ "OWASP Application Security Verification Standard"
[5]: https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html "W3C WCAG 2.2 Understanding Success Criterion 3.3.1: Error Identification"
[6]: https://ndpc.gov.ng/ "Nigeria Data Protection Commission"
[7]: https://pcn.gov.ng/wp-content/uploads/2024/09/Pharmacy-Council-of-Nigeria-Act-2022-publication.pdf "Pharmacy Council of Nigeria (Establishment) Act, 2022"
