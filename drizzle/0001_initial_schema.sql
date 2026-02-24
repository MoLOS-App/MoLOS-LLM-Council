-- Create council_providers table
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_providers` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`user_id` TEXT NOT NULL,
	`type` TEXT NOT NULL,
	`name` TEXT NOT NULL,
	`api_url` TEXT NOT NULL,
	`api_token` TEXT NOT NULL,
	`model` TEXT NOT NULL,
	`is_default` INTEGER NOT NULL DEFAULT 0,
	`created_at` INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	`updated_at` INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
--> statement-breakpoint

-- Create council_personas table
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_personas` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`user_id` TEXT NOT NULL,
	`name` TEXT NOT NULL,
	`description` TEXT,
	`avatar` TEXT NOT NULL,
	`personality_prompt` TEXT NOT NULL,
	`provider_id` TEXT NOT NULL,
	`is_president` INTEGER NOT NULL DEFAULT 0,
	`is_default` INTEGER NOT NULL DEFAULT 0,
	`created_at` INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	`updated_at` INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	FOREIGN KEY (`provider_id`) REFERENCES `council_providers` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- Create council_conversations table
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_conversations` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`user_id` TEXT NOT NULL,
	`query` TEXT NOT NULL,
	`stage` TEXT NOT NULL,
	`selected_persona_ids` TEXT NOT NULL DEFAULT ('[]'),
	`president_persona_id` TEXT,
	`decision_summary` TEXT,
	`tags` TEXT NOT NULL DEFAULT ('[]'),
	`created_at` INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	`updated_at` INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	FOREIGN KEY (`president_persona_id`) REFERENCES `council_personas` (`id`) ON DELETE SET NULL
);
--> statement-breakpoint

-- Create council_messages table
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_messages` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`conversation_id` TEXT NOT NULL,
	`persona_id` TEXT,
	`stage` TEXT NOT NULL,
	`role` TEXT NOT NULL,
	`content` TEXT NOT NULL,
	`rankings` TEXT,
	`created_at` INTEGER NOT NULL DEFAULT (strftime('%s','now')),
	FOREIGN KEY (`conversation_id`) REFERENCES `council_conversations` (`id`) ON DELETE CASCADE,
	FOREIGN KEY (`persona_id`) REFERENCES `council_personas` (`id`) ON DELETE SET NULL
);
--> statement-breakpoint

-- Create indexes
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_providers_user_id` ON `MoLOS-LLM-Council_providers` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_personas_user_id` ON `MoLOS-LLM-Council_personas` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_personas_provider_id` ON `MoLOS-LLM-Council_personas` (`provider_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_conversations_user_id` ON `MoLOS-LLM-Council_conversations` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_conversations_stage` ON `MoLOS-LLM-Council_conversations` (`stage`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_messages_conversation_id` ON `MoLOS-LLM-Council_messages` (`conversation_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_messages_stage` ON `MoLOS-LLM-Council_messages` (`stage`);
