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
	isDefault: integer('is_default', { mode: 'boolean' })
		.notNull()
		.default(sql`0`),
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
	providerId: text('provider_id').references(() => councilProviders.id, {
		onDelete: 'cascade'
	}),
	isPresident: integer('is_president', { mode: 'boolean' })
		.notNull()
		.default(sql`0`),
	isDefault: integer('is_default', { mode: 'boolean' })
		.notNull()
		.default(sql`0`),
	isSystem: integer('is_system', { mode: 'boolean' })
		.notNull()
		.default(sql`0`),
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
	title: text('title').notNull(),
	query: text('query').notNull(),
	stage: text('stage')
		.notNull()
		.$type<PersonaConversationStage>()
		.default(PersonaConversationStage.INITIAL_RESPONSES),
	selectedPersonaIds: text('selected_persona_ids').notNull().default('[]'),
	presidentPersonaId: text('president_persona_id').references(() => councilPersonas.id, {
		onDelete: 'set null'
	}),
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
	userId: text('user_id').notNull(),
	conversationId: text('conversation_id').references(() => councilConversations.id, {
		onDelete: 'cascade'
	}),
	personaId: text('persona_id').references(() => councilPersonas.id, {
		onDelete: 'set null'
	}),
	stage: text('stage')
		.notNull()
		.$type<PersonaConversationStage>()
		.default(PersonaConversationStage.INITIAL_RESPONSES),
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
	// Max tokens for each stage (configurable for performance)
	maxTokensStage1: integer('max_tokens_stage1').notNull().default(1024),
	maxTokensStage2: integer('max_tokens_stage2').notNull().default(512),
	maxTokensStage3: integer('max_tokens_stage3').notNull().default(4096),
	// Test column for  testColumn: integer("test_column").default(0),
	streamingEnabled: integer('streaming_enabled', { mode: 'boolean' })
		.notNull()
		.default(sql`1`),
	createdAt: integer('created_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`),
	updatedAt: integer('updated_at')
		.notNull()
		.default(sql`(strftime('%s','now'))`)
});
