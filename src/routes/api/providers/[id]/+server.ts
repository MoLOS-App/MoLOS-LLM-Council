import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { ProviderRepository } from '../../../../server/repositories/provider-repository';
import { db } from '$lib/server/db';

const UpdateProviderSchema = z.object({
	name: z.string().min(1).optional(),
	apiUrl: z.string().min(1).optional(),
	apiToken: z.string().min(1).optional(),
	model: z.string().min(1).optional(),
	isDefault: z.boolean().optional()
});

export const GET: RequestHandler = async ({ locals, params }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const providerRepo = new ProviderRepository();
	const provider = await providerRepo.getById(params.id, userId);

	if (!provider) {
		throw error(404, 'Provider not found');
	}

	return json({ provider });
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const result = UpdateProviderSchema.safeParse(body);

	if (!result.success) {
		throw error(400, result.error.issues[0].message);
	}

	const providerRepo = new ProviderRepository();
	const provider = await providerRepo.update(params.id, userId, result.data);

	if (!provider) {
		throw error(404, 'Provider not found');
	}

	if (result.data.isDefault) {
		await providerRepo.setDefault(params.id, userId);
	}

	return json({ provider });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const providerRepo = new ProviderRepository();
	const provider = await providerRepo.getById(params.id, userId);

	if (!provider) {
		throw error(404, 'Provider not found');
	}

	await providerRepo.delete(params.id);

	return json({ success: true });
};

export const POST: RequestHandler = async ({ locals, params }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const providerRepo = new ProviderRepository();
	const provider = await providerRepo.getById(params.id, userId);

	if (!provider) {
		throw error(404, 'Provider not found');
	}

	await providerRepo.setDefault(params.id, userId);

	return json({ success: true });
};
