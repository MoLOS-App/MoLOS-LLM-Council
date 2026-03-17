import { writable, derived } from "svelte/store";
import type {
  CouncilConversation,
  CouncilMessage,
  PersonaWithProvider,
  PersonaConversationStage,
  MessageRanking,
} from "../models";
import { PersonaConversationStage as PCS } from "../models";

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
const API_BASE = "/api/MoLOS-LLM-Council";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || res.statusText);
  }
  return res.json();
}

// Data Stores
export const conversationsStore = writable<CouncilConversation[]>([]);
export const currentConversationStore = writable<CouncilConversation | null>(
  null,
);
export const messagesStore = writable<CouncilMessage[]>([]);

// Stage-specific stores (persona-based)
export const stage1ResponsesStore = writable<Map<string, string>>(new Map());
export const stage2RankingsStore = writable<Stage2Ranking[]>([]);
export const stage3SynthesisStore = writable<string>("");

// UI State
export const councilUIState = writable({
  loading: false,
  error: null as string | null,
  isProcessing: false,
  currentStage: "initial_responses" as PersonaConversationStage,
  lastLoaded: null as number | null,
});

// Track if a load is in progress to prevent duplicate requests
let isLoadingConversations = false;
let isLoadingSettings = false;
let hasLoadedSettings = false;

// Derived: Check if council is complete
export const isCouncilComplete = derived(
  councilUIState,
  ($state) => $state.currentStage === PCS.COMPLETED,
);

/**
 * Load personas
 */
export async function loadPersonas(): Promise<PersonaWithProvider[]> {
  const data = await apiFetch<{ personas: PersonaWithProvider[] }>("/personas");
  return data.personas;
}

/**
 * Load conversations
 */
export async function loadConversations() {
  // Prevent duplicate requests
  if (isLoadingConversations) {
    return;
  }
  isLoadingConversations = true;

  councilUIState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiFetch<{ conversations: CouncilConversation[] }>("");
    conversationsStore.set(data.conversations);
    councilUIState.update((s) => ({
      ...s,
      loading: false,
      lastLoaded: Date.now(),
    }));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load conversations";
    councilUIState.update((s) => ({ ...s, loading: false, error: message }));
    throw err;
  } finally {
    isLoadingConversations = false;
  }
}

/**
 * Load a specific conversation with messages
 */
export async function loadConversation(conversationId: string) {
  councilUIState.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiFetch<{
      conversation: CouncilConversation;
      messages: CouncilMessage[];
    }>(`?conversationId=${conversationId}`);

    currentConversationStore.set(data.conversation);
    messagesStore.set(data.messages);

    // Rebuild stage stores from messages
    const stage1 = new Map<string, string>();
    const stage2: Array<{ reviewerPersonaId: string; rankings: any[] }> = [];
    let stage3 = "";

    for (const msg of data.messages) {
      if (
        msg.stage === PCS.INITIAL_RESPONSES &&
        msg.personaId &&
        msg.role === "assistant"
      ) {
        stage1.set(msg.personaId, msg.content);
      } else if (
        msg.stage === PCS.PEER_REVIEW &&
        msg.personaId &&
        msg.rankings
      ) {
        stage2.push({
          reviewerPersonaId: msg.personaId,
          rankings: msg.rankings,
        });
      } else if (msg.stage === PCS.SYNTHESIS && msg.role === "assistant") {
        stage3 = msg.content;
      }
    }

    stage1ResponsesStore.set(stage1);
    stage2RankingsStore.set(stage2);
    stage3SynthesisStore.set(stage3);

    councilUIState.update((s) => ({
      ...s,
      loading: false,
      currentStage: data.conversation.stage,
    }));

    return data;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load conversation";
    councilUIState.update((s) => ({ ...s, loading: false, error: message }));
    throw err;
  }
}

/**
 * Start a council session with progressive updates
 * Each stage updates the UI as responses come in
 */
