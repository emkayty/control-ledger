# Pharmacy Queue CSV Export Validation

**Author:** Manus AI  
**Date:** 27 August 2026  
**Scope:** Read-only export of the currently shown, filtered Pharmacy dispensing-request queue.

## Export boundary

The Pharmacy queue now provides an **Export CSV** action beside the current filtered-request count. It exports only records already returned within the authorised organisation/branch queue and still visible after the locally selected reference, status, urgency, date, and ordering controls. It does not create a request, change a filter, request an approval, move a batch, record supply, call AI, or write to the database.

| Included field group | Excluded field group |
| --- | --- |
| Organisation and branch display scope | Patient profiles, patient names, contact data, and clinical records |
| Internally generated `REQ-` request reference | Prescription IDs, prescription text, prescriber data, dose calculations, and clinical recommendations |
| Request status, derived urgency, creation timestamp | Storage keys, URLs, attachment bytes, and managed-object metadata |
| Product, controlled batch code, expiry timestamp, exact quantity | Authorisation credential references and unscoped records |
| Latest recorded decision and rationale, export timestamp | Any workflow mutation or automatic decision |

The client-side helper reuses the established CSV cell safety rule that prefixes spreadsheet-formula-leading cells before generating the CSV. The file name is scope-safe and date-stamped. The action is disabled when no filtered request is currently shown.

## Initial validation

Focused validation passed: TypeScript plus the Pharmacy CSV, queue, and toolbar tests. The new CSV helper test verifies the request reference and formula-neutralised cells, confirms that the output contains no patient/prescription column headings, and checks the scoped filename.

Desktop and 375 px mobile review both show the compact disabled export control adjacent to the visible request count, followed by the existing controlled-reference search and filters. The action was not clicked because the authorised queue is empty; no download, Pharmacy operation, or database change occurred.

The complete `pnpm verify` gate passed after the export was added: TypeScript, **34 test files / 120 tests**, and production build. The existing split specialist-route delivery remains in place; the main client asset remains approximately 770.89 kB before gzip, while the Pharmacy chunk is loaded only when the Pharmacy workspace is opened.
