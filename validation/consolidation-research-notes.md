# Consolidation Review — Research Notes

**Date:** 27 August 2026  
**Status:** Working evidence notes for the current hardening review.

The Nigeria Data Protection Commission describes data-subject rights including being informed, access, rectification, objection/restriction, portability, erasure, and a right not to be subject to automated decision-making. It also describes a data controller's responsibility to use collection methods consistent with data-protection principles.[1]

The official Pharmacy Council of Nigeria Act publication is the primary authority to use for pharmacy-practice, pharmacy-premises, storage, distribution, sale, dispensing, and record-control requirements.[2] The current Control Ledger Pharmacy flow therefore remains a technically controlled workflow, not evidence that an organisation has satisfied the external pharmacist, premises, data-protection, or regulatory operational gates.

For that reason, the current search enhancement is limited to the existing controlled request **reference** and accepts only the internally generated `REQ-` format. It will not add or search patient names, prescription identifiers, prescription text, or other health-identifying fields. A future feature involving those identifiers needs a documented lawful basis, data mapping/classification, role and branch rules, a retention/deletion schedule, access/audit design, pharmacist-owner approval, and a privacy impact assessment before implementation.

OWASP ASVS is an open application-security verification standard intended to provide a basis for testing technical security controls and secure-development requirements.[3] The consolidation test register will therefore distinguish automated regression evidence from remaining manual or provider-side security verification.

W3C WCAG 2.2 Success Criterion 3.3.1 requires that an automatically detected input error identify the failed item and describe the error in text.[4] The review will preserve explicit server validation messages and loading/recovery feedback for critical controlled actions rather than relying on colour, disabled controls, or a failed submit alone.

## References

[1]: https://ndpc.gov.ng/ "Nigeria Data Protection Commission"
[2]: https://pcn.gov.ng/wp-content/uploads/2024/09/Pharmacy-Council-of-Nigeria-Act-2022-publication.pdf "Pharmacy Council of Nigeria (Establishment) Act, 2022"
[3]: https://owasp.org/www-project-application-security-verification-standard/ "OWASP Application Security Verification Standard"
[4]: https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html "W3C WCAG 2.2 Understanding Success Criterion 3.3.1: Error Identification"
