# Control Ledger Production-Readiness Consolidation

**Author:** Manus AI  
**Date:** 27 August 2026  
**Release scope:** Production deployment hardening for the existing Control Ledger shared core and the optional Pharmacy control pack.

## Readiness position

Control Ledger is **technically ready for a controlled FMCG production pilot**: the released application has scoped access, append-only material control records, exact-value handling, independent decision gates, production build verification, and a responsive operator experience. This conclusion applies to the software release and its stated control boundaries; it is not a claim of universal legal, accounting, clinical, regulatory, or operational certification.

> The operational promise remains deliberately narrow: record the source fact, retain independent evidence, reveal a discrepancy, and require an accountable human decision before a governed consequence is taken.

| Readiness dimension | Release position | Evidence |
|---|---|---|
| Shared control core | Ready for a controlled pilot within an authorised organisation and branch. | Scope, role, audit, idempotency, reconciliation, variance, operations, ledger, and period-governance tests are included in the final quality gate. [1] |
| Operator experience | Consolidated for day-to-day use. Mobile users can now inspect and choose their working organisation/branch from the existing navigation drawer; desktop users can select across authorised organisations rather than a one-option display. | Dedicated scope-selector interaction coverage and desktop/mobile route review. |
| Developer-only features | Excluded from the production package and public route. | Post-build scan found no local-fixture controls, simulation controls, labels, or modules. [2] |
| Pharmacy pack | Technical control foundation only, disabled by policy until the retained domain gates are satisfied. | Read-only data check confirms no policy, authorisation, batch, request, decision, or supply record exists. |
| Release integrity | Passed application type, unit/component, build, production dependency, and whitespace checks. | Final `pnpm verify`: **39 test files / 133 tests**; production dependency audit: no known vulnerabilities; `git diff --check`: clean. |

## Product consolidation applied

The release deliberately removes implementation-history language from shipped screens. Users now see **Inventory, delivery & invoicing**, **Collection follow-up**, **Accounting consequence & posting**, **Accounting periods**, and **One accountable control chain**, rather than release-number labels. The result preserves the product’s audit-native explanation while removing roadmap noise from operational workflows.

The shared application header and mobile navigation now reflect the actual multi-branch control model. A compact organisation/branch selector is available in the mobile navigation drawer, with explicit labels and native selection controls. The existing desktop controls now list all authorised organisations. Changing scope only changes the authenticated working view; it does not create, edit, approve, post, reconcile, or resolve a record.

Specialist routes now retain an accessible control-context skeleton while their modules load. It identifies that the selected view is preparing and that no action is being submitted, rather than presenting a blank page or an unexplained loading message. This improves perceived continuity without hiding an error state or making a workflow change.

| User-facing area | Consolidated behaviour | Business protection retained |
|---|---|---|
| Dashboard | Uses plain operational labels for the chain from expected value to independent close. | A source fact, evidence, and decision remain distinct; no dashboard action changes a control record automatically. |
| Operations | Guides product, stock receipt, order, delivery, and linked invoicing in their real sequence. | Stock leaves only with confirmed delivery; invoice/receivable creation remains a separate controlled action. |
| Collections | Frames follow-up as accountable next-action work. | A follow-up does not mark a debt paid, settle a receivable, or close a variance. |
| Ledger | Uses operator language for accounting consequence, posting, and period governance. | Draft preparation, independent posting, reversal, and independent period closing remain separate guarded transitions. |
| Pharmacy | Shows only the governed controlled workspace in production. | Development fixtures, error simulators, logs, and synthetic-data labels are absent from the production build. |

## Business-flow validation

The core workflows remain aligned around a staged evidence-to-decision model. The system does not treat one workflow milestone as proof of another. A receipt does not establish settlement; a delivery does not settle debt; an invoice journal does not reconcile evidence; and an AI suggestion does not create a decision. The business-effect boundaries below were retained during this consolidation. [1]

