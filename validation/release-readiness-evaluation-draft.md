# Release 1 Control Ledger — Critical Readiness Evaluation

**Assessment date:** 25 August 2026  
**Assessor:** Manus AI  
**Scope:** Release 1 FMCG distributor control platform, including the governed variance workflow, cross-branch variance monitoring, receipt preview, and OPay proposal extraction.

## Executive conclusion

**The platform has achieved a strong and credible Release 1 control foundation, but it has not yet achieved an unconditional production-ready or compliance-ready state.** The core business objectives are substantially implemented: exact-money reconciliation, append-only corrections and audit trails, tenant/branch scope enforcement, a human-governed variance workflow, owner/controller portfolio visibility, and a non-automatic OPay proposal flow are all present and evidenced. The real NGN 29,997.78 exception remains open, and neither its financial evidence nor settlement state was silently altered.

However, the assessment identified a material historic receipt-access exposure: a raw managed-storage object path was publicly reachable through the hosting-layer storage endpoint. The current source has been changed so the protected `getFile` procedure issues a provider-signed URL only after tenant and branch authorisation and omits raw storage metadata. That new behavior still needs a final post-propagation production check, and the **previously exposed object must be rotated or revoked at the storage-provider level**. OPay processing is now fail-closed with an owner-only enable/disable setting, a recorded acceptance decision, and an in-product notice; the live organisation remains disabled with no fabricated acceptance. Final production revalidation, real-device mobile evidence, and a genuine end-to-end approval decision remain outstanding.

> **Professional readiness verdict:** suitable for a tightly controlled pilot after the receipt-object exposure is remediated and reverified; **not yet suitable to claim full production, compliance, or audit certification readiness**.

## Assessment method and evidence base

| Area | Evidence reviewed | Result |
|---|---|---|
| Static correctness | TypeScript typecheck completed successfully. | Pass at each final source-validation run. |
| Automated regression coverage | 19 Vitest files and 65 tests passed after the latest source changes. | Strong targeted coverage; not a replacement for full end-to-end, load, or penetration testing. |
| Database integrity | Additive migrations through `0005_glamorous_champions.sql` were inspected and applied. | Existing financial, evidence, reconciliation, exception, and audit records were not altered by the enhancement work. |
| Signed-in desktop workflow | Owner-session production checks covered dashboard, evidence, controlled preview, editable OPay proposal handoff, exceptions, and audit trail. | Core desktop controls rendered and returned the expected real records. |
| Live business-state preservation | Production checks confirmed receivable `22232`, its OPay evidence, the proposal, and the open NGN 29,997.78 variance. | Preserved; no unauthorised submission, approval, resolution, or settlement claim was made. |
| Security benchmark | OWASP ASVS and OWASP File Upload Cheat Sheet were reviewed. | Used as a benchmark, not a certification claim. [1] [2] |

## Goal-by-goal evaluation

| Intended Release 1 goal | Assessment | Evidence and professional judgement |
|---|---|---|
| Preserve financial truth and prevent silent correction | **Substantially achieved** | Money is held as integer minor units; original values are protected; corrections and association changes are append-only; reconciliation links retain provenance. The real variance remained open. |
| Make reconciliation operationally useful | **Achieved for the implemented scope** | Deterministic matching, allocation limits, mismatch classes, coverage metrics, and priority exceptions are implemented. The live Main branch shows NGN 2.22 receivable/reconciled and the resulting NGN 29,997.78 unmatched variance. |
| Make variance resolution governed | **Achieved with remaining end-to-end evidence gap** | Submissions become `pending_approval`; reviewer rationale is mandatory; original initiator and resolution submitter cannot self-approve; competing finalisation is conditionally rejected. No genuine resolution was submitted, correctly preserving the live exception. |
| Provide multi-branch owner/controller visibility | **Achieved** | The signed-in owner dashboard showed 1 open variance, NGN 29,997.78, grouped to Main branch, while branch operations remain scoped. |
| Improve receipt usability without overstating AI certainty | **Achieved** | The receipt renders in a preview; OPay extraction produces a high-confidence **proposal**; review opens editable fields; UI and audit language say it is not proof of settlement. Extraction is now organisation-disabled by default and requires owner notice acceptance before it can run. |
| Protect tenant, branch, and role boundaries | **Strongly implemented, but must be independently tested at scale** | Protected tRPC procedures, membership checks, scope validation, and negative-path tests exist. The previous raw object-path exposure showed that delivery controls must be evaluated outside the application code as well. |
| Deliver premium, mobile-first usability | **Mostly achieved, final real-device validation outstanding** | The responsive layout is compact and desktop checks are positive. Authenticated production mobile evidence for the new controls is still outstanding. |

