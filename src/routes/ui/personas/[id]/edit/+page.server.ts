import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const userId = 'user';

	try {
		const response = await fetch(`/api/MoLOS-LLM-Council/personas/${params.id}`);

		if (!response.ok) {
			if (response.status === 404) {
				throw error(404, 'Persona not found');
			}
			throw error(response.status, 'Failed to load persona');
		}

		const data = await response.json();

		if (data.persona.isSystem) {
			throw error(400, 'Cannot edit system personas');
		}

		return data as PageData;
	} catch (err) {
		if (err instanceof Error && err.message === 'Persona not found') {
			throw err;
		}
		console.error('Failed to load persona:', err);
		return {
			persona: null as any,
			providers: [] as any
		};
	}
};
