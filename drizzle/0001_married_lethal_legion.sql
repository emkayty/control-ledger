CREATE TABLE `auditEvents` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36),
	`actorUserId` int NOT NULL,
	`action` varchar(96) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` varchar(36) NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`metadata` json,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`code` varchar(36) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_organisation_code_unique` UNIQUE(`organisationId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `controlExceptions` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`obligationId` varchar(36),
	`evidenceEventId` varchar(36),
	`type` enum('short_payment','duplicate_input','delayed_settlement','unmatched_record','source_conflict','invalid_intake') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('open','investigating','pending_approval','resolved','rejected') NOT NULL DEFAULT 'open',
	`title` varchar(180) NOT NULL,
	`valueImpactMinor` decimal(20,0),
	`currency` varchar(3),
	`ownerUserId` int,
	`dueAt` timestamp,
	`resolutionNote` text,
	`resolvedAt` timestamp,
	`resolvedByUserId` int,
	`approvalRequired` int NOT NULL DEFAULT 0,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `controlExceptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`name` varchar(180) NOT NULL,
	`code` varchar(64) NOT NULL,
	`contactName` varchar(160),
	`contactEmail` varchar(320),
	`contactPhone` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_org_code_unique` UNIQUE(`organisationId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `evidenceEvents` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`obligationId` varchar(36),
	`customerId` varchar(36),
	`kind` enum('delivery_observation','payment_observation','settlement_evidence','correction') NOT NULL,
	`status` enum('recorded','matched','verified','unresolved','quarantined','reversed') NOT NULL DEFAULT 'recorded',
	`amountMinor` decimal(20,0),
	`currency` varchar(3),
	`sourceName` varchar(96) NOT NULL,
	`sourceReference` varchar(160),
	`sourceMetadata` json,
	`occurredAt` timestamp,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`correlationId` varchar(72) NOT NULL,
	`payloadHash` varchar(128),
	`correctsEventId` varchar(36),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `evidenceEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `evidence_org_source_reference_unique` UNIQUE(`organisationId`,`sourceName`,`sourceReference`)
);
--> statement-breakpoint
CREATE TABLE `evidenceFiles` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`evidenceEventId` varchar(36),
	`exceptionId` varchar(36),
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(700) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`contentType` varchar(128) NOT NULL,
	`sizeBytes` int NOT NULL,
	`checksum` varchar(128),
	`sourceName` varchar(96) NOT NULL DEFAULT 'user_upload',
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `evidenceFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exceptionNotes` (
	`id` varchar(36) NOT NULL,
	`exceptionId` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	CONSTRAINT `exceptionNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `idempotencyKeys` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(96) NOT NULL,
	`idempotencyKey` varchar(128) NOT NULL,
	`requestHash` varchar(128) NOT NULL,
	`responseMetadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `idempotencyKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `idempotency_scope_key_unique` UNIQUE(`organisationId`,`actorUserId`,`action`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `integrationIntakeRecords` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`sourceName` varchar(96) NOT NULL,
	`sourceReference` varchar(160) NOT NULL,
	`payloadHash` varchar(128) NOT NULL,
	`status` enum('accepted','duplicate','quarantined') NOT NULL DEFAULT 'accepted',
	`quarantineReason` varchar(255),
	`sourceMetadata` json,
	`evidenceEventId` varchar(36),
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`correlationId` varchar(72) NOT NULL,
	CONSTRAINT `integrationIntakeRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `intake_source_reference_unique` UNIQUE(`organisationId`,`sourceName`,`sourceReference`)
);
--> statement-breakpoint
CREATE TABLE `organisationMemberships` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`branchId` varchar(36),
	`role` enum('owner','controller','operator','manager','approver') NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organisationMemberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_scope_unique` UNIQUE(`organisationId`,`userId`,`branchId`)
);
--> statement-breakpoint
CREATE TABLE `organisations` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`legalName` varchar(180),
	`baseCurrency` varchar(3) NOT NULL DEFAULT 'NGN',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `organisations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `receivableObligations` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`customerId` varchar(36) NOT NULL,
	`reference` varchar(96) NOT NULL,
	`amountMinor` decimal(20,0) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`dueAt` timestamp,
	`status` enum('open','partially_paid','settled','overdue','disputed') NOT NULL DEFAULT 'open',
	`sourceType` varchar(48) NOT NULL DEFAULT 'manual',
	`sourceReference` varchar(128),
	`sourceMetadata` json,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	`correctsObligationId` varchar(36),
	CONSTRAINT `receivableObligations_id` PRIMARY KEY(`id`),
	CONSTRAINT `obligation_org_reference_unique` UNIQUE(`organisationId`,`reference`)
);
--> statement-breakpoint
CREATE TABLE `reconciliationLinks` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`obligationId` varchar(36) NOT NULL,
	`evidenceEventId` varchar(36) NOT NULL,
	`allocatedMinor` decimal(20,0) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`matchType` enum('exact','partial','short','duplicate','delayed','manual_review') NOT NULL,
	`ruleVersion` varchar(48) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	CONSTRAINT `reconciliationLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `reconciliation_link_unique` UNIQUE(`obligationId`,`evidenceEventId`)
);
--> statement-breakpoint
CREATE INDEX `audit_scope_time_index` ON `auditEvents` (`organisationId`,`branchId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `audit_entity_index` ON `auditEvents` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `branches_organisation_index` ON `branches` (`organisationId`);--> statement-breakpoint
CREATE INDEX `exceptions_scope_status_index` ON `controlExceptions` (`organisationId`,`branchId`,`status`);--> statement-breakpoint
CREATE INDEX `exceptions_owner_index` ON `controlExceptions` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `customer_scope_index` ON `customers` (`organisationId`,`branchId`);--> statement-breakpoint
CREATE INDEX `evidence_scope_status_index` ON `evidenceEvents` (`organisationId`,`branchId`,`status`);--> statement-breakpoint
CREATE INDEX `evidence_obligation_index` ON `evidenceEvents` (`obligationId`);--> statement-breakpoint
CREATE INDEX `evidence_files_scope_index` ON `evidenceFiles` (`organisationId`,`branchId`);--> statement-breakpoint
CREATE INDEX `evidence_files_event_index` ON `evidenceFiles` (`evidenceEventId`);--> statement-breakpoint
CREATE INDEX `exception_notes_exception_index` ON `exceptionNotes` (`exceptionId`);--> statement-breakpoint
CREATE INDEX `intake_scope_status_index` ON `integrationIntakeRecords` (`organisationId`,`branchId`,`status`);--> statement-breakpoint
CREATE INDEX `membership_user_index` ON `organisationMemberships` (`userId`);--> statement-breakpoint
CREATE INDEX `membership_org_index` ON `organisationMemberships` (`organisationId`);--> statement-breakpoint
CREATE INDEX `obligation_scope_status_index` ON `receivableObligations` (`organisationId`,`branchId`,`status`);--> statement-breakpoint
CREATE INDEX `obligation_customer_index` ON `receivableObligations` (`customerId`);--> statement-breakpoint
CREATE INDEX `reconciliation_org_index` ON `reconciliationLinks` (`organisationId`);