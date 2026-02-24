-- Add isSystem column to personas table
ALTER TABLE `MoLOS-LLM-Council_personas` ADD COLUMN `is_system` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- Create council_settings table if it doesn't exist
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
