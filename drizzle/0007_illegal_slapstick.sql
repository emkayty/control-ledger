CREATE TABLE `collectionFollowUps` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`customerId` varchar(36) NOT NULL,
	`obligationId` varchar(36) NOT NULL,
	`status` enum('open','contacted','promised','disputed','closed') NOT NULL DEFAULT 'open',
	`reason` enum('partial_payment','pending_bank','customer_dispute','reconciliation_required','other') NOT NULL,
	`note` text NOT NULL,
	`nextActionAt` timestamp,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `collectionFollowUps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerOrderLines` (
	`id` varchar(36) NOT NULL,
	`orderId` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`productId` varchar(36) NOT NULL,
	`quantity` decimal(20,3) NOT NULL,
	`unitPriceMinor` decimal(20,0) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customerOrderLines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerOrders` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`customerId` varchar(36) NOT NULL,
	`orderNumber` varchar(96) NOT NULL,
	`status` enum('draft','confirmed','delivered','invoiced','cancelled') NOT NULL DEFAULT 'draft',
	`orderedAt` timestamp NOT NULL DEFAULT (now()),
	`expectedDeliveryAt` timestamp,
	`note` varchar(500),
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `customerOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_order_org_number_unique` UNIQUE(`organisationId`,`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`orderId` varchar(36) NOT NULL,
	`deliveryNumber` varchar(96) NOT NULL,
	`status` enum('recorded','confirmed','cancelled') NOT NULL DEFAULT 'recorded',
	`deliveredAt` timestamp NOT NULL,
	`recipientName` varchar(180),
	`note` varchar(500),
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_org_number_unique` UNIQUE(`organisationId`,`deliveryNumber`)
);
--> statement-breakpoint
CREATE TABLE `deliveryLines` (
	`id` varchar(36) NOT NULL,
	`deliveryId` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`productId` varchar(36) NOT NULL,
	`stockLotId` varchar(36),
	`quantity` decimal(20,3) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliveryLines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidenceRetentionReviews` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`evidenceFileId` varchar(36) NOT NULL,
	`reviewStatus` enum('retained','review_due','legal_hold') NOT NULL,
	`retentionUntil` timestamp,
	`note` text NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `evidenceRetentionReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidenceStorageRemediations` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`evidenceFileId` varchar(36) NOT NULL,
	`status` enum('identified','provider_requested','provider_confirmed') NOT NULL DEFAULT 'identified',
	`providerReference` varchar(255),
	`note` text NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `evidenceStorageRemediations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`customerId` varchar(36) NOT NULL,
	`orderId` varchar(36) NOT NULL,
	`deliveryId` varchar(36),
	`obligationId` varchar(36) NOT NULL,
	`invoiceNumber` varchar(96) NOT NULL,
	`status` enum('issued','cancelled') NOT NULL DEFAULT 'issued',
	`amountMinor` decimal(20,0) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoice_org_number_unique` UNIQUE(`organisationId`,`invoiceNumber`),
	CONSTRAINT `invoice_obligation_unique` UNIQUE(`obligationId`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`sku` varchar(96) NOT NULL,
	`name` varchar(180) NOT NULL,
	`unitOfMeasure` varchar(32) NOT NULL DEFAULT 'unit',
	`reorderPointQuantity` decimal(20,3) NOT NULL DEFAULT '0',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_org_sku_unique` UNIQUE(`organisationId`,`sku`)
);
--> statement-breakpoint
CREATE TABLE `stockLots` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`productId` varchar(36) NOT NULL,
	`batchCode` varchar(96) NOT NULL,
	`expiryAt` timestamp,
	`status` enum('active','quarantined','exhausted','expired') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `stockLots_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_lot_scope_batch_unique` UNIQUE(`organisationId`,`branchId`,`productId`,`batchCode`)
);
--> statement-breakpoint
CREATE TABLE `stockMovements` (
	`id` varchar(36) NOT NULL,
	`organisationId` varchar(36) NOT NULL,
	`branchId` varchar(36) NOT NULL,
	`productId` varchar(36) NOT NULL,
	`stockLotId` varchar(36),
	`movementType` enum('opening','receipt','delivery','transfer_out','transfer_in','adjustment') NOT NULL,
	`quantityDelta` decimal(20,3) NOT NULL,
	`deliveryId` varchar(36),
	`transferReference` varchar(96),
	`reason` varchar(500),
	`occurredAt` timestamp NOT NULL,
	`correlationId` varchar(72) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int NOT NULL,
	CONSTRAINT `stockMovements_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_movement_delivery_product_unique` UNIQUE(`deliveryId`,`productId`)
);
--> statement-breakpoint
CREATE INDEX `collection_followup_scope_status_index` ON `collectionFollowUps` (`organisationId`,`branchId`,`status`,`nextActionAt`);--> statement-breakpoint
CREATE INDEX `collection_followup_obligation_index` ON `collectionFollowUps` (`obligationId`);--> statement-breakpoint
CREATE INDEX `customer_order_line_order_index` ON `customerOrderLines` (`orderId`);--> statement-breakpoint
CREATE INDEX `customer_order_line_product_index` ON `customerOrderLines` (`productId`);--> statement-breakpoint
CREATE INDEX `customer_order_scope_status_index` ON `customerOrders` (`organisationId`,`branchId`,`status`,`orderedAt`);--> statement-breakpoint
CREATE INDEX `customer_order_customer_index` ON `customerOrders` (`customerId`);--> statement-breakpoint
CREATE INDEX `delivery_scope_status_index` ON `deliveries` (`organisationId`,`branchId`,`status`,`deliveredAt`);--> statement-breakpoint
CREATE INDEX `delivery_order_index` ON `deliveries` (`orderId`);--> statement-breakpoint
CREATE INDEX `delivery_line_delivery_index` ON `deliveryLines` (`deliveryId`);--> statement-breakpoint
CREATE INDEX `delivery_line_product_index` ON `deliveryLines` (`productId`);--> statement-breakpoint
CREATE INDEX `evidence_retention_scope_index` ON `evidenceRetentionReviews` (`organisationId`,`branchId`,`evidenceFileId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `evidence_storage_remediation_file_index` ON `evidenceStorageRemediations` (`organisationId`,`branchId`,`evidenceFileId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `invoice_scope_status_index` ON `invoices` (`organisationId`,`branchId`,`status`,`issuedAt`);--> statement-breakpoint
CREATE INDEX `invoice_customer_index` ON `invoices` (`customerId`);--> statement-breakpoint
CREATE INDEX `product_scope_active_index` ON `products` (`organisationId`,`branchId`,`isActive`);--> statement-breakpoint
CREATE INDEX `stock_lot_scope_expiry_index` ON `stockLots` (`organisationId`,`branchId`,`productId`,`expiryAt`);--> statement-breakpoint
CREATE INDEX `stock_movement_product_scope_time_index` ON `stockMovements` (`organisationId`,`branchId`,`productId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `stock_movement_lot_index` ON `stockMovements` (`stockLotId`);