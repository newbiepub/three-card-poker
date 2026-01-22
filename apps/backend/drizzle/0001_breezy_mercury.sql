CREATE TABLE `session_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`player_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`game_score` integer NOT NULL,
	`points_change` integer NOT NULL,
	`cumulative_score` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`host_id` text NOT NULL,
	`total_rounds` integer NOT NULL,
	`current_round` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`host_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`max_players` integer DEFAULT 6 NOT NULL,
	`room_code` text NOT NULL,
	`host_id` text NOT NULL,
	`current_session_id` text,
	`created_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_rooms`("id", "name", "status", "max_players", "room_code", "host_id", "current_session_id", "created_at", "finished_at") SELECT "id", "name", "status", "max_players", "room_code", "host_id", "current_session_id", "created_at", "finished_at" FROM `rooms`;--> statement-breakpoint
DROP TABLE `rooms`;--> statement-breakpoint
ALTER TABLE `__new_rooms` RENAME TO `rooms`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_room_code_unique` ON `rooms` (`room_code`);