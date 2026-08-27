import {
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const organisations = mysqlTable("organisations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  legalName: varchar("legalName", { length: 180 }),
  baseCurrency: varchar("baseCurrency", { length: 3 }).notNull().default("NGN"),
  receiptExtractionEnabled: int("receiptExtractionEnabled").notNull().default(0),
  receiptExtractionPolicyAcceptedAt: timestamp("receiptExtractionPolicyAcceptedAt"),
  receiptExtractionPolicyAcceptedByUserId: int("receiptExtractionPolicyAcceptedByUserId"),
  varianceAiAssistanceEnabled: int("varianceAiAssistanceEnabled").notNull().default(0),
  varianceAiAssistancePolicyAcceptedAt: timestamp("varianceAiAssistancePolicyAcceptedAt"),
  varianceAiAssistancePolicyAcceptedByUserId: int("varianceAiAssistancePolicyAcceptedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdByUserId: int("createdByUserId").notNull(),
});

export const branches = mysqlTable(
  "branches",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    code: varchar("code", { length: 36 }).notNull(),
    isActive: int("isActive").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("branches_organisation_code_unique").on(table.organisationId, table.code),
    index("branches_organisation_index").on(table.organisationId),
  ],
);

export const organisationMemberships = mysqlTable(
  "organisationMemberships",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    userId: int("userId").notNull(),
    branchId: varchar("branchId", { length: 36 }),
    role: mysqlEnum("role", ["owner", "controller", "operator", "manager", "approver"])
      .notNull(),
    isActive: int("isActive").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("membership_scope_unique").on(table.organisationId, table.userId, table.branchId),
    index("membership_user_index").on(table.userId),
    index("membership_org_index").on(table.organisationId),
  ],
);

export const customers = mysqlTable(
  "customers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    contactName: varchar("contactName", { length: 160 }),
    contactEmail: varchar("contactEmail", { length: 320 }),
    contactPhone: varchar("contactPhone", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    uniqueIndex("customer_org_code_unique").on(table.organisationId, table.code),
    index("customer_scope_index").on(table.organisationId, table.branchId),
  ],
);

export const receivableObligations = mysqlTable(
  "receivableObligations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    customerId: varchar("customerId", { length: 36 }).notNull(),
    reference: varchar("reference", { length: 96 }).notNull(),
    amountMinor: decimal("amountMinor", { precision: 20, scale: 0 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    dueAt: timestamp("dueAt"),
    status: mysqlEnum("status", ["open", "partially_paid", "settled", "overdue", "disputed"])
      .notNull()
      .default("open"),
    sourceType: varchar("sourceType", { length: 48 }).notNull().default("manual"),
    sourceReference: varchar("sourceReference", { length: 128 }),
    sourceMetadata: json("sourceMetadata"),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    correctsObligationId: varchar("correctsObligationId", { length: 36 }),
  },
  table => [
    uniqueIndex("obligation_org_reference_unique").on(table.organisationId, table.reference),
    index("obligation_scope_status_index").on(table.organisationId, table.branchId, table.status),
    index("obligation_customer_index").on(table.customerId),
  ],
);

export const evidenceEvents = mysqlTable(
  "evidenceEvents",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    obligationId: varchar("obligationId", { length: 36 }),
    customerId: varchar("customerId", { length: 36 }),
    kind: mysqlEnum("kind", ["delivery_observation", "payment_observation", "settlement_evidence", "correction"])
      .notNull(),
    status: mysqlEnum("status", ["recorded", "matched", "verified", "unresolved", "quarantined", "reversed"])
      .notNull()
      .default("recorded"),
    amountMinor: decimal("amountMinor", { precision: 20, scale: 0 }),
    currency: varchar("currency", { length: 3 }),
    sourceName: varchar("sourceName", { length: 96 }).notNull(),
    sourceReference: varchar("sourceReference", { length: 160 }),
    sourceMetadata: json("sourceMetadata"),
    occurredAt: timestamp("occurredAt"),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    payloadHash: varchar("payloadHash", { length: 128 }),
    correctsEventId: varchar("correctsEventId", { length: 36 }),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    uniqueIndex("evidence_org_source_reference_unique").on(
      table.organisationId,
      table.sourceName,
      table.sourceReference,
    ),
    index("evidence_scope_status_index").on(table.organisationId, table.branchId, table.status),
    index("evidence_obligation_index").on(table.obligationId),
  ],
);

