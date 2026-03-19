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

	const existingPersonas = await personaRepo.getByUserId(userId);
	const existingNames = new Set(existingPersonas.map((p) => p.name));

	const existingSystemPersonaNames = ['MoLOS Default Chairman', 'MoLOS Default Member'];
	const systemPersonasExist = existingSystemPersonaNames.some((name) => existingNames.has(name));

	if (systemPersonasExist) {
		return;
	}

	const defaultProvider = await providerRepo.getDefault(userId);

	if (!defaultProvider || !defaultProvider.apiToken) {
		return;
	}

	const systemPersonas = [
		{
			...DEFAULT_SYSTEM_PERSONAS.CHAIRMAN,
			userId,
			providerId: defaultProvider.id
		},
		{
			...DEFAULT_SYSTEM_PERSONAS.MEMBER,
			userId,
			providerId: defaultProvider.id
		}
	];

	for (const persona of systemPersonas) {
		if (!existingNames.has(persona.name)) {
			await personaRepo.create(persona);
		}
	}
}
