CREATE TABLE `exceptionApprovalDecisions` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`exceptionId` varchar(36) NOT NULL,
	`decision` enum('submitted','approved','returned') NOT NULL,
	`rationale` text NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `exceptionApprovalDecisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `receiptExtractionProposals` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`evidenceFileId` varchar(36) NOT NULL,
	`provider` varchar(48) NOT NULL,
	`confidence` enum('low','medium','high') NOT NULL,
	`proposal` json NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `receiptExtractionProposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `exception_approval_decision_index` ON `exceptionApprovalDecisions` (`organisationId`,`branchId`,`exceptionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `receipt_extraction_file_index` ON `receiptExtractionProposals` (`organisationId`,`branchId`,`evidenceFileId`,`createdAt`);