export const evidenceAssociationCorrections = mysqlTable(
  "evidenceAssociationCorrections",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    evidenceEventId: varchar("evidenceEventId", { length: 36 }).notNull(),
    obligationId: varchar("obligationId", { length: 36 }).notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("evidence_association_correction_scope_index").on(table.organisationId, table.branchId, table.evidenceEventId, table.createdAt),
  ],
);

export const evidenceFiles = mysqlTable(
  "evidenceFiles",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    evidenceEventId: varchar("evidenceEventId", { length: 36 }),
    exceptionId: varchar("exceptionId", { length: 36 }),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 700 }).notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    contentType: varchar("contentType", { length: 128 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    checksum: varchar("checksum", { length: 128 }),
    sourceName: varchar("sourceName", { length: 96 }).notNull().default("user_upload"),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    index("evidence_files_scope_index").on(table.organisationId, table.branchId),
    index("evidence_files_event_index").on(table.evidenceEventId),
  ],
);

export const evidenceFileAccessGrants = mysqlTable(
  "evidenceFileAccessGrants",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    evidenceFileId: varchar("evidenceFileId", { length: 36 }).notNull(),
    userId: int("userId").notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("evidence_file_access_token_unique").on(table.tokenHash),
    index("evidence_file_access_scope_expiry_index").on(table.organisationId, table.branchId, table.evidenceFileId, table.userId, table.expiresAt),
  ],
);

