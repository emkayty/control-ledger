# Controlled Pharmacy Dispensing Safeguards

**Status:** Technical control foundation. **Not clinical, legal, regulatory, or pharmacist certification.**

## Deliberate boundaries

The Pharmacy pack is disabled by default. An owner must first authorise an existing scoped user as a pharmacist using an attributable credential reference, then acknowledge the exact pharmacy-processing notice before activating dispensing. The system records an owner attestation; it does **not** independently verify a licence against an external register. That verification remains a real-world operational gate.

The product stores only a short source reference for a dispensing request and deliberately does not create patient profiles, prescription text, clinical advice, dose calculations, substitutions, diagnosis, or an AI decision. A pharmacist review is an explicit human decision. The originating operator cannot review their own request.

| Control | Enforced rule |
| --- | --- |
| Tenant and branch isolation | Every query and mutation validates authenticated membership, active branch, organisation, and branch scope. |
| Feature activation | Owner-only, exact typed confirmation, active pharmacist required, audit record written. |
| Batch eligibility | Only Pharmacy-received batches that are active, have a future expiry, and have enough exact available quantity are eligible. |
| Request state | Draft → pending pharmacist review → approved/returned/rejected → supplied. No implicit transition exists. |
| Human authority | Only an active scoped pharmacist authorisation may approve, return, or reject. The request creator cannot review it. |
| Supply consequence | A unique supply event and atomic per-batch decrement prevent replay and concurrent over-supply. It writes a `pharmacy_supply` stock movement and audit event. |
| Corrections | No in-place edits or supply deletes. Any future correction/reversal must be an additive governed workflow. |
| Clinical boundary | The platform is not a prescribing, interaction-checking, diagnosis, dose-calculation, or substitution engine. |

The Pharmacy Council of Nigeria Act identifies standards and control over pharmacy practice, premises, storage, distribution, sale, dispensing, dangerous-drug records, and dispensing control.[1] The product safeguards above are a software control design; the operating organisation must obtain pharmacist, privacy, and regulatory confirmation before treating the module as production-ready for a regulated dispensing setting.

## No-data-change commitment during implementation

The schema migration adds empty tables and a stock-movement classification only. It does not enable the policy or create pharmacist authorisations, products, batches, dispensing requests, stock movements, supply events, or patient/prescription records.

## Interface verification

The 27 August 2026 desktop and 375 px mobile review confirmed that the Pharmacy workspace preserves the owner-policy disabled state, pharmacist-authorisation form, exact-phrase activation gate, clear no-clinical-automation boundary, empty controlled queue, and authority register without horizontal overflow. Server validation reports both a recheck/loading state and a concise batch-eligibility result before a review draft can be created. Approval controls remain unavailable unless the current user is a separately authorised scoped pharmacist, and the server repeats the batch check before an approval or supply write.

The full validation command, `pnpm check && pnpm test && pnpm build`, passed after the operational workflow implementation. The suite has **32 test files / 111 tests**. It includes focused tests for exact typed activation acknowledgement, exact batch quantity conversion, eligible/ineligible batch outcomes, and client loading/feedback states. The production package passed; it retains the pre-existing Vite large-chunk advisory only.

Direct database verification confirms `0` pharmacy policies, pharmacist authorisations, Pharmacy batch balances, dispensing requests, and supply events. No policy was enabled, no operator or pharmacist action was submitted, and no existing stock, finance, variance, evidence, attachment, or AI record changed.

## Public propagation status

The first two cache-busted public requests for checkpoint `88c85455` still served the earlier static Pharmacy prototype. This is documented as a publication-propagation delay; it is not a local validation failure. The current controlled workspace remains verified in the managed preview, and public verification remains open until a later cache-busted request shows the new owner-policy and pharmacist-authority controls. No Pharmacy action was attempted in either public check.

After the deployment-success notice, the third cache-busted public check displayed the controlled Pharmacy workspace. It showed the disabled-by-owner policy state, explicit no-clinical-automation boundary, existing-user pharmacist-authorisation selector, credential-reference field, exact activation phrase field, empty authority register, and empty controlled queue. The activation control remained unavailable until a pharmacist is authorised. No form was completed or submitted; the public verification did not create a policy, authorisation, batch, request, review, stock movement, or supply event.

## Reference

[1]: https://pcn.gov.ng/wp-content/uploads/2024/09/Pharmacy-Council-of-Nigeria-Act-2022-publication.pdf "Pharmacy Council of Nigeria (Establishment) Act, 2022"
