ALTER TABLE `MoLOS_LLM_Council_conversations` RENAME TO `MoLOS-LLM-Council_conversations`;--> statement-breakpoint
ALTER TABLE `MoLOS_LLM_Council_messages` RENAME TO `MoLOS-LLM-Council_messages`;--> statement-breakpoint
ALTER TABLE `MoLOS_LLM_Council_settings` RENAME TO `MoLOS-LLM-Council_settings`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_MoLOS-LLM-Council_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text CHECK(role IN ('user', 'assistant', 'system')) DEFAULT 'user' NOT NULL,
	`content` text NOT NULL,
	`model_id` text,
	`stage` text CHECK(stage IN ('stage_1', 'stage_2', 'stage_3', 'complete')) DEFAULT 'stage_1' NOT NULL,
	`rankings` text,
	`metadata` text,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `MoLOS-LLM-Council_conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_MoLOS-LLM-Council_messages`("id", "conversation_id", "user_id", "role", "content", "model_id", "stage", "rankings", "metadata", "created_at") SELECT "id", "conversation_id", "user_id", "role", "content", "model_id", "stage", "rankings", "metadata", "created_at" FROM `MoLOS-LLM-Council_messages`;--> statement-breakpoint
DROP TABLE `MoLOS-LLM-Council_messages`;--> statement-breakpoint
ALTER TABLE `__new_MoLOS-LLM-Council_messages` RENAME TO `MoLOS-LLM-Council_messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;