export const reconciliationLinks = mysqlTable(
  "reconciliationLinks",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    obligationId: varchar("obligationId", { length: 36 }).notNull(),
    evidenceEventId: varchar("evidenceEventId", { length: 36 }).notNull(),
    allocatedMinor: decimal("allocatedMinor", { precision: 20, scale: 0 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    matchType: mysqlEnum("matchType", ["exact", "partial", "short", "duplicate", "delayed", "manual_review"])
      .notNull(),
    ruleVersion: varchar("ruleVersion", { length: 48 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
  },
  table => [
    uniqueIndex("reconciliation_link_unique").on(table.obligationId, table.evidenceEventId),
    index("reconciliation_org_index").on(table.organisationId),
  ],
);

export const controlExceptions = mysqlTable(
  "controlExceptions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    obligationId: varchar("obligationId", { length: 36 }),
    evidenceEventId: varchar("evidenceEventId", { length: 36 }),
    type: mysqlEnum("type", ["partial_payment", "short_payment", "duplicate_input", "delayed_settlement", "unmatched_record", "source_conflict", "invalid_intake"])
      .notNull(),
    severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull().default("medium"),
    status: mysqlEnum("status", ["open", "investigating", "pending_approval", "resolved", "rejected"])
      .notNull()
      .default("open"),
    title: varchar("title", { length: 180 }).notNull(),
    valueImpactMinor: decimal("valueImpactMinor", { precision: 20, scale: 0 }),
    currency: varchar("currency", { length: 3 }),
    ownerUserId: int("ownerUserId"),
    dueAt: timestamp("dueAt"),
    resolutionNote: text("resolutionNote"),
    resolvedAt: timestamp("resolvedAt"),
    resolvedByUserId: int("resolvedByUserId"),
    approvalRequired: int("approvalRequired").notNull().default(0),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    index("exceptions_scope_status_index").on(table.organisationId, table.branchId, table.status),
    index("exceptions_owner_index").on(table.ownerUserId),
  ],
);

export const exceptionNotes = mysqlTable(
  "exceptionNotes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    exceptionId: varchar("exceptionId", { length: 36 }).notNull(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
  },
  table => [index("exception_notes_exception_index").on(table.exceptionId)],
);

/**
 * Append-only controlled file links for a specific investigation note.
 * File bytes remain in managed storage and are retrieved only after a scoped server-side check.
 */
export const exceptionNoteAttachments = mysqlTable(
  "exceptionNoteAttachments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    exceptionId: varchar("exceptionId", { length: 36 }).notNull(),
    exceptionNoteId: varchar("exceptionNoteId", { length: 36 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    contentType: varchar("contentType", { length: 120 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    checksum: varchar("checksum", { length: 128 }).notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [index("exception_note_attachment_scope_index").on(table.organisationId, table.branchId, table.exceptionId, table.exceptionNoteId, table.createdAt)],
);

export const exceptionApprovalDecisions = mysqlTable(
  "exceptionApprovalDecisions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    exceptionId: varchar("exceptionId", { length: 36 }).notNull(),
    decision: mysqlEnum("decision", ["submitted", "approved", "returned"]).notNull(),
    rationale: text("rationale").notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [index("exception_approval_decision_index").on(table.organisationId, table.branchId, table.exceptionId, table.createdAt)],
);

export const receiptExtractionProposals = mysqlTable(
  "receiptExtractionProposals",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    evidenceFileId: varchar("evidenceFileId", { length: 36 }).notNull(),
    provider: varchar("provider", { length: 48 }).notNull(),
    confidence: mysqlEnum("confidence", ["low", "medium", "high"]).notNull(),
    proposal: json("proposal").notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [index("receipt_extraction_file_index").on(table.organisationId, table.branchId, table.evidenceFileId, table.createdAt)],
);

/**
 * Append-only, human-review-only AI assistance for a control exception.
 * The proposal never changes the related exception, evidence, reconciliation, or ledger records.
 */
export const varianceAiSuggestions = mysqlTable(
  "varianceAiSuggestions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    exceptionId: varchar("exceptionId", { length: 36 }).notNull(),
    model: varchar("model", { length: 96 }).notNull(),
    confidence: mysqlEnum("confidence", ["low", "medium", "high"]).notNull(),
    inputHash: varchar("inputHash", { length: 128 }).notNull(),
    proposal: json("proposal").notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    index("variance_ai_suggestion_exception_index").on(table.organisationId, table.branchId, table.exceptionId, table.createdAt),
  ],
);

export const integrationIntakeRecords = mysqlTable(
  "integrationIntakeRecords",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    sourceName: varchar("sourceName", { length: 96 }).notNull(),
    sourceReference: varchar("sourceReference", { length: 160 }).notNull(),
    payloadHash: varchar("payloadHash", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["accepted", "duplicate", "quarantined"])
      .notNull()
      .default("accepted"),
    quarantineReason: varchar("quarantineReason", { length: 255 }),
    sourceMetadata: json("sourceMetadata"),
    evidenceEventId: varchar("evidenceEventId", { length: 36 }),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
  },
  table => [
    uniqueIndex("intake_source_reference_unique").on(table.organisationId, table.sourceName, table.sourceReference),
    index("intake_scope_status_index").on(table.organisationId, table.branchId, table.status),
  ],
);

export const auditEvents = mysqlTable(
  "auditEvents",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }),
    actorUserId: int("actorUserId").notNull(),
    action: varchar("action", { length: 96 }).notNull(),
    entityType: varchar("entityType", { length: 64 }).notNull(),
    entityId: varchar("entityId", { length: 36 }).notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    metadata: json("metadata"),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  },
  table => [
    index("audit_scope_time_index").on(table.organisationId, table.branchId, table.occurredAt),
    index("audit_entity_index").on(table.entityType, table.entityId),
  ],
);

export const idempotencyKeys = mysqlTable(
  "idempotencyKeys",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    actorUserId: int("actorUserId").notNull(),
    action: varchar("action", { length: 96 }).notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull(),
    requestHash: varchar("requestHash", { length: 128 }).notNull(),
    responseMetadata: json("responseMetadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt"),
  },
  table => [
    uniqueIndex("idempotency_scope_key_unique").on(table.organisationId, table.actorUserId, table.action, table.idempotencyKey),
  ],
);

