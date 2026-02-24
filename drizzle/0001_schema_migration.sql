-- MoLOS-LLM-Council Complete Schema Migration
-- This migration creates a clean schema for the persona-based system
-- All old model-based columns and constraints are removed

-- Create council providers table
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`api_url` text NOT NULL,
	`api_token` text NOT NULL,
	`model` text NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint

-- Create council personas table
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_personas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`avatar` text NOT NULL,
	`personality_prompt` text NOT NULL,
	`provider_id` text,
	`is_president` integer DEFAULT 0 NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`is_system` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `MoLOS-LLM-Council_providers`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- Create council conversations table
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`query` text NOT NULL,
	`stage` text DEFAULT 'initial_responses' NOT NULL,
	`selected_persona_ids` text DEFAULT '[]' NOT NULL,
	`president_persona_id` text,
	`decision_summary` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`president_persona_id`) REFERENCES `MoLOS-LLM-Council_personas`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint

-- Create council messages table
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`persona_id` text,
	`stage` text DEFAULT 'initial_responses' NOT NULL,
	`role` text CHECK(role IN ('user', 'assistant')) DEFAULT 'user' NOT NULL,
	`content` text NOT NULL,
	`rankings` text,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `MoLOS-LLM-Council_conversations`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`persona_id`) REFERENCES `MoLOS-LLM-Council_personas`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint

-- Create council settings table
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`openrouter_api_key` text,
	`default_models` text DEFAULT '[]' NOT NULL,
	`default_synthesizer` text NOT NULL,
	`custom_stage1_prompt` text,
	`custom_stage2_prompt` text,
	`custom_stage3_prompt` text,
	`streaming_enabled` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint

-- Create indexes for providers
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_providers_user_id` ON `MoLOS-LLM-Council_providers` (`user_id`);
--> statement-breakpoint

-- Create indexes for personas
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_personas_user_id` ON `MoLOS-LLM-Council_personas` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_personas_provider_id` ON `MoLOS-LLM-Council_personas` (`provider_id`);
--> statement-breakpoint

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_conversations_user_id` ON `MoLOS-LLM-Council_conversations` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_conversations_stage` ON `MoLOS-LLM-Council_conversations` (`stage`);
--> statement-breakpoint

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_messages_conversation_id` ON `MoLOS-LLM-Council_messages` (`conversation_id`);
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_messages_stage` ON `MoLOS-LLM-Council_messages` (`stage`);
CREATE INDEX IF NOT EXISTS `idx_MoLOS-LLM-Council_messages_user_id` ON `MoLOS-LLM-Council_messages` (`user_id`);
--> statement-breakpoint

-- Add CHECK constraints for stages (manual approach since Drizzle doesn't support enum checks well in SQLite)
-- We'll use application-level validation for persona stages:
-- - 'initial_responses'
-- - 'peer_review'
-- - 'synthesis'
-- - 'completed'
