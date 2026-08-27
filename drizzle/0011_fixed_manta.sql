CREATE TABLE `exceptionNoteAttachments` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`exceptionId` varchar(36) NOT NULL,
	`exceptionNoteId` varchar(36) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`contentType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`checksum` varchar(128) NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `exceptionNoteAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `exception_note_attachment_scope_index` ON `exceptionNoteAttachments` (`organisationId`,`branchId`,`exceptionId`,`exceptionNoteId`,`createdAt`);