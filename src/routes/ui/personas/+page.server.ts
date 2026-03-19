import { loadPersonas } from '../../../stores/personas.store.js';
import type { PageServerLoad } from './$types';
import type { PersonaWithProvider } from '../../../models/index.js';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const personas = await loadPersonas(fetch);
		return { personas };
	} catch (err) {
		console.error('Failed to load personas:', err);
		return { personas: [] };
	}
};
