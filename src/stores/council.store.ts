import { writable, derived } from 'svelte/store';
import type {
	CouncilConversation,
	CouncilMessage,
	PersonaWithProvider,
	PersonaConversationStage,
	MessageRanking
} from '../models';
import { PersonaConversationStage as PCS } from '../models';

/**
 * Stage 2 Ranking with Persona (persona-based architecture)
 */
export interface Stage2Ranking {
	reviewerPersonaId: string;
	rankings: MessageRanking[];
}

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
export const conversationsStore = writable<CouncilConversation[]>([]);
export const currentConversationStore = writable<CouncilConversation | null>(null);
export const messagesStore = writable<CouncilMessage[]>([]);

// Stage-specific stores (persona-based)
export const stage1ResponsesStore = writable<Map<string, string>>(new Map());
export const stage2RankingsStore = writable<Stage2Ranking[]>([]);
export const stage3SynthesisStore = writable<string>('');

// UI State
export const councilUIState = writable({
	loading: false,
	error: null as string | null,
	isStreaming: false,
	currentStage: 'initial_responses' as PersonaConversationStage,
	lastLoaded: null as number | null
});

// Derived: Check if council is complete
export const isCouncilComplete = derived(
	councilUIState,
	($state) => $state.currentStage === PCS.COMPLETED
);

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
		const data = await apiFetch<{ conversations: CouncilConversation[] }>('');
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
		const data = await apiFetch<{ conversation: CouncilConversation; messages: CouncilMessage[] }>(
			`?conversationId=${conversationId}`
		);

		currentConversationStore.set(data.conversation);
		messagesStore.set(data.messages);

		// Rebuild stage stores from messages
		const stage1 = new Map<string, string>();
		const stage2: Array<{ reviewerPersonaId: string; rankings: any[] }> = [];
		let stage3 = '';

		for (const msg of data.messages) {
			if (msg.stage === PCS.INITIAL_RESPONSES && msg.personaId && msg.role === 'assistant') {
				stage1.set(msg.personaId, msg.content);
			} else if (msg.stage === PCS.PEER_REVIEW && msg.personaId && msg.rankings) {
				stage2.push({ reviewerPersonaId: msg.personaId, rankings: msg.rankings });
			} else if (msg.stage === PCS.SYNTHESIS && msg.role === 'assistant') {
				stage3 = msg.content;
			}
		}

		stage1ResponsesStore.set(stage1);
		stage2RankingsStore.set(stage2);
		stage3SynthesisStore.set(stage3);

		councilUIState.update((s) => ({
			...s,
			loading: false,
			currentStage: data.conversation.stage
		}));

		return data;
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to load conversation';
		councilUIState.update((s) => ({ ...s, loading: false, error: message }));
		throw err;
	}
}

/**
 * Start a council session (non-streaming)
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
		currentStage: PCS.INITIAL_RESPONSES
	}));
	
	try {
		const response = await fetch(`${API_BASE}/start`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query,
				personaIds,
				presidentPersonaId,
				streamingEnabled: false
			})
		});
		
		if (!response.ok) {
			throw new Error(`Failed to start council: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		// Check for error response from API (API returns 200 with error object)
		if (!data.success) {
			councilUIState.update((s) => ({ ...s, isStreaming: false, error: data.error || 'An error occurred' }));
			return { success: false, error: data.error };
		}
		
		// Process stage 1 responses
		if (data.result?.stage1Responses) {
			councilUIState.update((s) => ({ ...s, currentStage: PCS.PEER_REVIEW }));
			
			const stage1 = new Map<string, string>();
			for (const resp of data.result.stage1Responses) {
				stage1.set(resp.personaId, resp.content);
			}
			stage1ResponsesStore.set(stage1);
		}
		
		// Process stage 2 rankings
		if (data.result?.stage2Rankings) {
			councilUIState.update((s) => ({ ...s, currentStage: PCS.SYNTHESIS }));
			
			stage2RankingsStore.set(data.result.stage2Rankings);
		}
		
		// Process stage 3 synthesis
		if (data.result?.stage3Synthesis) {
			councilUIState.update((s) => ({ ...s, currentStage: PCS.COMPLETED }));
			
			stage3SynthesisStore.set(data.result.stage3Synthesis);
		}
		
		councilUIState.update((s) => ({ ...s, isStreaming: false }));
		return { success: true, conversationId: data.conversationId, result: data.result };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to start council';
		councilUIState.update((s) => ({ ...s, isStreaming: false, error: message }));
		return { success: false, error: message };
	}
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string) {
	await apiFetch<{ success: true }>('?id=' + id, {
		method: 'DELETE'
	});

	conversationsStore.update((convs) => convs.filter((c) => c.id !== id));

	currentConversationStore.update((current) => {
		if (current?.id === id) return null;
		return current;
	});
}

/**
 * Load settings
 */
export async function loadSettings() {
	try {
		const settings = await apiFetch<any>('/settings');
		return settings;
	} catch (err) {
		console.error('Failed to load settings:', err);
		throw err;
	}
}

/**
 * Update settings
 */
export async function updateSettings(data: Record<string, unknown>) {
	const settings = await apiFetch<any>('/settings', {
		method: 'PUT',
		body: JSON.stringify(data)
	});
	return settings;
}