| Flow | Controlled sequence | Explicit non-automatic boundary |
|---|---|---|
| FMCG receivable | Expected receivable → evidence observation → deterministic comparison → exception → independent resolution decision. | Evidence alone cannot settle an obligation or resolve a variance. |
| Inventory and delivery | Product → physical stock receipt → customer order → confirmed delivery → linked invoice. | An order does not reduce stock; a delivery does not post a journal or settle debt. |
| Ledger | Issued invoice → balanced journal preparation → independent posting → derived balance → independently governed period close. | A draft is not a balance; posting does not change an underlying receivable, payment, or exception. |
| Variance assistance | Authorised user request → minimised same-branch proposal → human evidence review → explicit workflow decision. | AI cannot reconcile, settle, resolve, post, or approve. |
| Pharmacy technical control | Owner policy → owner attestation → pharmacist-led review → separately authorised supply event. | The product does not select a patient, process a prescription, calculate a dose, offer clinical advice, or supply autonomously. [1] |

## Stress and validation evidence

The final quality gate passed **39 test files and 133 tests**. It includes controlled scope/access, exact-value and reconciliation logic, append-only correction and audit boundaries, independent approval/posting rules, export escaping, attachment access, AI safeguards, localisation, Pharmacy policy/queue controls, and the new shared-layout and specialist-route fallback tests. The Pharmacy pure queue test retains a deterministic 2,000-record scenario for request-reference filtering and urgency ordering; it exercises no live database record.

The production build completed successfully and the production dependency audit reported no known vulnerabilities. The build retains the existing advisory warning for a shared JavaScript chunk above the recommended 500 kB threshold. The main application bundle is **776.51 kB uncompressed / 218.17 kB gzip**; specialised routes remain lazy loaded. The advisory is a performance optimisation opportunity, not a build failure or an unsafe release condition.

Desktop and 375 px mobile reviews of the control desk, operations, collections, ledger, and Pharmacy routes confirmed readable action hierarchy, no horizontal overflow in the sampled paths, and no developer-only controls. The mobile navigation still provides an obvious menu entry point; opening that drawer reveals the newly added working-scope selector. A delayed cache-busted public verification of checkpoint `f7252f8f` displayed the new operator-facing control-chain copy and accessible desktop scope controls, while confirming the absence of development fixture and simulation UI. These checks did not submit a form, download a file, change a scope, or alter live data.

The final read-only data check preserved the operational baseline: zero Pharmacy policies, pharmacist authorisations, batch balances, dispensing requests, dispensing lines, dispensing decisions, and supply events. The existing exception `8338df03-8947-4623-a1e8-b1d75c14a42f` remains **open**, with minor-unit impact **2999778** (NGN 29,997.78) and `resolvedAt = NULL`.

## External acceptance gates retained

The following gates cannot be closed by code inspection, unit tests, visual screenshots, or an automated build. They remain required before expanding the controlled pilot or enabling real Pharmacy operations.

| Gate | Why it remains open | Required evidence owner |
|---|---|---|
| Authenticated real-device acceptance | Simulated and sandbox browser checks do not prove usability on the organisation’s actual devices, networks, roles, and records. | Named customer pilot users and product owner. |
| Provider-managed legacy storage remediation | Application-level controlled file access does not revoke previously issued provider-object URLs. | Hosting/storage provider and authorised owner. |
| Production operational resilience | A build, test suite, and code review do not prove monitoring, recovery, backup/restore, incident response, or capacity under representative traffic. | Operations owner and platform team. |
| Pharmacy activation and practice governance | Technical controls do not validate credentials, premises, storage/handling, controlled-drug requirements, or local operating procedures. | Qualified pharmacist, organisation owner, and relevant compliance review. |
| Health-identifying data governance | Patient names, prescription data, and clinical identifiers are outside the implemented data model. | Data-protection, legal/compliance, and pharmacist governance approval before any design change. |

## Release conclusion

The application is suitable to deploy as a **controlled, instrumented FMCG pilot** with the current functionality. The shared control core is coherent, scoped, auditable, responsive, and clear enough for operator-led use; developer-only Pharmacy fixture tooling is absent from the public release. Broader operational sign-off and Pharmacy activation remain deliberately gated by real-world evidence and qualified human authority. The existing open NGN 29,997.78 exception has not been resolved or altered by this release.

## References

[1]: ./consolidation-market-readiness.md "Prior Business-Logic, Safety, and Controlled-Pilot Readiness Assessment"
[2]: ./pharmacy-development-fixture-validation.md "Development-Only Pharmacy Fixture Isolation Validation"
