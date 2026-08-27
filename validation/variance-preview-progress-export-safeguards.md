# Variance Attachment Preview, Upload Feedback, and PDF Export Safeguards

**Author:** Manus AI  
**Status:** Implementation boundary  
**Date:** 27 August 2026

## Objective

This enhancement improves investigation usability without changing the control model. It adds secure image thumbnails for note attachments, clearer local upload-progress feedback, and a PDF report of the currently selected scoped variance. None of these features creates evidence, changes a reconciliation, submits a resolution, approves a decision, or requests an AI analysis.

## Thumbnail and upload-feedback boundary

| Area | Safeguard |
| --- | --- |
| Thumbnail access | A thumbnail is requested only for an image attachment already visible to a scoped reader. It uses the existing protected `getNoteAttachment` procedure to obtain a short-lived signed URL; storage keys and raw URLs are never persisted or rendered as text. |
| Format | Only JPG, PNG, and WebP render as a thumbnail. PDF attachments remain a labelled open action. |
| Exposure | The thumbnail uses the authorised temporary URL in the browser only. It is not sent to AI, added to the dashboard, or embedded in the exported report. |
| Upload feedback | The user sees file selection, aggregate preparation progress, and per-file upload completion. The UI does not promise byte-level transfer progress because the protected tRPC mutation receives a completed request rather than stream events. |
| Failure | A failed file is named in the feedback and the existing note remains append-only. A user can retry by creating a new note or attaching remaining files; no attachment is silently substituted. |

## PDF report boundary

The report is generated client-side from the already authorised selected-case data. It contains the case’s current facts, the user-visible saved AI proposal text, investigation-note text and attachment metadata, and decision history. It explicitly states that it is a read-only investigation export, that AI output is a suggestion only, and that the report does not prove settlement or approval.

The report does **not** include raw attachment bytes, images, signed URLs, storage keys, internal model input, customer contact details, or cross-branch data. Export generation writes nothing to the database, object storage, audit history, or AI service.
