import { PersonaRepository } from '../repositories/persona-repository';
import { ProviderRepository } from '../repositories/provider-repository';
import { DEFAULT_SYSTEM_PERSONAS } from '../../models';
import { db } from '$lib/server/db';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export async function ensureDefaultPersonasForUser(
	userId: string,
	dbOverride?: BetterSQLite3Database<any>
) {
	const personaRepo = new PersonaRepository(dbOverride);
	const providerRepo = new ProviderRepository();

	let defaultProvider = await providerRepo.getDefault(userId);

	if (!defaultProvider) {
		defaultProvider = await providerRepo.create({
			userId,
			type: 'openrouter' as const,
			name: 'MoLOS System Provider',
			apiUrl: 'https://openrouter.ai/api/v1',
			apiToken: '',
			model: 'anthropic/claude-3.5-sonnet',
			isDefault: true
		});
	}

	const existingPersonas = await personaRepo.getByUserId(userId);
	const existingNames = new Set(existingPersonas.map((p) => p.name));

	const systemPersonas = [
		{ ...DEFAULT_SYSTEM_PERSONAS.CHAIRMAN, userId, providerId: defaultProvider.id },
		{ ...DEFAULT_SYSTEM_PERSONAS.MEMBER, userId, providerId: defaultProvider.id }
	];

	for (const persona of systemPersonas) {
		if (!existingNames.has(persona.name)) {
			await personaRepo.create(persona);
		}
	}
}
