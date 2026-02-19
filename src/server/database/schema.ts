import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { textEnum } from '@molos/database/utils';
import { CouncilStage, MessageRole } from '../../models';

/**
 * LLM Council module table schema
 * Stores all council-related data: Conversations, Messages, and Settings
 *
 * Fields follow naming convention: MoLOS-LLM-Council_{entity_type}
 * All timestamps are stored as unix timestamps (seconds)
 */

/**
 * Conversations - Council sessions
 */
export const councilConversations = sqliteTable('MoLOS-LLM-Council_conversations', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id').notNull(),
	title: text('title').notNull(),
	currentStage: textEnum('current_stage', CouncilStage)
		.notNull()
		.default(CouncilStage.STAGE_1),
	selectedModels: text('selected_models', { mode: 'json' }).$type<string[]>().notNull().default([]),
	synthesizerModel: text('synthesizer_model'),
	createdAt: integer('created_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`),
	updatedAt: integer('updated_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`)
});

/**
 * Messages - Individual responses from models
 */
export const councilMessages = sqliteTable('MoLOS-LLM-Council_messages', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	conversationId: text('conversation_id')
		.notNull()
		.references(() => councilConversations.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull(),
	role: textEnum('role', MessageRole).notNull().default(MessageRole.USER),
	content: text('content').notNull(),
	modelId: text('model_id'),
	stage: textEnum('stage', CouncilStage).notNull().default(CouncilStage.STAGE_1),
	rankings: text('rankings', { mode: 'json' }).$type<
		Array<{ modelId: string; rank: number; score?: number; reasoning?: string }>
	>(),
	metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
	createdAt: integer('created_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`)
});

/**
 * Settings - User preferences for the LLM Council module
 */
export const councilSettings = sqliteTable('MoLOS-LLM-Council_settings', {
	userId: text('user_id').primaryKey(),
	openrouterApiKey: text('openrouter_api_key'),
	defaultModels: text('default_models', { mode: 'json' })
		.$type<string[]>()
		.notNull()
		.default([
			'anthropic/claude-3.5-sonnet',
			'openai/gpt-4o',
			'google/gemini-2.0-flash-001'
		]),
	defaultSynthesizer: text('default_synthesizer')
		.notNull()
		.default('anthropic/claude-3.5-sonnet'),
	customStage1Prompt: text('custom_stage1_prompt'),
	customStage2Prompt: text('custom_stage2_prompt'),
	customStage3Prompt: text('custom_stage3_prompt'),
	streamingEnabled: integer('streaming_enabled', { mode: 'boolean' })
		.notNull()
		.default(true),
	createdAt: integer('created_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`),
	updatedAt: integer('updated_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`)
});

// Re-export types for convenience
export { CouncilStage, MessageRole };
