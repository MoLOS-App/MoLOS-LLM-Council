import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { PersonaRepository } from '../../../../server/repositories/persona-repository';
import { db } from '$lib/server/db';

const UpdatePersonaSchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	avatar: z.string().min(1).optional(),
	personalityPrompt: z.string().min(1).optional(),
	providerId: z.string().optional(),
	isPresident: z.boolean().optional()
});

export const GET: RequestHandler = async ({ locals, params }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const personaRepo = new PersonaRepository(db);
	const persona = await personaRepo.getById(params.id, userId);

	if (!persona) {
		throw error(404, 'Persona not found');
	}

	return json({ persona });
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const result = UpdatePersonaSchema.safeParse(body);

	if (!result.success) {
		throw error(400, result.error.issues[0].message);
	}

	const personaRepo = new PersonaRepository(db);

	const existingPersona = await personaRepo.getById(params.id, userId);
	if (!existingPersona) {
		throw error(404, 'Persona not found');
	}

	if (existingPersona.isSystem) {
		throw error(400, 'Cannot modify system personas');
	}

	const persona = await personaRepo.update(params.id, userId, result.data);

	if (!persona) {
		throw error(404, 'Persona not found');
	}

	return json({ persona });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const personaRepo = new PersonaRepository(db);
	const persona = await personaRepo.getById(params.id, userId);

	if (!persona) {
		throw error(404, 'Persona not found');
	}

	if (persona.isSystem) {
		throw error(400, 'Cannot delete system personas');
	}

	await personaRepo.delete(params.id);

	return json({ success: true });
};
