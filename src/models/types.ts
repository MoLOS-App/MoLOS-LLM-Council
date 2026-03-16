/**
 * LLM Council Module Types
 * Types for the 3-stage AI consultation process
 */

/**
 * Council Stage Types
 */
export const CouncilStage = {
  STAGE_1: "stage_1", // Initial responses from multiple LLMs
  STAGE_2: "stage_2", // Peer review/rankings
  STAGE_3: "stage_3", // Synthesis
  COMPLETE: "complete",
} as const;

export type CouncilStage = (typeof CouncilStage)[keyof typeof CouncilStage];

/**
 * Message Role Types
 */
export const MessageRole = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

/**
 * Conversation Model (Legacy - use CouncilConversation instead)
 * @deprecated Use CouncilConversation instead - persona-based architecture
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
  "id" | "userId" | "createdAt" | "updatedAt"
>;
export type UpdateConversationInput = Partial<
  Omit<Conversation, "id" | "userId" | "createdAt" | "updatedAt">
>;

/**
 * Message Ranking Structure (Legacy - use MessageRanking instead)
 * @deprecated Use MessageRanking instead - persona-based architecture
 */
export interface ModelRanking {
  modelId: string;
  rank: number;
  score?: number;
  reasoning?: string;
}

/**
 * Message Model (Legacy - use CouncilMessage instead)
 * @deprecated Use CouncilMessage instead - persona-based architecture
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

export type CreateMessageInput = Omit<Message, "id" | "createdAt">;

/**
 * Settings Model
 */
export interface CouncilSettings {
  userId: string;
  openrouterApiKey?: string;
  defaultModels: string[];
  defaultSynthesizer: string;
  customStage1Prompt?: string;
  customStage2Prompt?: string;
  customStage3Prompt?: string;
  // Max tokens for each stage (configurable for performance)
  maxTokensStage1?: number; // Default: 1024
  maxTokensStage2?: number; // Default: 512
  maxTokensStage3?: number; // Default: 4096
  streamingEnabled?: boolean;
  hasApiKey?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type UpdateSettingsInput = Partial<
  Omit<CouncilSettings, "userId" | "createdAt" | "updatedAt">
> & {
  maxTokensStage1?: number;
  maxTokensStage2?: number;
  maxTokensStage3?: number;
};

/**
 * SSE Event Types for Streaming
 */
export const SSEEventType = {
  STAGE_START: "stage_start",
  TEXT_DELTA: "text_delta",
  MODEL_RESPONSE_COMPLETE: "model_response_complete",
  RANKING_COMPLETE: "ranking_complete",
  SYNTHESIS_DELTA: "synthesis_delta",
  ERROR: "error",
  DONE: "done",
  META: "meta",
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

/**
 * ============================================
 * PROVIDER TYPES
 * ============================================
 */

export const ProviderType = {
  OPENROUTER: "openrouter",
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  ZAI: "zai",
  ZAI_CODING: "zai_coding",
  CUSTOM: "custom",
} as const;

export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType];

/**
 * AI Provider Configuration
 */
export interface AIProvider {
  id: string;
  userId: string;
  type: ProviderType;
  name: string;
  apiUrl: string;
  apiToken: string;
  model: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * ============================================
 * PERSONA TYPES
 * ============================================
 */

/**
 * Council Persona
 */
export interface CouncilPersona {
  id: string;
  userId: string;
  name: string;
  description?: string;
  avatar: string;
  personalityPrompt: string;
  providerId: string;
  isPresident: boolean;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Persona with Provider (join result)
 */
export interface PersonaWithProvider extends CouncilPersona {
  provider: Pick<
    AIProvider,
    "id" | "name" | "type" | "apiUrl" | "model" | "apiToken"
  >;
}

/**
 * Default System Personas
 */
export const DEFAULT_SYSTEM_PERSONAS = {
  CHAIRMAN: {
    name: "MoLOS Default Chairman",
    description:
      "The official MoLOS council chairman - provides structure and synthesis",
    avatar: "👑",
    personalityPrompt:
      "You are Chairman of the MoLOS AI Council. Your role is to:\n\n1. Synthesize diverse perspectives into coherent insights\n2. Identify areas of consensus and disagreement\n3. Provide balanced, well-reasoned conclusions\n4. Maintain professional and respectful discourse\n5. Prioritize clarity, accuracy, and practical utility\n\nRespond with wisdom, authority, and fairness.",
    isPresident: true,
    isSystem: true,
    isDefault: true,
  },
  MEMBER: {
    name: "MoLOS Default Member",
    description:
      "A standard MoLOS council member - provides thoughtful analysis",
    avatar: "🎭",
    personalityPrompt:
      "You are a member of the MoLOS AI Council. Your role is to:\n\n1. Provide thoughtful, well-reasoned perspectives\n2. Consider multiple viewpoints and edge cases\n3. Support your arguments with logic and evidence\n4. Be constructive and collaborative\n5. Challenge assumptions respectfully\n\nRespond with clarity, insight, and intellectual honesty.",
    isPresident: false,
    isSystem: true,
    isDefault: true,
  },
} as const;

/**
 * ============================================
 * NEW PERSONA-BASED SYSTEM TYPES
 * ============================================
 */

export const PersonaConversationStage = {
  INITIAL_RESPONSES: "initial_responses",
  PEER_REVIEW: "peer_review",
  SYNTHESIS: "synthesis",
  COMPLETED: "completed",
} as const;

export type PersonaConversationStage =
  (typeof PersonaConversationStage)[keyof typeof PersonaConversationStage];

/**
 * Council Conversation (Persona-based architecture)
 * Represents a multi-persona AI consultation session
 */
export interface CouncilConversation {
  id: string;
  userId: string;
  query: string;
  stage: PersonaConversationStage;
  selectedPersonaIds: string[];
  presidentPersonaId: string | null;
  messages: CouncilMessage[];
  decisionSummary: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Council Message (Persona-based architecture)
 * Individual messages within a council conversation
 */
export interface CouncilMessage {
  id: string;
  userId: string;
  conversationId: string;
  personaId: string | null;
  stage: PersonaConversationStage;
  role: "user" | "assistant";
  content: string;
  rankings: MessageRanking[] | null;
  createdAt: number;
}

/**
 * Message Ranking (Persona-based architecture)
 * Rankings given by one persona to evaluate responses from other personas
 */
export interface MessageRanking {
  personaId: string;
  rank: number;
  reason: string;
}

/**
 * AI Tool Definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (params: any) => Promise<any>;
  metadata?: {
    submodule: string;
    category?: string;
    tags?: string[];
    priority?: number;
    essential?: boolean;
  };
}
