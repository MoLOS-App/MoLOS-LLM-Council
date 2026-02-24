import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { ProviderType, PersonaConversationStage } from '../../models';

export const councilProviders = sqliteTable('MoLOS-LLM-Council_providers', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id').notNull(),
	type: text('type').notNull(),
	name: text('name').notNull(),
	apiUrl: text('api_url').notNull(),
	apiToken: text('api_token').notNull(),
	model: text('model').notNull(),
	isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`),
	updatedAt: integer('updated_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`)
});

export const councilPersonas = sqliteTable('MoLOS-LLM-Council_personas', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id').notNull(),
	name: text('name').notNull(),
	description: text('description'),
	avatar: text('avatar').notNull(),
	personalityPrompt: text('personality_prompt').notNull(),
	providerId: text('provider_id').references(() => councilProviders.id, { onDelete: 'cascade' }),
	isPresident: integer('is_president', { mode: 'boolean' }).notNull().default(false),
	isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
	isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`),
	updatedAt: integer('updated_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`)
});

export const councilConversations = sqliteTable('MoLOS-LLM-Council_conversations', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id').notNull(),
	query: text('query').notNull(),
	stage: text('stage').notNull().default(PersonaConversationStage.INITIAL_RESPONSES),
	selectedPersonaIds: text('selected_persona_ids').notNull().default('[]'),
	presidentPersonaId: text('president_persona_id').references(() => councilPersonas.id, { onDelete: 'set null' }),
	decisionSummary: text('decision_summary'),
	tags: text('tags').notNull().default('[]'),
	createdAt: integer('created_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`),
	updatedAt: integer('updated_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`)
});

export const councilMessages = sqliteTable('MoLOS-LLM-Council_messages', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	conversationId: text('conversation_id').references(() => councilConversations.id, { onDelete: 'cascade' }),
	personaId: text('persona_id').references(() => councilPersonas.id, { onDelete: 'set null' }),
	stage: text('stage').notNull(),
	role: text('role', { enum: ['user', 'assistant'] }).notNull(),
	content: text('content').notNull(),
	rankings: text('rankings'),
	createdAt: integer('created_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`)
});

export const councilSettings = sqliteTable('MoLOS-LLM-Council_settings', {
	userId: text('user_id').primaryKey(),
	openrouterApiKey: text('openrouter_api_key'),
	defaultModels: text('default_models').notNull().default('[]'),
	defaultSynthesizer: text('default_synthesizer').notNull(),
	customStage1Prompt: text('custom_stage1_prompt'),
	customStage2Prompt: text('custom_stage2_prompt'),
	customStage3Prompt: text('custom_stage3_prompt'),
	streamingEnabled: integer('streaming_enabled', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`),
	updatedAt: integer('updated_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`)
});