export const products = mysqlTable(
  "products",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    sku: varchar("sku", { length: 96 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    unitOfMeasure: varchar("unitOfMeasure", { length: 32 }).notNull().default("unit"),
    reorderPointQuantity: decimal("reorderPointQuantity", { precision: 20, scale: 3 }).notNull().default("0"),
    isActive: int("isActive").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    uniqueIndex("product_org_sku_unique").on(table.organisationId, table.sku),
    index("product_scope_active_index").on(table.organisationId, table.branchId, table.isActive),
  ],
);

export const stockLots = mysqlTable(
  "stockLots",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    productId: varchar("productId", { length: 36 }).notNull(),
    batchCode: varchar("batchCode", { length: 96 }).notNull(),
    expiryAt: timestamp("expiryAt"),
    status: mysqlEnum("status", ["active", "quarantined", "exhausted", "expired"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    uniqueIndex("stock_lot_scope_batch_unique").on(table.organisationId, table.branchId, table.productId, table.batchCode),
    index("stock_lot_scope_expiry_index").on(table.organisationId, table.branchId, table.productId, table.expiryAt),
  ],
);

export const customerOrders = mysqlTable(
  "customerOrders",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    customerId: varchar("customerId", { length: 36 }).notNull(),
    orderNumber: varchar("orderNumber", { length: 96 }).notNull(),
    status: mysqlEnum("status", ["draft", "confirmed", "delivered", "invoiced", "cancelled"]).notNull().default("draft"),
    orderedAt: timestamp("orderedAt").defaultNow().notNull(),
    expectedDeliveryAt: timestamp("expectedDeliveryAt"),
    note: varchar("note", { length: 500 }),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    uniqueIndex("customer_order_org_number_unique").on(table.organisationId, table.orderNumber),
    index("customer_order_scope_status_index").on(table.organisationId, table.branchId, table.status, table.orderedAt),
    index("customer_order_customer_index").on(table.customerId),
  ],
);

export const customerOrderLines = mysqlTable(
  "customerOrderLines",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("orderId", { length: 36 }).notNull(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    productId: varchar("productId", { length: 36 }).notNull(),
    quantity: decimal("quantity", { precision: 20, scale: 3 }).notNull(),
    unitPriceMinor: decimal("unitPriceMinor", { precision: 20, scale: 0 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("customer_order_line_order_index").on(table.orderId), index("customer_order_line_product_index").on(table.productId)],
);

export const deliveries = mysqlTable(
  "deliveries",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    orderId: varchar("orderId", { length: 36 }).notNull(),
    deliveryNumber: varchar("deliveryNumber", { length: 96 }).notNull(),
    status: mysqlEnum("status", ["recorded", "confirmed", "cancelled"]).notNull().default("recorded"),
    deliveredAt: timestamp("deliveredAt").notNull(),
    recipientName: varchar("recipientName", { length: 180 }),
    note: varchar("note", { length: 500 }),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    uniqueIndex("delivery_org_number_unique").on(table.organisationId, table.deliveryNumber),
    index("delivery_scope_status_index").on(table.organisationId, table.branchId, table.status, table.deliveredAt),
    index("delivery_order_index").on(table.orderId),
  ],
);

export const deliveryLines = mysqlTable(
  "deliveryLines",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    deliveryId: varchar("deliveryId", { length: 36 }).notNull(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    productId: varchar("productId", { length: 36 }).notNull(),
    stockLotId: varchar("stockLotId", { length: 36 }),
    quantity: decimal("quantity", { precision: 20, scale: 3 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("delivery_line_delivery_index").on(table.deliveryId), index("delivery_line_product_index").on(table.productId)],
);

export const invoices = mysqlTable(
  "invoices",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    customerId: varchar("customerId", { length: 36 }).notNull(),
    orderId: varchar("orderId", { length: 36 }).notNull(),
    deliveryId: varchar("deliveryId", { length: 36 }),
    obligationId: varchar("obligationId", { length: 36 }).notNull(),
    invoiceNumber: varchar("invoiceNumber", { length: 96 }).notNull(),
    status: mysqlEnum("status", ["issued", "cancelled"]).notNull().default("issued"),
    amountMinor: decimal("amountMinor", { precision: 20, scale: 0 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    uniqueIndex("invoice_org_number_unique").on(table.organisationId, table.invoiceNumber),
    uniqueIndex("invoice_obligation_unique").on(table.obligationId),
    index("invoice_scope_status_index").on(table.organisationId, table.branchId, table.status, table.issuedAt),
    index("invoice_customer_index").on(table.customerId),
  ],
);

export const stockMovements = mysqlTable(
  "stockMovements",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    productId: varchar("productId", { length: 36 }).notNull(),
    stockLotId: varchar("stockLotId", { length: 36 }),
    movementType: mysqlEnum("movementType", ["opening", "receipt", "delivery", "transfer_out", "transfer_in", "adjustment"])
      .notNull(),
    quantityDelta: decimal("quantityDelta", { precision: 20, scale: 3 }).notNull(),
    deliveryId: varchar("deliveryId", { length: 36 }),
    transferReference: varchar("transferReference", { length: 96 }),
    reason: varchar("reason", { length: 500 }),
    occurredAt: timestamp("occurredAt").notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    index("stock_movement_product_scope_time_index").on(table.organisationId, table.branchId, table.productId, table.occurredAt),
    index("stock_movement_lot_index").on(table.stockLotId),
    uniqueIndex("stock_movement_delivery_product_unique").on(table.deliveryId, table.productId),
  ],
);

export const collectionFollowUps = mysqlTable(
  "collectionFollowUps",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    customerId: varchar("customerId", { length: 36 }).notNull(),
    obligationId: varchar("obligationId", { length: 36 }).notNull(),
    status: mysqlEnum("status", ["open", "contacted", "promised", "disputed", "closed"]).notNull().default("open"),
    reason: mysqlEnum("reason", ["partial_payment", "pending_bank", "customer_dispute", "reconciliation_required", "other"]).notNull(),
    note: text("note").notNull(),
    nextActionAt: timestamp("nextActionAt"),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [index("collection_followup_scope_status_index").on(table.organisationId, table.branchId, table.status, table.nextActionAt), index("collection_followup_obligation_index").on(table.obligationId)],
);

export const evidenceStorageRemediations = mysqlTable(
  "evidenceStorageRemediations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    evidenceFileId: varchar("evidenceFileId", { length: 36 }).notNull(),
    status: mysqlEnum("status", ["identified", "provider_requested", "provider_confirmed"]).notNull().default("identified"),
    providerReference: varchar("providerReference", { length: 255 }),
    note: text("note").notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [index("evidence_storage_remediation_file_index").on(table.organisationId, table.branchId, table.evidenceFileId, table.createdAt)],
);

export const evidenceRetentionReviews = mysqlTable(
  "evidenceRetentionReviews",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    evidenceFileId: varchar("evidenceFileId", { length: 36 }).notNull(),
    reviewStatus: mysqlEnum("reviewStatus", ["retained", "review_due", "legal_hold"]).notNull(),
    retentionUntil: timestamp("retentionUntil"),
    note: text("note").notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [index("evidence_retention_scope_index").on(table.organisationId, table.branchId, table.evidenceFileId, table.createdAt)],
);

export const economicEvents = mysqlTable(
  "economicEvents",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    eventType: varchar("eventType", { length: 96 }).notNull(),
    status: mysqlEnum("status", ["recorded", "ready_to_post", "posted", "reversed"]).notNull().default("recorded"),
    sourceType: varchar("sourceType", { length: 64 }).notNull(),
    sourceId: varchar("sourceId", { length: 36 }),
    sourceReference: varchar("sourceReference", { length: 128 }),
    causalEventId: varchar("causalEventId", { length: 36 }),
    payloadVersion: int("payloadVersion").notNull().default(1),
    payload: json("payload"),
    occurredAt: timestamp("occurredAt").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
    actorUserId: int("actorUserId").notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
  },
  table => [
    uniqueIndex("economic_event_source_unique").on(table.organisationId, table.eventType, table.sourceType, table.sourceId),
    index("economic_event_scope_status_time_index").on(table.organisationId, table.branchId, table.status, table.occurredAt),
    index("economic_event_correlation_index").on(table.correlationId),
  ],
);

export const ledgerAccounts = mysqlTable(
  "ledgerAccounts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    accountClass: mysqlEnum("accountClass", ["asset", "liability", "equity", "revenue", "expense"]).notNull(),
    normalBalance: mysqlEnum("normalBalance", ["debit", "credit"]).notNull(),
    isActive: int("isActive").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    uniqueIndex("ledger_account_org_code_unique").on(table.organisationId, table.code),
    index("ledger_account_org_active_index").on(table.organisationId, table.isActive, table.accountClass),
  ],
);

export const accountingPeriods = mysqlTable(
  "accountingPeriods",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    periodName: varchar("periodName", { length: 96 }).notNull(),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    status: mysqlEnum("status", ["open", "close_requested", "closed"]).notNull().default("open"),
    closeRequestedByUserId: int("closeRequestedByUserId"),
    closeRequestedAt: timestamp("closeRequestedAt"),
    closedByUserId: int("closedByUserId"),
    closedAt: timestamp("closedAt"),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [
    uniqueIndex("accounting_period_scope_name_unique").on(table.organisationId, table.branchId, table.periodName),
    index("accounting_period_scope_status_dates_index").on(table.organisationId, table.branchId, table.status, table.startsAt, table.endsAt),
  ],
);

export const accountingPeriodDecisions = mysqlTable(
  "accountingPeriodDecisions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    periodId: varchar("periodId", { length: 36 }).notNull(),
    decision: mysqlEnum("decision", ["created", "close_requested", "close_approved", "close_rejected"]).notNull(),
    rationale: text("rationale").notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [index("accounting_period_decision_scope_time_index").on(table.organisationId, table.branchId, table.periodId, table.createdAt)],
);

export const ledgerJournals = mysqlTable(
  "ledgerJournals",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    economicEventId: varchar("economicEventId", { length: 36 }).notNull(),
    periodId: varchar("periodId", { length: 36 }),
    sourceType: varchar("sourceType", { length: 64 }).notNull(),
    sourceId: varchar("sourceId", { length: 36 }).notNull(),
    sourceReference: varchar("sourceReference", { length: 128 }),
    status: mysqlEnum("status", ["draft", "ready", "posted", "reversed"]).notNull().default("draft"),
    currency: varchar("currency", { length: 3 }).notNull(),
    memo: varchar("memo", { length: 500 }).notNull(),
    reversalOfJournalId: varchar("reversalOfJournalId", { length: 36 }),
    preparedAt: timestamp("preparedAt").defaultNow().notNull(),
    preparedByUserId: int("preparedByUserId").notNull(),
    postedAt: timestamp("postedAt"),
    postedByUserId: int("postedByUserId"),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("ledger_journal_scope_status_time_index").on(table.organisationId, table.branchId, table.status, table.preparedAt),
    index("ledger_journal_period_index").on(table.organisationId, table.branchId, table.periodId, table.preparedAt),
    index("ledger_journal_source_index").on(table.organisationId, table.sourceType, table.sourceId),
    uniqueIndex("ledger_journal_event_unique").on(table.economicEventId),
  ],
);

export const ledgerJournalLines = mysqlTable(
  "ledgerJournalLines",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    journalId: varchar("journalId", { length: 36 }).notNull(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    accountId: varchar("accountId", { length: 36 }).notNull(),
    debitMinor: decimal("debitMinor", { precision: 20, scale: 0 }).notNull().default("0"),
    creditMinor: decimal("creditMinor", { precision: 20, scale: 0 }).notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull(),
    memo: varchar("memo", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("ledger_journal_line_journal_index").on(table.journalId),
    index("ledger_journal_line_account_index").on(table.organisationId, table.branchId, table.accountId),
  ],
);

export const ledgerJournalDecisions = mysqlTable(
  "ledgerJournalDecisions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organisationId: varchar("organisationId", { length: 36 }).notNull(),
    branchId: varchar("branchId", { length: 36 }).notNull(),
    journalId: varchar("journalId", { length: 36 }).notNull(),
    decision: mysqlEnum("decision", ["prepared", "submitted", "posted", "reversed"]).notNull(),
    rationale: text("rationale").notNull(),
    correlationId: varchar("correlationId", { length: 72 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdByUserId: int("createdByUserId").notNull(),
  },
  table => [index("ledger_journal_decision_time_index").on(table.organisationId, table.branchId, table.journalId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Organisation = typeof organisations.$inferSelect;
export type OrganisationRole = (typeof organisationMemberships.$inferSelect)["role"];
