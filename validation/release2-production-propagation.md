# Release 2 Production Propagation Check

**Checked:** 25 August 2026, immediately after checkpoint `81e1b438`.

The published root at `https://businessctl-izzrxsu9.manus.space/` remained reachable and authenticated, but its rendered navigation still showed the prior Release 1 items only. A direct visit to `/operations` returned the hosting-level 404 page. This was observed immediately after automatic publication and is therefore recorded as a **propagation observation**, not as a successful Release 2 production acceptance result or a confirmed application-routing defect.

The development preview had already rendered the Release 2 Operations, Collections, and owner Evidence governance entry points at both desktop and mobile viewport sizes. The release checkpoint preserves all earlier Release 1 financial/evidence history; no product, stock, order, delivery, invoice, collection, resolution, settlement, or variance record was created during this check.

Production Release 2 route availability and real-device authenticated acceptance remain open validation gates. The known provider-level legacy raw-object rotation/revocation gate also remains open.

## Follow-up observation

A second passive check of `/operations` still returned the hosting-level 404. The published root remained reachable but continued to show the earlier Release 1 navigation without **Operations** or **Collections**. A production-log request returned `cloudrun service not found`, so no live-container diagnosis was available from that endpoint. No conclusion beyond **production propagation is not yet verified** is warranted.
