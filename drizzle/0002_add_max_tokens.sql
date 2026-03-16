-- Migration: add_max_tokens
-- Module: MoLOS-LLM-Council
-- Created: 2026-03-16
-- Description: Add configurable max_tokens per stage for better performance control

-- Add max_tokens columns to settings table
ALTER TABLE `MoLOS-LLM-Council_settings` ADD COLUMN `max_tokens_stage1` integer DEFAULT 1024 NOT NULL;

--> statement-breakpoint

ALTER TABLE `MoLOS-LLM-Council_settings` ADD COLUMN `max_tokens_stage2` integer DEFAULT 512 NOT NULL;

--> statement-breakpoint

ALTER TABLE `MoLOS-LLM-Council_settings` ADD COLUMN `max_tokens_stage3` integer DEFAULT 4096 NOT NULL;
