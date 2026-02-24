import { writable, derived } from 'svelte/store';
import type {
	Conversation,
	Message,
	CouncilSettings,
	SSEEvent,
	ModelRanking,
	CouncilStage,
	PersonaWithProvider,
	PersonaConversationStage
} from '../models';
import { SSEEventType, CouncilStage as CS } from '../models';

// Union type for both old and new stage systems
type AnyStage = CouncilStage | PersonaConversationStage;

/**
 * Council API Client
 */
const API_BASE = '/api/MoLOS-LLM-Council';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		headers: { 'Content-Type': 'application/json' },
		...options
	});
	if (!res.ok) {
		const error = await res.text();
		throw new Error(error || res.statusText);
	}
	return res.json();
}

// Data Stores
export const conversationsStore = writable<Conversation[]>([]);
export const currentConversationStore = writable<Conversation | null>(null);
export const messagesStore = writable<Message[]>([]);
export const settingsStore = writable<CouncilSettings | null>(null);

// Stage-specific stores
export const stage1ResponsesStore = writable<Map<string, string>>(new Map());
export const stage2RankingsStore = writable<Array<{ reviewerModelId: string; rankings: ModelRanking[] }>>([]);
export const stage3SynthesisStore = writable<string>('');

// UI State
export const councilUIState = writable({
	loading: false,
	error: null as string | null,
	isStreaming: false,
	currentStage: 'stage_1' as AnyStage,
	lastLoaded: null as number | null
});

// Derived: Check if council is complete
export const isCouncilComplete = derived(
	councilUIState,
	($state) => $state.currentStage === CS.COMPLETE
);

// Derived: Get stage 1 responses as array
export const stage1ResponsesArray = derived(stage1ResponsesStore, ($map) => {
	return Array.from($map.entries()).map(([modelId, content]) => ({
		modelId,
		content
	}));
});

/**
 * Load personas
 */
export async function loadPersonas(): Promise<PersonaWithProvider[]> {
	const data = await apiFetch<{ personas: PersonaWithProvider[] }>('/personas');
	return data.personas;
}

/**
 * Load conversations
 */
export async function loadConversations() {
	councilUIState.update((s) => ({ ...s, loading: true, error: null }));

	try {
		const data = await apiFetch<{ conversations: Conversation[] }>('');
		conversationsStore.set(data.conversations);
		councilUIState.update((s) => ({ ...s, loading: false, lastLoaded: Date.now() }));
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to load conversations';
		councilUIState.update((s) => ({ ...s, loading: false, error: message }));
		throw err;
	}
}

/**
 * Load a specific conversation with messages
 */
export async function loadConversation(conversationId: string) {
	councilUIState.update((s) => ({ ...s, loading: true, error: null }));

	try {
		const data = await apiFetch<{ conversation: Conversation; messages: Message[] }>(
			`?conversationId=${conversationId}`
		);

		currentConversationStore.set(data.conversation);
		messagesStore.set(data.messages);

		// Rebuild stage stores from messages
		const stage1 = new Map<string, string>();
		const stage2: Array<{ reviewerModelId: string; rankings: ModelRanking[] }> = [];
		let stage3 = '';

		for (const msg of data.messages) {
			if (msg.stage === CS.STAGE_1 && msg.modelId) {
				stage1.set(msg.modelId, msg.content);
			} else if (msg.stage === CS.STAGE_2 && msg.modelId && msg.rankings) {
				stage2.push({ reviewerModelId: msg.modelId, rankings: msg.rankings });
			} else if (msg.stage === CS.STAGE_3) {
				stage3 = msg.content;
			}
		}

		stage1ResponsesStore.set(stage1);
		stage2RankingsStore.set(stage2);
		stage3SynthesisStore.set(stage3);

		councilUIState.update((s) => ({
			...s,
			loading: false,
			currentStage: data.conversation.currentStage
		}));

		return data;
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to load conversation';
		councilUIState.update((s) => ({ ...s, loading: false, error: message }));
		throw err;
	}
}

/**
 * Start a council session with streaming
 */