## Verified strengths

### 1. Financial-control design is appropriate for an FMCG operating ledger

The design does not fabricate operational data, does not treat a receipt as settlement proof, and does not mask the NGN 29,997.78 variance. This is the correct control posture. Evidence, corrections, reconciliation links, exceptions, notes, approval decisions, and audit events retain identifiers, actor references, timestamps, and correlation IDs. The resulting model is materially stronger than a conventional mutable “paid/unpaid” tracker because it preserves the path by which a decision was reached.

### 2. The governed workflow now resists important approval failures

The review found that the earlier logic prohibited approval by the **exception creator** but could allow the person who submitted a later resolution to approve their own submission. This was remediated: the latest submitted approval decision is now checked against the reviewer, and a user cannot approve their own submission. The final update also conditions the status update on `pending_approval`, preventing a second reviewer from finalising an exception after another reviewer already changed its state. Targeted regression tests cover both conditions.

### 3. Receipt extraction is correctly positioned as assistance, not automation

The server reads an authorised image only after member scope and image/size checks. The provider model is selected server-side, and strict structured output is parsed before a proposal row and audit event are recorded. The proposal does not create evidence, change an association, run reconciliation, resolve a variance, or mark settlement. This is an appropriate human-in-the-loop default for a payment proof.

### 4. Automated test coverage is meaningful for a first release

The final local suite contains 65 passing tests across access control, router contracts, reconciliation, association corrections, evidence-file boundaries, receipt proposal parsing, protected extraction, approval state transitions, portfolio aggregation, component behavior, governance regressions, and simulated audit-failure rollback. The suite is valuable because it tests exact behavior and negative paths rather than merely rendering pages.

## Critical and material risks

| Priority | Finding | Why it matters | Required resolution |
|---|---|---|---|
| **Critical** | A previously exposed raw managed-storage URL responded to an unauthenticated header request with a 307 redirect to a signed object URL. | Receipt images can include names, account/transaction data, and payment evidence. Discovery or sharing of a raw object URL bypasses app-layer tenant/branch checks. OWASP specifically identifies public file retrieval as a disclosure risk. [2] | Rotate or revoke the legacy object at provider level; confirm the raw endpoint no longer serves it; reissue any required file through the protected flow. |
| **High** | New source returns a provider-signed URL only after protected `getFile` authorisation and omits raw key/URL metadata; final production propagation must be confirmed. | A short-lived signed URL is safer than returning a raw key, but it remains a bearer artifact during its validity period. | Confirm post-deployment response and preview behavior; keep expiry minimal; avoid logging signed URLs; document the provider expiry. |
| **Medium** | OPay extraction governance is now implemented in source but still requires production verification and an organisation-specific operating policy. | A payment receipt can contain personal and financial data. The UI now requires owner acceptance and records the governance event, but technical notice text is not a substitute for the organisation’s own data-retention and vendor-risk policy. | Verify the live flow with an authorised owner when appropriate; retain a documented organisation policy and processor due-diligence record outside the product. |
| **Medium** | Material state changes in the control router now write audit events in the same transaction, and a simulated audit-insert failure rolls back its associated receivable write. A real isolated-database rollback test is still missing. | A ledger needs strong confidence that a material state cannot survive without its audit record. | Add a real isolated-database transaction rollback test as part of broader integration and recovery validation. |
| **Medium** | Upload checks enforce MIME allowlist, filename sanitisation, and size limits, but do not validate file signatures or conduct antivirus/CDR scanning. | User-supplied content type can be spoofed, and files can contain malicious or inappropriate content. OWASP recommends defence in depth, including content/signature checks and scanning where appropriate. [2] | Add magic-byte/signature validation; introduce malware scanning or a documented operational review process; restrict PDFs/images to business need. |
| **Medium** | No real end-to-end submitted-resolution/independent-approval case was executed. | The UI and server behavior are tested, but no real accountable approval decision has been made. | Validate the workflow only when an authorised user has a genuine investigation rationale and a genuine independent approver. |
| **Medium** | Authenticated real-device mobile verification of the new dashboard, receipt, and exception controls is incomplete. | Preview screenshots support responsive layout confidence but do not prove signed-in mobile interaction. | Complete the three requested Main-branch mobile screenshots without submitting business actions. |
| **Medium** | No load, concurrency, failure-injection, accessibility audit, dependency vulnerability scan, external security test, recovery drill, or disaster-recovery proof was performed. | The first-release test suite proves selected behavior, not operational resilience or formal assurance. | Add staged performance tests, accessibility checks, dependency/SBOM/vulnerability scanning, penetration testing, and recovery exercises before wider rollout. |

