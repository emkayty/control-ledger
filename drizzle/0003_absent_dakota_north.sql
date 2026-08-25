CREATE TABLE `evidenceAssociationCorrections` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`evidenceEventId` varchar(36) NOT NULL,
	`obligationId` varchar(36) NOT NULL,
	`reason` varchar(500) NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidenceAssociationCorrections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `evidence_association_correction_scope_index` ON `evidenceAssociationCorrections` (`organisationId`,`branchId`,`evidenceEventId`,`createdAt`);