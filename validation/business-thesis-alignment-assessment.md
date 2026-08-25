# Control Ledger Alignment with the Supplied Business Thesis and Target Architecture

**Assessment date:** 25 August 2026  
**Assessor:** Manus AI  
**Basis:** The user-supplied revised business thesis and architecture document, together with the current Release 1 Control Ledger implementation and readiness evidence.

## Direct answer

**Yes—Control Ledger is philosophically and structurally aligned with the thesis, but only as the first “control wedge” of the larger platform, not as the completed target architecture.** Its strongest alignment is its insistence that a payment proof, reconciliation outcome, variance, correction, and resolution are distinguishable facts with source, actor, time, and audit context. That directly supports the document’s core invariant:

> “Every economically material fact must be traceable from source → event → transaction → consequence → reconciliation → ledger → audit.”

The implementation currently covers **source → recorded evidence → reconciliation → exception → controlled decision → audit** for a focused receivables/evidence scenario. It does **not yet** cover the complete target chain through orders, fulfilment, delivery, invoices, settlement, a double-entry ledger, inventory, external payment adapters, offline field execution, or asynchronous event publication.

Accordingly, the correct framing is:

> **Control Ledger is a transaction-control and economic-reconciliation foundation for an FMCG operating platform. It is not yet a full ERP, full ledger, or the final vertical-platform architecture.**

## Alignment matrix

| Thesis principle | Current Control Ledger state | Alignment | Professional conclusion |
|---|---|---|---|
| Economic facts should be traced rather than merely saved as mutable balances | Receivables, evidence, association corrections, reconciliation links, exception decisions, and audit events preserve correlation IDs, actors, and append-oriented history. | **Strong** | This is the clearest alignment with the thesis. |
| Business event → immutable economic record → reconciliation → exception → decision | Release 1 records receivable obligations and payment/settlement evidence, runs deterministic reconciliation, and creates governed exceptions. | **Strong, but partial chain** | Orders, fulfilment, delivery, invoices, settlement consequences, and ledger posting remain future modules. |
| Exact money and derived state rather than mutable “truth” | Monetary amounts use integer minor units; allocation limits protect remaining balances; corrections are append-only. | **Strong** | This is appropriate financial-control engineering. |
| Deterministic reconciliation before AI | Matching and allocation are deterministic; OPay vision extraction produces a proposal only and cannot settle, reconcile, or resolve an exception. | **Strong** | This directly implements the thesis’s “AI recommends; controls decide” philosophy. |
| Exception → investigate → explain → approve → resolve | The variance workflow supports investigation notes, submit-for-approval, independent reviewer rationale, return-to-investigation, and audit history. | **Strong** | The live NGN 29,997.78 variance intentionally remains open because no genuine investigation/approval has been supplied. |
| Confidence and provenance model | Evidence has source references; proposal confidence is exposed; reconciliation and audit retain provenance. | **Partial** | A formal cross-domain truth taxonomy—claimed, recorded, externally evidenced, reconciled, verified—has not yet been modelled as a canonical invariant. |
| No destructive financial operation | Corrections, evidence associations, and approval decisions are append-oriented. | **Strong within implemented modules** | Formal payment reversal, invoice reversal, and ledger reversal patterns are not yet present. |
| Modular monolith before microservices | One TypeScript web application contains distinct organisation, branch, evidence, reconciliation, exception, membership, and audit modules. | **Directionally aligned** | The current large control router should be decomposed into stronger domain modules as scope grows, but it is preferable to premature microservices. |
| Tenant isolation and least privilege | Organisation/branch memberships and protected procedures enforce scope; role checks include owner, controller, operator, manager, and approver. | **Partial** | The current boundary is primarily application-enforced; the target’s database-level isolation/RLS is not present. |
| Mobile/offline field execution | Mobile-responsive web UI exists. | **Not yet aligned** | There is no React Native client, SQLite event queue, offline sync protocol, or conflict engine. |
| Operational control centre | Dashboard foregrounds reconciliation coverage, exceptions, branch scope, and owner/controller variance portfolio. | **Strong in Release 1 scope** | Sales, collections, overdue, inventory variance, credit breach, and broader drill-downs require later economic modules. |
| Asynchronous eventing and transactional outbox | Idempotency is implemented for material commands. | **Partial** | There is no canonical event store, transactional outbox, queue, worker fleet, or retry/dead-letter strategy yet. |