export async function startCouncil(
	query: string,
	personaIds?: string[],
	presidentPersonaId?: string
) {
	// Reset stage stores
	stage1ResponsesStore.set(new Map());
	stage2RankingsStore.set([]);
	stage3SynthesisStore.set('');

	councilUIState.update((s) => ({
		...s,
		isStreaming: true,
		error: null,
		currentStage: 'initial_responses' as PersonaConversationStage
	}));

	try {
		const response = await fetch(`${API_BASE}/stream`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query, personaIds, presidentPersonaId })
		});

		if (!response.ok) {
			throw new Error(`Failed to start council: ${response.statusText}`);
		}

		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('No response body');
		}

		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed === 'data: [DONE]') continue;

				if (trimmed.startsWith('data: ')) {
					try {
						const event = JSON.parse(trimmed.slice(6)) as SSEEvent;
						handleSSEEvent(event);
					} catch (e) {
						console.error('Failed to parse SSE event:', e);
					}
				}
			}
		}

		councilUIState.update((s) => ({ ...s, isStreaming: false }));
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to start council';
		councilUIState.update((s) => ({ ...s, isStreaming: false, error: message }));
		throw err;
	}
}

/**
 * Handle SSE events
 */
export function handleSSEEvent(event: SSEEvent) {
	switch (event.type) {
		case SSEEventType.META:
			// Update current conversation ID
			if ('conversationId' in event) {
				// Conversation was created, could refresh list
			}
			break;

		case SSEEventType.STAGE_START:
			if ('stage' in event) {
				councilUIState.update((s) => ({ ...s, currentStage: event.stage as CouncilStage }));
			}
			break;

		case SSEEventType.TEXT_DELTA:
			if ('modelId' in event && 'delta' in event && 'stage' in event) {
				if (event.stage === CS.STAGE_1) {
					stage1ResponsesStore.update((map) => {
						const existing = map.get(event.modelId as string) || '';
						map.set(event.modelId as string, existing + (event.delta as string));
						return new Map(map);
					});
				} else if (event.stage === CS.STAGE_3) {
					stage3SynthesisStore.update((content) => content + (event.delta as string));
				}
			}
			break;

		case SSEEventType.RANKING_COMPLETE:
			if ('modelId' in event && 'rankings' in event) {
				stage2RankingsStore.update((rankings) => [
					...rankings,
					{
						reviewerModelId: event.modelId as string,
						rankings: event.rankings as ModelRanking[]
					}
				]);
			}
			break;

		case SSEEventType.SYNTHESIS_DELTA:
			if ('delta' in event) {
				stage3SynthesisStore.update((content) => content + (event.delta as string));
			}
			break;

		case SSEEventType.ERROR:
			if ('message' in event) {
				councilUIState.update((s) => ({ ...s, error: event.message as string }));
			}
			break;

		case SSEEventType.DONE:
			councilUIState.update((s) => ({ ...s, currentStage: CS.COMPLETE }));
			break;
	}
}

/**
 * Load settings
 */
export async function loadSettings() {
	try {
		const settings = await apiFetch<CouncilSettings>('/settings');
		settingsStore.set(settings);
		return settings;
	} catch (err) {
		console.error('Failed to load settings:', err);
		throw err;
	}
}

/**
 * Update settings
 */
export async function updateSettings(data: {
	streamingEnabled?: boolean;
	customStage1Prompt?: string;
	customStage2Prompt?: string;
	customStage3Prompt?: string;
}) {
	const settings = await apiFetch<CouncilSettings>('/settings', {
		method: 'PUT',
		body: JSON.stringify(data)
	});
	settingsStore.set(settings);
	return settings;
}

/**
 * Validate and save API key
 */
export async function validateApiKey(apiKey: string) {
	const result = await apiFetch<{ success: boolean; models: any[] }>('/settings', {
		method: 'POST',
		body: JSON.stringify({ apiKey })
	});
	return result;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string) {
	await apiFetch<{ success: true }>('', {
		method: 'DELETE',
		body: JSON.stringify({ id })
	});

	conversationsStore.update((convs) => convs.filter((c) => c.id !== id));

	currentConversationStore.update((current) => {
		if (current?.id === id) return null;
		return current;
	});
}
