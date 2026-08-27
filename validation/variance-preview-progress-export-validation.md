# Variance Thumbnail, Upload Feedback, and PDF Export Validation

**Author:** Manus AI  
**Date:** 27 August 2026  
**Scope:** Authorised attachment preview, staged upload feedback, and read-only PDF variance export.

## Delivered behaviour

Image attachments in an existing investigation note now render as small clickable thumbnails. The browser receives the image source only through the existing protected attachment-retrieval procedure. Clicking a thumbnail opens the already authorised short-lived view link. PDF files remain labelled open actions rather than being converted or embedded.

When users add a note with optional files, the interface now communicates two bounded stages: **Preparing attachments** while files are converted for the protected request and **Uploading attachment** as each selected file completes. The indicator shows completed files over total files and a progress bar. It is intentionally a staged completion indicator, not misleading byte-transfer telemetry.

The selected Variance detail has a compact **Export PDF report** action. The client-side report includes only previously authorised selected-case facts, saved AI proposal text, note text, attachment metadata, and approval history. It includes an explicit read-only control boundary. Attachment thumbnails, file bytes, signed URLs, storage keys, raw AI prompt content, and any unscoped data are excluded.

| Boundary | Verification |
| --- | --- |
| Thumbnails | Image preview uses the protected attachment query; it does not expose or persist a storage key or permanent file URL. |
| Upload feedback | Progress is limited to attachment preparation and completed protected mutation calls; existing note/attachment records are not replaced. |
| Export | The export utility only performs a browser download and has no server mutation, storage operation, AI call, or audit/financial action. |
| AI authority | Saved suggestions appear as historical investigation material only. The report states that AI cannot settle, reconcile, resolve, post, or approve. |

## Validation

| Check | Result |
| --- | --- |
| TypeScript | `pnpm check` passed. |
| Regression suite | **30 test files / 106 tests** passed. |
| Production package | `pnpm build` passed. |
| PDF helper | Filename safety and scoped report-model construction are covered by a focused test. |
| Attachment controls | Existing router tests still validate managed storage, role denial before storage, append-only metadata, and audit persistence. |
| Responsive preview | Desktop and 375 px Variance-detail checks show the export action remains visible without crowding case facts, AI controls, notes, or human decision controls. |

No live attachment was uploaded, no thumbnail request was generated for a new file, and no PDF report was downloaded during validation. No AI analysis, financial record, reconciliation, resolution, approval, settlement, journal, or variance state was changed; the NGN 29,997.78 variance remains open.
