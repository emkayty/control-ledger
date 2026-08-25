CREATE TABLE `accountingPeriodDecisions` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`periodId` varchar(36) NOT NULL,
	`decision` enum('created','close_requested','close_approved','close_rejected') NOT NULL,
	`rationale` text NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `accountingPeriodDecisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accountingPeriods` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`periodName` varchar(96) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`status` enum('open','close_requested','closed') NOT NULL DEFAULT 'open',
	`closeRequestedByUserId` int,
	`closeRequestedAt` timestamp,
	`closedByUserId` int,
	`closedAt` timestamp,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `accountingPeriods_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounting_period_scope_name_unique` UNIQUE(`organisationId`,`branchId`,`periodName`)
);
--> statement-breakpoint
ALTER TABLE `ledgerJournals` ADD `periodId` varchar(36);--> statement-breakpoint
CREATE INDEX `accounting_period_decision_scope_time_index` ON `accountingPeriodDecisions` (`organisationId`,`branchId`,`periodId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `accounting_period_scope_status_dates_index` ON `accountingPeriods` (`organisationId`,`branchId`,`status`,`startsAt`,`endsAt`);--> statement-breakpoint
CREATE INDEX `ledger_journal_period_index` ON `ledgerJournals` (`organisationId`,`branchId`,`periodId`,`preparedAt`);