/**
 * LLM Council Module Types
 * Types for the 3-stage AI consultation process
 */

/**
 * Council Stage Types
 */
export const CouncilStage = {
	STAGE_1: 'stage_1', // Initial responses from multiple LLMs
	STAGE_2: 'stage_2', // Peer review/rankings
	STAGE_3: 'stage_3', // Synthesis
	COMPLETE: 'complete'
} as const;

export type CouncilStage = (typeof CouncilStage)[keyof typeof CouncilStage];

/**
 * Message Role Types
 */
export const MessageRole = {
	USER: 'user',
	ASSISTANT: 'assistant',
	SYSTEM: 'system'
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

/**
 * Conversation Model
 */
export interface Conversation {
	id: string;
	userId: string;
	title: string;
	currentStage: CouncilStage;
	selectedModels: string[]; // Model IDs for stage 1
	synthesizerModel: string; // Model ID for stage 3
	createdAt: number; // Unix timestamp
	updatedAt: number; // Unix timestamp
}

export type CreateConversationInput = Omit<
	Conversation,
	'id' | 'userId' | 'createdAt' | 'updatedAt'
>;
export type UpdateConversationInput = Partial<
	Omit<Conversation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

/**
 * Message Ranking Structure
 */
export interface ModelRanking {
	modelId: string;
	rank: number;
	score?: number;
	reasoning?: string;
}

/**
 * Message Model
 */
export interface Message {
	id: string;
	conversationId: string;
	userId: string;
	role: MessageRole;
	content: string;
	modelId?: string; // Which model generated this
	stage: CouncilStage;
	rankings?: ModelRanking[]; // JSON for stage 2 rankings
	metadata?: Record<string, unknown>; // Additional metadata
	createdAt: number; // Unix timestamp
}

export type CreateMessageInput = Omit<Message, 'id' | 'createdAt'>;

/**
 * Settings Model
 */
export interface CouncilSettings {
	userId: string;
	openrouterApiKey?: string;
	defaultModels: string[]; // Default models for stage 1
	defaultSynthesizer: string; // Default synthesizer model
	customStage1Prompt?: string;
	customStage2Prompt?: string;
	customStage3Prompt?: string;
	streamingEnabled: boolean;
	createdAt: number;
	updatedAt: number;
}

export type UpdateSettingsInput = Partial<
	Omit<CouncilSettings, 'userId' | 'createdAt' | 'updatedAt'>
>;

/**
 * SSE Event Types for Streaming
 */
export const SSEEventType = {
	STAGE_START: 'stage_start',
	TEXT_DELTA: 'text_delta',
	MODEL_RESPONSE_COMPLETE: 'model_response_complete',
	RANKING_COMPLETE: 'ranking_complete',
	SYNTHESIS_DELTA: 'synthesis_delta',
	ERROR: 'error',
	DONE: 'done',
	META: 'meta'
} as const;

export type SSEEventType = (typeof SSEEventType)[keyof typeof SSEEventType];

/**
 * SSE Event Structures
 */
export interface SSEEvent {
	type: SSEEventType;
	[key: string]: unknown;
}

export interface StageStartEvent extends SSEEvent {
	type: typeof SSEEventType.STAGE_START;
	stage: CouncilStage;
	models?: string[];
}

export interface TextDeltaEvent extends SSEEvent {
	type: typeof SSEEventType.TEXT_DELTA;
	modelId: string;
	delta: string;
	stage: CouncilStage;
}

export interface ModelResponseCompleteEvent extends SSEEvent {
	type: typeof SSEEventType.MODEL_RESPONSE_COMPLETE;
	modelId: string;
	fullContent: string;
	stage: CouncilStage;
}

export interface RankingCompleteEvent extends SSEEvent {
	type: typeof SSEEventType.RANKING_COMPLETE;
	modelId: string; // The model that did the ranking
	rankings: ModelRanking[];
}

export interface SynthesisDeltaEvent extends SSEEvent {
	type: typeof SSEEventType.SYNTHESIS_DELTA;
	delta: string;
}

export interface ErrorEvent extends SSEEvent {
	type: typeof SSEEventType.ERROR;
	message: string;
	details?: unknown;
}

export interface MetaEvent extends SSEEvent {
	type: typeof SSEEventType.META;
	conversationId: string;
}

/**
 * OpenRouter Model Info
 */
export interface OpenRouterModel {
	id: string;
	name: string;
	description?: string;
	context_length: number;
	pricing?: {
		prompt: string;
		completion: string;
	};
}

/**
 * Council Request Types
 */
export interface StartCouncilRequest {
	query: string;
	models?: string[]; // Override defaults
	synthesizerModel?: string; // Override default
	conversationId?: string; // Continue existing conversation
}

/**
 * Available Models Response
 */
export interface AvailableModelsResponse {
	models: OpenRouterModel[];
	defaultModels: string[];
	defaultSynthesizer: string;
}
