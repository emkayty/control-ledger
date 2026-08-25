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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Organisation = typeof organisations.$inferSelect;
export type OrganisationRole = (typeof organisationMemberships.$inferSelect)["role"];
