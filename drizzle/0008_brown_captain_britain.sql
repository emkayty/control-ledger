CREATE TABLE `economicEvents` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`status` enum('recorded','ready_to_post','posted','reversed') NOT NULL DEFAULT 'recorded',
	`sourceType` varchar(64) NOT NULL,
	`sourceId` varchar(36),
	`sourceReference` varchar(128),
	`causalEventId` varchar(36),
	`payloadVersion` int NOT NULL DEFAULT 1,
	`payload` json,
	`occurredAt` timestamp NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`actorUserId` int NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	CONSTRAINT `economicEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `economic_event_source_unique` UNIQUE(`organisationId`,`eventType`,`sourceType`,`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `ledgerAccounts` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`accountClass` enum('asset','liability','equity','revenue','expense') NOT NULL,
	`normalBalance` enum('debit','credit') NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `ledgerAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `ledger_account_org_code_unique` UNIQUE(`organisationId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `ledgerJournalDecisions` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`journalId` varchar(36) NOT NULL,
	`decision` enum('prepared','submitted','posted','reversed') NOT NULL,
	`rationale` text NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `ledgerJournalDecisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ledgerJournalLines` (
	`id` varchar(36) NOT NULL,
	`journalId` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`accountId` varchar(36) NOT NULL,
	`debitMinor` decimal(20,0) NOT NULL DEFAULT '0',
	`creditMinor` decimal(20,0) NOT NULL DEFAULT '0',
	`currency` varchar(3) NOT NULL,
	`memo` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ledgerJournalLines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ledgerJournals` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`economicEventId` varchar(36) NOT NULL,
	`sourceType` varchar(64) NOT NULL,
	`sourceId` varchar(36) NOT NULL,
	`sourceReference` varchar(128),
	`status` enum('draft','ready','posted','reversed') NOT NULL DEFAULT 'draft',
	`currency` varchar(3) NOT NULL,
	`memo` varchar(500) NOT NULL,
	`reversalOfJournalId` varchar(36),
	`preparedAt` timestamp NOT NULL DEFAULT (now()),
	`preparedByUserId` int NOT NULL,
	`postedAt` timestamp,
	`postedByUserId` int,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ledgerJournals_id` PRIMARY KEY(`id`),
	CONSTRAINT `ledger_journal_event_unique` UNIQUE(`economicEventId`)
);
--> statement-breakpoint
CREATE INDEX `economic_event_scope_status_time_index` ON `economicEvents` (`organisationId`,`branchId`,`status`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `economic_event_correlation_index` ON `economicEvents` (`correlationId`);--> statement-breakpoint
CREATE INDEX `ledger_account_org_active_index` ON `ledgerAccounts` (`organisationId`,`isActive`,`accountClass`);--> statement-breakpoint
CREATE INDEX `ledger_journal_decision_time_index` ON `ledgerJournalDecisions` (`organisationId`,`branchId`,`journalId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ledger_journal_line_journal_index` ON `ledgerJournalLines` (`journalId`);--> statement-breakpoint
CREATE INDEX `ledger_journal_line_account_index` ON `ledgerJournalLines` (`organisationId`,`branchId`,`accountId`);--> statement-breakpoint
CREATE INDEX `ledger_journal_scope_status_time_index` ON `ledgerJournals` (`organisationId`,`branchId`,`status`,`preparedAt`);--> statement-breakpoint
CREATE INDEX `ledger_journal_source_index` ON `ledgerJournals` (`organisationId`,`sourceType`,`sourceId`);