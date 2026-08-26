CREATE TABLE `varianceAiSuggestions` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`exceptionId` varchar(36) NOT NULL,
	`model` varchar(96) NOT NULL,
	`confidence` enum('low','medium','high') NOT NULL,
	`inputHash` varchar(128) NOT NULL,
	`proposal` json NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `varianceAiSuggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `organisations` ADD `varianceAiAssistanceEnabled` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `organisations` ADD `varianceAiAssistancePolicyAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `organisations` ADD `varianceAiAssistancePolicyAcceptedByUserId` int;--> statement-breakpoint
CREATE INDEX `variance_ai_suggestion_exception_index` ON `varianceAiSuggestions` (`organisationId`,`branchId`,`exceptionId`,`createdAt`);