CREATE TABLE `custom_holidays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` varchar(255),
	`created_by` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_holidays_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_holidays_date_unique` UNIQUE(`date`)
);
