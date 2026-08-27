CREATE TABLE `pharmacyBatchBalances` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`productId` varchar(36) NOT NULL,
	`stockLotId` varchar(36) NOT NULL,
	`availableQuantity` decimal(20,3) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pharmacyBatchBalances_id` PRIMARY KEY(`id`),
	CONSTRAINT `pharmacy_batch_balance_lot_unique` UNIQUE(`stockLotId`)
);
--> statement-breakpoint
CREATE INDEX `pharmacy_batch_balance_scope_product_index` ON `pharmacyBatchBalances` (`organisationId`,`branchId`,`productId`,`availableQuantity`);