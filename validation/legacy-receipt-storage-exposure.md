# Legacy Receipt Storage Exposure — Provider-Level Remediation Record

**Status:** Open provider-level security gate  
**Scope:** The pre-existing OPay receipt object associated with evidence file `9ce8bf38-d017-4af1-b4ce-95b83ddcf2ab`  
**Financial state:** Unchanged; no evidence, reconciliation, exception, or settlement record has been edited or deleted.

## Verified facts

The earlier storage delivery path exposed a deterministic `/manus-storage/{key}` route. A header-only unauthenticated check showed that the hosting storage layer redirected a known object key to a signed provider URL. The application has since been changed so the protected `getFile` procedure authorises the user and returns a provider-signed URL; the current signed-in production Preview action was verified to use that path successfully.

The active application path is therefore improved, but a **legacy object key that was already exposed cannot be revoked through the available project storage API**. The supported helper exposes upload, key retrieval, and presigned retrieval only. It has no provider delete, key rotation, or object-revocation operation. The platform guidance says that removing a key and UI references makes an object effectively unreachable in normal product operation; that does not provide an auditable, provider-confirmed revocation for a key already known outside the application.

## Why an application-side silent “fix” is inappropriate

The receipt is part of the evidence chain supporting the live open variance. Updating the evidence record in place or deleting its reference to conceal the legacy path would conflict with the platform’s append-oriented financial-control model and would damage the retained audit/evidence trail. Creating a duplicate receipt record without an explicit controlled supersession model would also create avoidable ambiguity.

## Required remediation

The appropriate remedy is a **provider-supported rotation or revocation** that can preserve the evidence chain. The storage provider or platform should either revoke/delete the legacy object or support a controlled rotation that yields a replacement object reference while preserving a documented, append-only link from the original evidence-file record to its successor. After that operation, the system should:

1. Verify that the legacy raw object path no longer retrieves or redirects to the receipt.
2. Verify that the authorised application preview still retrieves only a short-lived provider-signed URL.
3. Record the provider remediation reference and verification time in the evidence/audit history.
4. Keep the financial evidence, reconciliation, and exception state unchanged unless a separate, authorised correction is genuinely required.

## Release implication

Until provider-level revocation or rotation is confirmed, the application is appropriate only for a **controlled pilot**, not an unrestricted production or compliance-ready release. The legacy exposure remains a documented security gate; it must not be treated as resolved merely because the current user interface no longer exposes raw storage metadata.
