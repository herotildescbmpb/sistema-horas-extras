CREATE TABLE `bravo_export_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exportedBy` int NOT NULL,
	`exportedByName` varchar(255),
	`totalRegistros` int NOT NULL DEFAULT 0,
	`startDate` varchar(10),
	`endDate` varchar(10),
	`department` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bravo_export_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `overtime_records` ADD `exportedAt` timestamp;--> statement-breakpoint
ALTER TABLE `overtime_records` ADD `exportBatchId` int;