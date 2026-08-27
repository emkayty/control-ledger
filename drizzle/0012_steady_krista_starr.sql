CREATE TABLE `pharmacyDispensingDecisions` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`dispensingRequestId` varchar(36) NOT NULL,
	`decision` enum('submitted','approved','returned','rejected') NOT NULL,
	`rationale` text NOT NULL,
	`pharmacistAuthorisationId` varchar(36),
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `pharmacyDispensingDecisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharmacyDispensingLines` (
	`id` varchar(36) NOT NULL,
	`dispensingRequestId` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`productId` varchar(36) NOT NULL,
	`stockLotId` varchar(36) NOT NULL,
	`quantity` decimal(20,3) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pharmacyDispensingLines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharmacyDispensingRequests` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`sourceReference` varchar(128) NOT NULL,
	`status` enum('draft','pending_review','returned','rejected','approved_for_supply','supplied') NOT NULL DEFAULT 'draft',
	`submittedAt` timestamp,
	`suppliedAt` timestamp,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `pharmacyDispensingRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharmacyPharmacistAuthorisations` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`credentialReference` varchar(160) NOT NULL,
	`status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp,
	`authorisedAt` timestamp NOT NULL DEFAULT (now()),
	`authorisedByUserId` int NOT NULL,
	`revokedAt` timestamp,
	`revokedByUserId` int,
	`revocationReason` varchar(500),
	`correlationId` varchar(72) NOT NULL,
	CONSTRAINT `pharmacyPharmacistAuthorisations_id` PRIMARY KEY(`id`),
	CONSTRAINT `pharmacy_pharmacist_scope_user_unique` UNIQUE(`organisationId`,`branchId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `pharmacyPolicies` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`isEnabled` int NOT NULL DEFAULT 0,
	`noticeVersion` varchar(32) NOT NULL DEFAULT 'pharmacy-dispensing-v1',
	`enabledAt` timestamp,
	`enabledByUserId` int,
	`disabledAt` timestamp,
	`disabledByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `pharmacyPolicies_id` PRIMARY KEY(`id`),
	CONSTRAINT `pharmacy_policy_org_unique` UNIQUE(`organisationId`)
);
--> statement-breakpoint
CREATE TABLE `pharmacySupplyEvents` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`dispensingRequestId` varchar(36) NOT NULL,
	`suppliedAt` timestamp NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `pharmacySupplyEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `pharmacy_supply_request_unique` UNIQUE(`dispensingRequestId`)
);
--> statement-breakpoint
CREATE INDEX `pharmacy_dispensing_decision_request_index` ON `pharmacyDispensingDecisions` (`organisationId`,`branchId`,`dispensingRequestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pharmacy_dispensing_line_request_index` ON `pharmacyDispensingLines` (`dispensingRequestId`);--> statement-breakpoint
CREATE INDEX `pharmacy_dispensing_line_batch_index` ON `pharmacyDispensingLines` (`organisationId`,`branchId`,`stockLotId`);--> statement-breakpoint
CREATE INDEX `pharmacy_dispensing_scope_status_index` ON `pharmacyDispensingRequests` (`organisationId`,`branchId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pharmacy_dispensing_source_index` ON `pharmacyDispensingRequests` (`organisationId`,`branchId`,`sourceReference`);--> statement-breakpoint
CREATE INDEX `pharmacy_pharmacist_scope_status_index` ON `pharmacyPharmacistAuthorisations` (`organisationId`,`branchId`,`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `pharmacy_supply_scope_time_index` ON `pharmacySupplyEvents` (`organisationId`,`branchId`,`suppliedAt`);