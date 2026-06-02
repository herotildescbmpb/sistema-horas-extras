CREATE TABLE `escala_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`escalaId` int NOT NULL,
	`matricula` varchar(16) NOT NULL,
	`nomeServidor` varchar(255) NOT NULL,
	`posto` varchar(64),
	`date` varchar(10) NOT NULL,
	`startTime` varchar(8) NOT NULL,
	`endTime` varchar(8) NOT NULL,
	`totalMinutes` int NOT NULL,
	`modalidade` varchar(32) NOT NULL,
	`dayType` enum('weekday','saturday','sunday_holiday') NOT NULL,
	`overtimeRecordId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `escala_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escalas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tipoEscala` varchar(64) NOT NULL,
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`startTime` varchar(8) NOT NULL,
	`endTime` varchar(8) NOT NULL,
	`funcao` varchar(64) NOT NULL,
	`department` varchar(128),
	`justificativa` text,
	`status` enum('rascunho','lancado','aprovado','rejeitado') NOT NULL DEFAULT 'rascunho',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `escalas_id` PRIMARY KEY(`id`)
);
