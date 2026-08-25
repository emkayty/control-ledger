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
