# Production Release-Candidate Validation Notes

## 25 August 2026 — signed-in desktop dashboard

The production Main branch dashboard loaded under the owner session. It showed the organisation variance watch with **1 open** variance, **NGN 29,997.78** open value, and the **Main branch · MAIN** grouping. The existing receivable position (NGN 2.22), reconciled value (NGN 2.22), and unmatched exception remained visible and unchanged.

The dashboard still displayed the earlier branch-name/code wording in its live-validation guidance during this first production check. The current release candidate contains corrected source wording, so this copy must be rechecked after deployment propagation. No exception, evidence, reconciliation, or approval action was submitted during the check.

## 25 August 2026 — signed-in desktop evidence page

The stored authorised WebP receipt loaded with **Preview**, **Extract OPay fields**, and **Review in evidence form** controls. The existing high-confidence proposal visibly retained its NGN 30,000.00 amount, source reference `260819060100009169870983`, local timestamp caution, and explicit statement that it is **not proof of settlement**. No extraction was triggered and no evidence record was submitted.

The **Preview** control opened the receipt in a modal explicitly described as using an authorised, time-limited retrieval link. The modal was then closed without opening a public link, changing the file, or changing any financial record.

The **Review in evidence form** control opened a draft-only evidence form, which stated that no evidence exists until the form is submitted. It prefilled payment observation, `3000000` minor units, NGN, OPay, reference `260819060100009169870983`, and `2026-08-19T22:34`. The form was inspected only; its **Record evidence** action was not used.

## 25 August 2026 — signed-in desktop exceptions page

The live unmatched-record exception remained **open** with an NGN 29,997.78 value impact. Its resolution field required a proposed resolution and investigation basis, and the only available closure path was **Submit for approval**. There were no investigation notes or approval decisions. No note, submission, approval, or resolution action was taken.

## 25 August 2026 — signed-in desktop audit trail

The scoped immutable audit trail included **evidence · receipt extraction proposed** with correlation ID `6bec859a-ba64-4ae7-9fc8-efe626f52487`, alongside the preceding association correction, reconciliation, evidence-file, and evidence-event records. This confirms that the extraction proposal was added as an auditable event and did not replace prior source or reconciliation history.

## 25 August 2026 — post-remediation production evidence page

Following the security-remediation deployment, the signed-in Main branch evidence page loaded the existing OPay observation, the unchanged high-confidence proposal, and the controlled **Preview** action. No extraction, evidence recording, reconciliation, exception submission, approval, or resolution action was performed.

The authorised preview still rendered successfully. The page’s exposed image path appeared to reflect a pre-deployment raw managed-storage URL in the existing browser session, so the session must be reloaded and the authenticated grant URL verified before the storage remediation is accepted as complete.

The production evidence page was then fully reloaded under the owner session. It retained the expected existing evidence and proposal controls, ready for a fresh preview request. No business record was changed.

A fresh production `control.evidence.getFile` response during the initial propagation window still contained the prior raw storage metadata and raw path. Therefore, the scoped-delivery security remediation is **not yet accepted** in production and must be rechecked once the new deployment is definitively active.

The page was also reloaded with a cache-busting query parameter and continued to display the unchanged evidence and proposal UI. The backend delivery shape still requires direct verification.

After the API-route correction checkpoint, the production evidence page again loaded cleanly in the signed-in Main branch workspace with the original evidence and proposal unchanged. A fresh backend-response check follows.

After the protected signed-URL checkpoint, the production Main branch evidence page again loaded cleanly with the existing OPay evidence, preview control, and human-review proposal. No financial or approval action was taken.

## 25 August 2026 — development visual verification of processing governance

Desktop and narrow-mobile previews of the current development build showed the new fail-closed state clearly: **“OPay extraction is disabled for this organisation”**, an owner-facing **“Review processing notice”** action, and the existing proposal-review button. The notice states that extraction creates an editable proposal only and does not create evidence, reconcile value, or prove settlement. The evidence card and actions remained readable and reachable at 375px width.

The final policy-management rendering adds specific processing scope and retention-boundary language: only an authorised receipt image is sent to the configured processor; the control database retains proposal and audit metadata rather than raw image bytes; and the organisation remains responsible for evidence retention and authorised use. The complete card remains readable without horizontal clipping at 375px width.

The first production page load after checkpoint `83cf68db` still displayed the preceding **Extract OPay fields** control and not the new disabled-policy notice. That observation is treated as a deployment-propagation state, not acceptance of the governance remediation. No extraction was triggered and no record changed.

A subsequent signed-in production check continued to return the preceding control set, including **Extract OPay fields**, rather than the new fail-closed policy card. The governance checkpoint is therefore still not accepted as active on the production domain. The persisted database policy itself remains disabled; no extraction action was triggered.

## 25 August 2026 — governance deployment verified

After the final assessment checkpoint propagated, the signed-in Main-branch production evidence page displayed the deployed fail-closed state: **“OPay extraction is disabled for this organisation”**, the processing-scope and retention-boundary notice, and the owner-only **“Review processing notice”** control. The prior direct extraction button was absent. The stored receipt Preview control and the existing high-confidence human-review proposal remained present. No extraction, evidence form submission, resolution, approval, or settlement action was taken.

The authorised Preview action was then exercised without changing any record. It opened the controlled receipt modal successfully and used a provider-signed URL with an expiry parameter and signature, rather than returning a raw storage key or raw storage URL in the application control. The modal was not used to submit, extract, reconcile, resolve, or approve anything.
