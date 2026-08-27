# Investigation Attachments, Saved-AI-Suggestion Filter, and Badge Tooltip Validation

**Author:** Manus AI  
**Date:** 27 August 2026  
**Scope:** Controlled investigation-note attachments, saved-AI-suggestion dashboard filtering, and explanatory AI-policy badge disclosure.

## Delivered behaviour

The dashboard’s **Priority exceptions** area now has two compact views: **All priority** and **AI suggestions**. The second view is driven by the protected `reviewQueue` endpoint, which returns only unique open/investigating exceptions with an existing saved AI suggestion in the selected organisation and branch. It does not call a model, create a suggestion, or show resolved/rejected cases.

The active AI badge now includes a keyboard- and hover-accessible tooltip. It states that the feature gives only user-requested same-branch review suggestions and cannot reconcile, settle, resolve, post, or approve. The badge itself remains a policy-status signal; it does not indicate that any particular case has a suggestion.

Investigation notes now allow an authorised user to choose up to three optional PDFs, JPGs, PNGs, or WebP screenshots while adding a note. The note is created first; each attachment is then stored in managed object storage and linked append-only to that note. Existing note text and attachments cannot be edited or overwritten by the interface. Attachment viewing requires a new protected server-side scope check and returns only a short-lived signed URL.

| Safeguard | Verified implementation |
| --- | --- |
| File constraints | The established 1-byte–8 MB evidence validation and PDF/JPG/PNG/WebP allow-list are reused; the interface and router limit one note to three attachments. |
| Scoped access | Attachment upload requires the same resolve-capable scope as adding a note. Attachment viewing requires scoped read access to its stored branch. |
| Storage boundary | Database rows contain metadata, checksum, storage key, creator, timestamp, and correlation ID; file bytes and signed URLs are not persisted. |
| Audit | Each attachment action is idempotent and transaction-audited with MIME type, byte size, note, and exception linkage. |
| AI boundary | Note attachment content, storage key, file name, raw URL, and screenshot bytes are excluded from AI variance prompts and suggestion records. |

## Automated and responsive validation

| Check | Result |
| --- | --- |
| TypeScript | `pnpm check` passed. |
| Regression suite | **29 test files / 105 tests** passed. |
| Production package | `pnpm build` passed. |
| Attachment persistence | Focused router test confirms managed-storage use, scoped metadata, append-only audit event, and idempotency completion. |
| Attachment role denial | Focused router test confirms an approver without note authority is denied before any storage call. |
| Saved-AI queue | Focused router test confirms duplicate suggestions collapse to one case and resolved cases are excluded; no model invocation occurs. |
| Responsive review | Desktop and 375 px checks show the AI-suggestion filter remains compact in the dashboard and the collapsed notes section keeps the case and human decision controls uncluttered. |

No real note, attachment, AI analysis, financial record, reconciliation, resolution, decision, journal, or settlement was created during implementation or validation. The open NGN 29,997.78 variance remains unchanged.
