import { writable, derived } from 'svelte/store';
import type { PersonaWithProvider, AIProvider } from '../models';

const API_BASE = '/api/MoLOS-LLM-Council';

async function apiFetch<T>(
	path: string,
	options?: RequestInit,
	fetchFn?: typeof fetch
): Promise<T> {
	const res = await (fetchFn || fetch)(`${API_BASE}${path}`, {
		headers: { 'Content-Type': 'application/json' },
		...options
	});
	if (!res.ok) {
		const error = await res.text();
		throw new Error(error || res.statusText);
	}
	return res.json();
}

export const personasStore = writable<PersonaWithProvider[]>([]);
export const providersStore = writable<AIProvider[]>([]);

export const systemPersonasStore = derived(personasStore, ($personas) =>
	$personas.filter((p) => p.isSystem)
);

export const userPersonasStore = derived(personasStore, ($personas) =>
	$personas.filter((p) => !p.isSystem)
);

export async function loadPersonas(fetchFn?: typeof fetch): Promise<PersonaWithProvider[]> {
	const data = await apiFetch<{ personas: PersonaWithProvider[] }>('/personas', undefined, fetchFn);
	personasStore.set(data.personas);
	return data.personas;
}

export async function loadProviders(fetchFn?: typeof fetch): Promise<AIProvider[]> {
	const data = await apiFetch<{ providers: AIProvider[] }>('/providers', undefined, fetchFn);
	providersStore.set(data.providers);
	return data.providers;
}

export async function createPersona(
	persona: Omit<PersonaWithProvider, 'id' | 'createdAt' | 'updatedAt'>,
	fetchFn?: typeof fetch
): Promise<PersonaWithProvider> {
	const data = await apiFetch<{ persona: PersonaWithProvider }>(
		'/personas',
		{
			method: 'POST',
			body: JSON.stringify(persona)
		},
		fetchFn
	);

	personasStore.update((current) => [...current, data.persona]);
	return data.persona;
}

export async function updatePersona(
	id: string,
	updates: Partial<PersonaWithProvider>,
	fetchFn?: typeof fetch
): Promise<PersonaWithProvider> {
	const data = await apiFetch<{ persona: PersonaWithProvider }>(
		`/personas/${id}`,
		{
			method: 'PUT',
			body: JSON.stringify(updates)
		},
		fetchFn
	);

	personasStore.update((current) => current.map((p) => (p.id === id ? data.persona : p)));
	return data.persona;
}

export async function deletePersona(id: string, fetchFn?: typeof fetch): Promise<void> {
	await apiFetch(`/personas/${id}`, { method: 'DELETE' }, fetchFn);
	personasStore.update((current) => current.filter((p) => p.id !== id));
}

export async function createProvider(
	provider: Omit<AIProvider, 'id' | 'createdAt' | 'updatedAt'>,
	fetchFn?: typeof fetch
): Promise<AIProvider> {
	const data = await apiFetch<{ provider: AIProvider }>(
		'/providers',
		{
			method: 'POST',
			body: JSON.stringify(provider)
		},
		fetchFn
	);

	providersStore.update((current) => [...current, data.provider]);
	return data.provider;
}

export async function updateProvider(
	id: string,
	updates: Partial<AIProvider>,
	fetchFn?: typeof fetch
): Promise<AIProvider> {
	const data = await apiFetch<{ provider: AIProvider }>(
		`/providers/${id}`,
		{
			method: 'PUT',
			body: JSON.stringify(updates)
		},
		fetchFn
	);

	providersStore.update((current) => current.map((p) => (p.id === id ? data.provider : p)));
	return data.provider;
}

export async function deleteProvider(id: string, fetchFn?: typeof fetch): Promise<void> {
	await apiFetch(`/providers/${id}`, { method: 'DELETE' }, fetchFn);
	providersStore.update((current) => current.filter((p) => p.id !== id));
}

export async function setDefaultProvider(id: string, fetchFn?: typeof fetch): Promise<void> {
	await apiFetch(`/providers/${id}`, { method: 'POST' }, fetchFn);
	providersStore.update((current) => current.map((p) => ({ ...p, isDefault: p.id === id })));
}