## What is already correctly aligned

### 1. The product is being built as a control system, not a generic CRUD application

The thesis rejects a simplistic “frontend → CRUD API → database → reports” model. The current implementation also rejects that approach in the parts it covers. A payment observation is not treated as a settlement fact merely because it is stored. It may be recorded, linked, matched, remain unresolved, generate an exception, receive investigation notes, and eventually receive an independent approval decision. That is a meaningful control chain rather than a mutable status field.

### 2. Financial truth is append-oriented in the implemented domain

The live workflow preserves original evidence and receivable records while recording associations and corrections separately. Reconciliation links and exception-approval decisions retain provenance. The open NGN 29,997.78 exception was intentionally not auto-resolved after receipt extraction. This directly supports the supplied thesis’s requirement that the system explain *what happened, who did it, when, why, and what replaced it*.

### 3. The reconciliation and AI boundaries are correct

The thesis appropriately states that AI should recommend rather than silently rewrite financial truth. Release 1 follows this: OPay extraction is proposal-only, human review is required, and the organisation-level feature is now disabled by default until an owner accepts the processing notice. The extracted proposal does not create evidence, allocate payment, reconcile, settle, resolve, or approve anything.

### 4. Modular monolith is the right current direction

The supplied document recommends a modular monolith with workers rather than premature microservices. The current TypeScript/React/Express/tRPC application is a modular-monolith starting point. It should keep that strategy for the next phase, while splitting the growing `control` router into bounded modules such as receivables, evidence, reconciliation, exceptions, policy, and audit.

## Material gaps against the target architecture

| Target capability | Current position | Required architectural direction |
|---|---|---|
| Canonical economic event model | Several append-oriented tables exist, but no unified `BusinessEvent`/economic-event contract spans every domain. | Introduce canonical event envelopes with tenant, entity, type, occurred/recorded time, actor, source, correlation ID, idempotency key, payload version, and causal links. |
| Double-entry ledger | Not implemented. Current receivable/reconciliation views are operational controls, not a general ledger. | Build a purpose-designed posting subsystem with balanced transaction invariant, chart of accounts, posting rules, reversals, and derived balances. Do not retrofit a ledger as UI fields. |
| Full FMCG commercial flow | Customers, receivables, evidence, and reconciliation exist; orders, products, deliveries, invoices, credit, returns, and settlements do not. | Add vertical domain modules in economic sequence: party/customer → product/price → order → delivery/fulfilment → invoice/obligation → payment → reconciliation → ledger. |
| Inventory movement model | Not implemented. | Use immutable inventory movements with SKU, warehouse, batch, expiry, unit, cost, and controlled adjustments; derive stock position from movements. |
| Configurable policy engine | A governed exception approval workflow is implemented, but approvals are still purpose-built rather than policy-configured thresholds/rules. | Introduce a reusable policy evaluation and approval-routing module after core commercial/ledger events exist. |
| PostgreSQL authority and database isolation | Current Drizzle configuration targets MySQL/TiDB (`dialect: mysql`), not PostgreSQL. | Do not replatform merely for fashion. Before implementing a true ledger and high-risk multi-tenant expansion, create a deliberate PostgreSQL/RLS migration decision and plan because the thesis’s RLS, JSONB, and financial-control assumptions are PostgreSQL-oriented. |
| Transactional outbox and workers | Not implemented. | For payment provider webhooks, notifications, analytics, and future integrations, commit business state, ledger posting, audit, and outbox event in one transaction; publish with retrying workers afterward. |
| External adapter architecture | No live PSP/bank, tax, accounting, messaging, or conversation adapter is implemented. | Define stable canonical command/event interfaces first; add provider adapters behind them rather than coupling providers to core tables. |
| Offline-first mobile client | Not implemented. | Create a separate React Native field client with SQLite, device event IDs, sync acknowledgements, idempotent server commands, and deterministic conflict treatment when field flows justify it. |
| Observability, SLOs, restoration drills | Correlation IDs and append-only audit are present; OpenTelemetry, SLOs, metrics/alerting, restore validation, and operational runbooks are not yet evidenced. | Add trace/metric/log correlation, measurable reliability objectives, tested restoration, and operational incident/reconciliation procedures before scaling financial use. |
| Defence-in-depth file controls | Managed storage, file metadata limits, and role checks exist; a legacy raw object path was found reachable and needs provider-level rotation/revocation. | Complete object rotation/revocation, reverify served paths, add file signature validation and malware scanning/review as risk and volume justify. |

