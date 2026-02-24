-- Create council providers table
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_providers` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `user_id` TEXT NOT NULL,
  `type` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `api_url` TEXT NOT NULL,
  `api_token` TEXT NOT NULL,
  `model` TEXT NOT NULL,
  `is_default` INTEGER DEFAULT 0 NOT NULL,
  `created_at` INTEGER DEFAULT (strftime('%s','now')) NOT NULL,
  `updated_at` INTEGER DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint

-- Create council personas table
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_personas` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `user_id` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `avatar` TEXT NOT NULL,
  `personality_prompt` TEXT NOT NULL,
  `provider_id` TEXT,
  `is_president` INTEGER DEFAULT 0 NOT NULL,
  `is_default` INTEGER DEFAULT 0 NOT NULL,
  `is_system` INTEGER DEFAULT 0 NOT NULL,
  `created_at` INTEGER DEFAULT (strftime('%s','now')) NOT NULL,
  `updated_at` INTEGER DEFAULT (strftime('%s','now')) NOT NULL,
  FOREIGN KEY (`provider_id`) REFERENCES `MoLOS-LLM-Council_providers`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- Create council settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS `MoLOS-LLM-Council_settings` (
  `user_id` TEXT PRIMARY KEY NOT NULL,
  `openrouter_api_key` TEXT,
  `default_models` TEXT DEFAULT '[]' NOT NULL,
  `default_synthesizer` TEXT DEFAULT 'anthropic/claude-3.5-sonnet' NOT NULL,
  `custom_stage1_prompt` TEXT,
  `custom_stage2_prompt` TEXT,
  `custom_stage3_prompt` TEXT,
  `streaming_enabled` INTEGER DEFAULT 1 NOT NULL,
  `created_at` INTEGER DEFAULT (strftime('%s','now')) NOT NULL,
  `updated_at` INTEGER DEFAULT (strftime('%s','now')) NOT NULL
);
