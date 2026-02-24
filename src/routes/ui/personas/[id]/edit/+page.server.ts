import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { PersonaWithProvider } from '$lib/modules/MoLOS-LLM-Council/models';

interface PageData {
	persona: PersonaWithProvider | null;
	providers: unknown[];
}

export const load: PageServerLoad = async ({ params, fetch }) => {
	try {
		const [personaResponse, providersResponse] = await Promise.all([
			fetch('/api/MoLOS-LLM-Council/personas/' + params.id),
			fetch('/api/MoLOS-LLM-Council/providers')
		]);

		if (!personaResponse.ok) {
			if (personaResponse.status === 404) {
				throw error(404, 'Persona not found');
			}
			throw error(personaResponse.status, 'Failed to load persona');
		}

		const personaData = await personaResponse.json();

		if (personaData.persona.isSystem) {
			throw error(400, 'Cannot edit system personas');
		}

		let providers = [];
		if (providersResponse.ok) {
			const providersData = await providersResponse.json();
			providers = providersData.providers || [];
		}

		return {
			persona: personaData.persona,
			providers
		};
	} catch (err) {
		if (err instanceof Error && err.message === 'Persona not found') {
			throw err;
		}
		console.error('Failed to load persona:', err);
		return {
			persona: null,
			providers: []
		};
	}
};