## Security and privacy validation against OWASP guidance

OWASP ASVS is explicitly a yardstick for assessing web application technical security controls, not a self-certification mechanism. [1] The implementation is directionally aligned in its server-side authentication, role-based scope checks, structured inputs, managed storage, audit trail, and non-public UI patterns. It should not claim any ASVS level or compliance certification without a formal evidence-mapped assessment.

The OWASP File Upload Cheat Sheet recommends only business-required types, generated filenames, size limits, authenticated and authorised upload control, and careful treatment of public retrieval. [2] Control Ledger has allowlisted upload types, file-size bounds, server-side safe names, managed storage, and permission checks. The assessment found a material exception at the hosting/storage edge: a legacy raw object endpoint was externally reachable. This validates OWASP’s warning that file delivery must be assessed as a complete end-to-end path, not only through the application endpoint.

## Required release gates

| Gate | Status | Release implication |
|---|---|---|
| Preserve live financial evidence and open variance | **Passed** | No silent settlement or correction occurred. |
| Automated typecheck and regression suite | **Passed** | 56 tests passed locally. |
| Approval separation and competing-reviewer protection | **Passed in source and regression tests** | Must still be exercised later with a genuine business case. |
| New protected receipt-delivery response | **Source implemented; final production recheck pending** | Do not rely on it until production proves the final signed URL behavior. |
| Legacy raw receipt-object exposure | **Open** | Blocks an unconditional production-readiness conclusion. |
| OPay data-processing governance | **Implemented in source; production verification pending** | The live organisation is currently fail-closed and disabled; technical controls do not replace organisation-level legal/privacy governance. |
| Authenticated mobile acceptance | **Open** | Blocks final UX sign-off. |
| Formal security, resilience, and recovery validation | **Open** | Blocks assurance or certification claims. |

## Practical release recommendation

The appropriate immediate posture is **controlled pilot, not unrestricted rollout**. A pilot should have a small number of authorised owner/controller/operator users, limited receipt categories, named independent approvers, documented review responsibility, and an incident route for uploaded evidence. The pilot should not resolve the existing NGN 29,997.78 exception unless the user supplies a genuine investigation basis and a separate eligible approver independently reviews the submitted resolution.

Before expanding beyond a pilot, rotate/revoke the legacy receipt object, verify the post-deployment protected signed URL, formalise data processing for OPay extraction, run real-device acceptance checks, and commission at least an independent application-security review. The current implementation is a sound foundation for those next steps; it should not be represented as legally compliant, fully secure, or operationally complete until the open gates are closed.

## References

[1] [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)

[2] [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
