CREATE TABLE `MoLOS_LLM_Council_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`current_stage` text CHECK(current_stage IN ('stage_1', 'stage_2', 'stage_3', 'complete')) DEFAULT 'stage_1' NOT NULL,
	`selected_models` text DEFAULT '[]' NOT NULL,
	`synthesizer_model` text,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `MoLOS_LLM_Council_messages` (
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
	FOREIGN KEY (`conversation_id`) REFERENCES `MoLOS_LLM_Council_conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `MoLOS_LLM_Council_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`openrouter_api_key` text,
	`default_models` text DEFAULT '["anthropic/claude-3.5-sonnet","openai/gpt-4o","google/gemini-2.0-flash-001"]' NOT NULL,
	`default_synthesizer` text DEFAULT 'anthropic/claude-3.5-sonnet' NOT NULL,
	`custom_stage1_prompt` text,
	`custom_stage2_prompt` text,
	`custom_stage3_prompt` text,
	`streaming_enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now')) NOT NULL
);
