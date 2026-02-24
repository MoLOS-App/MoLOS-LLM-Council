-- Drop old MoLOS-LLM-Council tables
-- This allows the new schema to be created cleanly

DROP TABLE IF EXISTS `MoLOS-LLM-Council_messages`;
DROP TABLE IF EXISTS `MoLOS-LLM-Council_conversations`;
DROP TABLE IF EXISTS `MoLOS-LLM-Council_personas`;
DROP TABLE IF EXISTS `MoLOS-LLM-Council_providers`;
DROP TABLE IF EXISTS `MoLOS-LLM-Council_settings`;
DROP TABLE IF EXISTS `MoLOS-LLM-Council_conversations_backup`;
DROP TABLE IF EXISTS `MoLOS-LLM-Council_messages_backup`;
