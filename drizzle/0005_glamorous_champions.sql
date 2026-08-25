CREATE TABLE `evidenceFileAccessGrants` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`evidenceFileId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidenceFileAccessGrants_id` PRIMARY KEY(`id`),
	CONSTRAINT `evidence_file_access_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `evidence_file_access_scope_expiry_index` ON `evidenceFileAccessGrants` (`organisationId`,`branchId`,`evidenceFileId`,`userId`,`expiresAt`);