export async function startCouncil(
  query: string,
  personaIds?: string[],
  presidentPersonaId?: string,
) {
  // Reset stage stores
  stage1ResponsesStore.set(new Map());
  stage2RankingsStore.set([]);
  stage3SynthesisStore.set("");

  councilUIState.update((s) => ({
    ...s,
    isProcessing: true,
    error: null,
    currentStage: PCS.INITIAL_RESPONSES,
  }));

  const errors: string[] = [];

  try {
    // Load personas to get their details
    const personasData = await apiFetch<{ personas: PersonaWithProvider[] }>("/personas");
    const selectedPersonas = personasData.personas.filter((p) => personaIds?.includes(p.id));
    const presidentPersona = personasData.personas.find((p) => p.id === presidentPersonaId);

    if (selectedPersonas.length === 0) {
      councilUIState.update((s) => ({
        ...s,
        isProcessing: false,
        error: "No personas selected",
      }));
      return { success: false, error: "No personas selected" };
    }

    // === STAGE 1: Get responses from each persona (parallel, update as they complete) ===
    const stage1Responses: Array<{ personaId: string; personaName: string; content: string }> = [];

    const stage1Promises = selectedPersonas.map(async (persona) => {
      try {
        const response = await fetch(`${API_BASE}/response`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personaId: persona.id,
            query,
          }),
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
          const errorMsg = data.error || `Failed to get response from ${persona.name}`;
          errors.push(errorMsg);
          return null;
        }

        // Update the store immediately as each response comes in
        stage1ResponsesStore.update((map) => {
          const newMap = new Map(map);
          newMap.set(data.response.personaId, data.response.content);
          return newMap;
        });

        stage1Responses.push(data.response);
        return data.response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : `Failed to get response from ${persona.name}`;
        errors.push(errorMsg);
        return null;
      }
    });

    await Promise.all(stage1Promises);

    // Check if we have any successful responses
    if (stage1Responses.length === 0) {
      const errorMsg = errors.length > 0 ? errors[0] : "Failed to get any responses";
      councilUIState.update((s) => ({
        ...s,
        isProcessing: false,
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }

    // Show warning if some failed
    if (errors.length > 0) {
      console.warn("[Council] Some responses failed:", errors);
    }

    // === STAGE 2: Get rankings from each persona (parallel, update as they complete) ===
    councilUIState.update((s) => ({ ...s, currentStage: PCS.PEER_REVIEW }));

    const stage2Rankings: Stage2Ranking[] = [];

    const stage2Promises = selectedPersonas.map(async (persona) => {
      try {
        const response = await fetch(`${API_BASE}/ranking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personaId: persona.id,
            responses: stage1Responses,
          }),
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
          // Don't fail the whole council for ranking errors
          console.warn(`Ranking failed for ${persona.name}:`, data.error);
          return null;
        }

        // Update the store immediately as each ranking comes in
        stage2RankingsStore.update((rankings) => [...rankings, data.ranking]);

        stage2Rankings.push(data.ranking);
        return data.ranking;
      } catch (err) {
        console.warn(`Ranking failed for ${persona.name}:`, err);
        return null;
      }
    });

    await Promise.all(stage2Promises);

    // === STAGE 3: Synthesis by president ===
    councilUIState.update((s) => ({ ...s, currentStage: PCS.SYNTHESIS }));

    if (presidentPersona && stage1Responses.length > 0) {
      try {
        const response = await fetch(`${API_BASE}/synthesis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            presidentPersonaId: presidentPersona.id,
            responses: stage1Responses,
          }),
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
          console.warn("Synthesis failed:", data.error);
        } else {
          stage3SynthesisStore.set(data.synthesis);
        }
      } catch (err) {
        console.warn("Synthesis failed:", err);
      }
    }

    // Mark as complete
    councilUIState.update((s) => ({
      ...s,
      isProcessing: false,
      currentStage: PCS.COMPLETED,
    }));

    // Return first error if any (but don't fail - partial results are still useful)
    if (errors.length > 0) {
      return { success: true, warning: errors[0] };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start council";
    councilUIState.update((s) => ({
      ...s,
      isProcessing: false,
      error: message,
    }));
    return { success: false, error: message };
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string) {
  await apiFetch<{ success: true }>("?id=" + id, {
    method: "DELETE",
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
  // Prevent duplicate requests - only load once per session
  if (isLoadingSettings || hasLoadedSettings) {
    return;
  }
  isLoadingSettings = true;

  try {
    const settings = await apiFetch<any>("/settings");
    hasLoadedSettings = true;
    return settings;
  } catch (err) {
    console.error("Failed to load settings:", err);
    throw err;
  } finally {
    isLoadingSettings = false;
  }
}

/**
 * Update settings
 */
export async function updateSettings(data: Record<string, unknown>) {
  const settings = await apiFetch<any>("/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return settings;
}
