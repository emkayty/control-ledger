# Variance AI Safe Re-enablement Safeguards

**Author:** Manus AI  
**Status:** Implementation boundary for owner-controlled activation  
**Date:** 26 August 2026

## Re-enablement standard

AI variance assistance remains disabled unless an organisation owner completes an explicit activation step. Enabling it allows only an authorised, user-triggered investigation proposal for an **open** or **investigating** variance. It does not create evidence, match records, settle a debt, add a note, submit a resolution, approve a decision, post a journal, or alter any business fact.

| Safeguard | Implementation requirement |
| --- | --- |
| Owner authority | Only the owner role may activate or disable the organisation-level policy. |
| Informed activation | The owner must open the short processing notice, select the acknowledgement, and type the displayed confirmation phrase. A checkbox alone is not sufficient. |
| Clear auditability | Every enable/disable event is idempotent, transactional, correlation-bound, and records the processing-notice version and the typed-confirmation method in the append-only audit history. |
| Data minimisation | The analysis prompt contains only a variance’s controlled attributes and a short, server-filtered same-branch candidate set. It excludes raw files, signed URLs, storage keys, customer details, investigation notes, and evidence-source names. |
| Request budget | A variance can receive at most three saved analyses in a rolling 24-hour period, limiting unnecessary external processing and repetitive advice. |
| Human authority | Every output remains visibly labelled as an AI suggestion. The existing controlled decision workflow is separate, unfilled, and human-authorised. |

## User experience boundary

The policy surface must show one calm status sentence, one essential boundary sentence, and one primary action. The longer processing notice stays available on demand. Non-owners see the current status and cannot change it. Once enabled, authorised reviewers see one **Request analysis** action and a small request-budget hint; they do not see controls that could imply automatic resolution.

> **Live activation:** Implementing this safeguarded path does not silently enable the current organisation. The owner must still complete the explicit in-product acknowledgement and typed confirmation.
