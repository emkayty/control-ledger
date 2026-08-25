ALTER TABLE `organisations` ADD `receiptExtractionEnabled` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `organisations` ADD `receiptExtractionPolicyAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `organisations` ADD `receiptExtractionPolicyAcceptedByUserId` int;