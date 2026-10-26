CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`secret_hash` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `race_results` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`match_id` text NOT NULL,
	`mode` text NOT NULL,
	`time_ms` integer NOT NULL,
	`won` integer NOT NULL,
	`skin` text NOT NULL,
	`finished_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `result_profile` ON `race_results` (`profile_id`);--> statement-breakpoint
CREATE INDEX `result_mode_time` ON `race_results` (`mode`,`time_ms`);--> statement-breakpoint
CREATE INDEX `result_match` ON `race_results` (`match_id`);