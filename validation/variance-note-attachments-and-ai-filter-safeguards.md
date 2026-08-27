# Investigation Attachments and Saved-AI-Suggestion View Safeguards

**Author:** Manus AI  
**Status:** Implementation boundary  
**Date:** 27 August 2026

## Purpose

This enhancement adds two narrow review aids: a dashboard filter for open variances that already have a saved AI suggestion, and optional file or screenshot attachments on an append-only investigation note. Neither feature creates a financial fact, changes a reconciliation, submits a resolution, or increases AI authority.

## Investigation-note attachment boundary

| Area | Safeguard |
| --- | --- |
| Relationship | An attachment belongs to one existing investigation note and its existing exception. It cannot be attached directly to a resolution, approval, ledger entry, or AI suggestion. |
| Authority | Only the same roles permitted to add an investigation note may upload an attachment; any scoped reader may retrieve a time-limited view link after server-side organisation and branch checks. |
| File types and size | Reuse the controlled evidence-file allow-list: PDF, JPG, PNG, and WebP. Each file must be 1 byte to 8 MB. A note is limited to three attachments. |
| Storage | Store file bytes only in managed object storage. The database stores metadata, checksum, scoped identifiers, and the storage key; raw data, public URLs, and signed URLs are never persisted in the note record. |
| Immutability | Links are append-only. The interface does not edit, replace, or delete existing note text or attachments. |
| Audit | Each attachment upload is idempotent and transaction-audited with actor, correlation ID, MIME type, size, and note/exception linkage. |
| AI boundary | Attached files, screenshots, names, raw URLs, and storage keys are not included in AI variance prompts or AI suggestion records. A user must still request proposal-only analysis explicitly. |

## Dashboard AI-suggestion view boundary

The dashboard filter uses only server-returned exception identifiers that have at least one saved AI suggestion and remain unresolved in the active organisation and branch. It does not request a new model analysis, rank a suggestion as correct, change a case’s priority/status, or include cases from another branch. The filter displays a compact count and links a reviewer to the existing Variance centre detail; it does not recreate a second decision workflow on the dashboard.

## Tooltip boundary

The active-policy dashboard badge receives a short hover/focus tooltip. It explains that the enabled feature produces only user-requested, same-branch review suggestions and cannot settle, reconcile, resolve, post, or approve. The tooltip is explanatory only and makes no claim that an AI suggestion exists for the active case.
