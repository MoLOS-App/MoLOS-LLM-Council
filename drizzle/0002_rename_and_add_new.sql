-- Rename existing tables to new naming convention
ALTER TABLE `MoLOS_LLM_Council_conversations` RENAME TO `MoLOS-LLM-Council_conversations`;
--> statement-breakpoint
ALTER TABLE `MoLOS_LLM_Council_messages` RENAME TO `MoLOS-LLM-Council_messages`;
--> statement-breakpoint
ALTER TABLE `MoLOS_LLM_Council_settings` RENAME TO `MoLOS-LLM-Council_settings`;
--> statement-breakpoint

-- Update schema for renamed tables
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`api_url` text NOT NULL,
	`api_token` text NOT NULL,
	`model` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_personas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`avatar` text NOT NULL,
	`personality_prompt` text NOT NULL,
	`provider_id` text,
	`is_president` integer DEFAULT false NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `MoLOS-LLM-Council_providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Add new columns to conversations table
ALTER TABLE `MoLOS-LLM-Council_conversations` ADD COLUMN `selected_persona_ids` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `MoLOS-LLM-Council_conversations` ADD COLUMN `president_persona_id` text;
--> statement-breakpoint
ALTER TABLE `MoLOS-LLM-Council_conversations` ADD COLUMN `decision_summary` text;
--> statement-breakpoint
ALTER TABLE `MoLOS-LLM-Council_conversations` ADD COLUMN `tags` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint

-- Add new columns to messages table
ALTER TABLE `MoLOS-LLM-Council_messages` ADD COLUMN `persona_id` text;
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
