# Project and Site Sanitation Record

**Author:** Manus AI  
**Date:** 26 August 2026  
**Scope:** Non-destructive project and public-site hygiene. No financial, evidence, reconciliation, settlement, journal, period, exception, audit, or AI-policy record was changed.

## Outcome

Control Ledger’s source tree, production bundle, and runtime dependency set were sanitised without changing its governed business behaviour. The work removed confirmed unreachable template surface, excluded a development-only diagnostics collector from the production bundle, tightened local-residue exclusions, aligned direct security dependencies, and moved the project’s pnpm patch/override settings into the supported workspace configuration.

| Area | Finding | Sanitation action | Result |
| --- | --- | --- | --- |
| Production diagnostics | The Vite debug collector used `NODE_ENV` at build transformation time, allowing its development script and public helper file into a production build. | Scoped injection and serving to Vite’s `serve` command only; moved the helper from `client/public` to `tooling`. | The production `index.html` no longer references the helper and no helper asset is emitted under `dist/public`. |
| Template residue | Unrouted demo pages, AI chat component, and chart component pulled in unused template-only dependency surfaces. | Removed the unreachable Home, ComponentShowcase, AIChatBox, and chart files; removed `streamdown` and `recharts`. | The active route map is unaffected and the removed imports are absent from active source. |
| Local artefacts | The ignored stale Vite backup and development logs were present locally; environment-file matching was narrower than necessary. | Removed the stale backup; added `.manus-logs/`, `.env.*`, and an explicit `.env.example` exception to `.gitignore`. | Local diagnostics and environment residues are not committed by normal Git workflows. |
| Dependency hygiene | Initial production audit findings included direct and transitive issues from outdated package lines. | Updated tRPC, Drizzle ORM, AWS S3 client and presigner, Axios, Express 4, and NanoID; applied the fixed XML-parser dependency path by aligning both direct AWS S3 packages. | Final `pnpm audit --prod --json` reports **0 critical, 0 high, 0 moderate, and 0 low** advisories across 260 production dependencies. |
| Package-manager configuration | pnpm 10 ignored the legacy `package.json` `pnpm` block, leaving the existing Wouter patch and override behaviour ambiguous. | Moved the Wouter patch declaration and overrides into `pnpm-workspace.yaml`, declaring the single project root. | The supported workspace configuration is now explicit and the install completes without the prior ignored-settings warning. |
| Hausa accessibility | The selected Hausa interface label did not update the page’s document-language declaration. | The persisted language context now updates `document.documentElement.lang`; coverage verifies `ha` after selecting Hausa. | Assistive technology can identify the selected interface language without changing stored control data. |

## Validation evidence

The final source validation passed on 26 August 2026:

| Check | Result |
| --- | --- |
| TypeScript | `pnpm check` passed. |
| Regression suite | **28 test files / 99 tests** passed. |
| Production package | `pnpm build` passed. |
| Dependency audit | `pnpm audit --prod --json` reported zero advisories at every severity. |
| Production diagnostic boundary | The generated public HTML has no debug-collector reference and no public debug-helper asset. |
| Preview observation | Desktop authenticated Variance-centre preview remains available and continues to show the open NGN 29,997.78 case; no workflow control was activated. |

## Deliberate boundaries

The **“Made with Manus”** chrome observed around hosted previews is platform-managed hosting chrome rather than source delivered by the application’s Vite production bundle. It is not injected by Control Ledger’s `index.html` or the generated production output, so this sanitation work does not attempt to remove or disguise it.

The prior real-device acceptance and legacy provider-object rotation/revocation items are also unchanged. They require real authorised use or platform-level action, not local source deletion or dependency remediation.