## Stack comparison: compatible principles, different current implementation

The user document proposes **Next.js/React, React Native, NestJS, PostgreSQL, Redis/BullMQ, transactional outbox, S3-compatible storage, OpenTelemetry, and managed cloud infrastructure**. The current Release 1 application uses **React, TypeScript, Vite, Express, tRPC, Drizzle, MySQL/TiDB-compatible storage, managed object storage, and Manus OAuth**.

This is **not a philosophical conflict**. It is a scope and maturity difference. React and TypeScript are aligned. Managed object storage, OAuth-style identity, integer money, scoped authorisation, idempotency, and append-only audit are aligned. The important divergences are the primary database and the lack of an outbox/worker/mobile/observability layer.

The recommended decision is **not** to interrupt Release 1 with an immediate framework rewrite from Express/tRPC to NestJS/REST or from Vite to Next.js. That would create migration risk without advancing the economic model. The first material architecture decision should instead be whether the planned ledger and multi-tenant scale warrant migration to PostgreSQL before those modules are built. If yes, do it as a deliberately tested data-platform transition before ledger posting becomes authoritative.

## Recommended phased reconciliation of the current product with the thesis

| Phase | Architectural objective | Concrete deliverables | Exit condition |
|---|---|---|---|
| **0 — Secure Release 1 control wedge** | Finish present safeguards and live validation. | Rotate/revoke exposed receipt object; verify protected file delivery in production; complete genuine approval/mobile acceptance; finish transactional audit coverage. | Existing receivable/evidence/exception workflow is safe for controlled pilot use. |
| **1 — Canonical economic core** | Establish the shared language of truth. | Economic event envelope, policy/approval interfaces, chart of accounts, double-entry posting engine, reversal model, financial invariants. | Every implemented material business event produces balanced, traceable economic consequences. |
| **2 — FMCG domain engine** | Add operating reality without polluting the core. | Product, price, customer credit, order, delivery, invoice, settlement, return, inventory movement, batch/expiry controls. | The complete order-to-cash path is represented through immutable events and ledger consequences. |
| **3 — Reliable integration platform** | Decouple external effects from synchronous truth. | Transactional outbox, workers, PSP/bank adapters, webhooks, retry/dead-letter controls, notifications, accounting/tax adapters. | Provider failures cannot lose or silently duplicate committed financial events. |
| **4 — Field mobility and intelligence** | Support real execution and recommend actions safely. | Offline-first React Native client, SQLite queue, sync/conflict model, analytics pipeline, anomaly recommendations, policy-governed human decisions. | Offline transactions are idempotent and reconciled; intelligence never directly alters financial truth. |
| **5 — Scale and assurance** | Operate as a mature multi-tenant financial-control platform. | PostgreSQL/RLS decision if adopted, observability, SLOs, restore drills, external security testing, analytics separation, selective service extraction. | Measured reliability, recovery, security, and operational capacity justify broader rollout. |

## Bottom line

The supplied thesis is **the correct north-star architecture** for this product. It clarifies why the current decisions around exact money, source provenance, append-only corrections, deterministic reconciliation, approval separation, evidence handling, and AI proposals are valuable. Those are not isolated features; they are the beginnings of the **economic-control core**.

The main correction is one of scope discipline: do not call the current Release 1 app the finished architecture. Treat it as the verified starting module—**receivable/evidence/reconciliation/exception control**—inside the larger modular business-control platform. Build the ledger and canonical economic-event model before expanding into general ERP breadth, and introduce queues, mobile offline sync, analytics, and selective service extraction only when the operating evidence requires them.

## Source references

[1] User-supplied “revised business thesis and target technical architecture,” `/home/ubuntu/upload/pasted_content_7.txt`, especially its economic-event chain, reconciliation, ledger, modular-monolith, outbox, offline, and architecture sections.

[2] Current Release 1 readiness evidence, `/home/ubuntu/business-control-platform/validation/release-readiness-evaluation-draft.md`.
