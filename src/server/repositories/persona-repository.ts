import { eq } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { councilPersonas, councilProviders } from '../database/schema';
import type { PersonaWithProvider, CouncilPersona } from '../../models';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { handleDatabaseError } from './repository-error-handler.js';

export class PersonaRepository {
	protected db: BetterSQLite3Database<any>;

	constructor(db?: BetterSQLite3Database<any>) {
		this.db = (db as BetterSQLite3Database<any>) || defaultDb;
	}
	async getByUserId(
		userId: string,
		options?: { presidentsOnly?: boolean }
	): Promise<PersonaWithProvider[]> {
		try {
			let query = this.db
				.select({
					id: councilPersonas.id,
					userId: councilPersonas.userId,
					name: councilPersonas.name,
					description: councilPersonas.description,
					avatar: councilPersonas.avatar,
					personalityPrompt: councilPersonas.personalityPrompt,
					providerId: councilPersonas.providerId,
					isPresident: councilPersonas.isPresident,
					isDefault: councilPersonas.isDefault,
					isSystem: councilPersonas.isSystem,
					createdAt: councilPersonas.createdAt,
					updatedAt: councilPersonas.updatedAt,
					provider: {
						id: councilProviders.id,
						name: councilProviders.name,
						type: councilProviders.type,
						apiUrl: councilProviders.apiUrl,
						model: councilProviders.model,
						apiToken: councilProviders.apiToken
					}
				})
				.from(councilPersonas)
				.innerJoin(councilProviders, eq(councilPersonas.providerId, councilProviders.id))
				.where(eq(councilPersonas.userId, userId));

			if (options?.presidentsOnly) {
				query = query.where(eq(councilPersonas.isPresident, true));
			}

			const result = await query;
			return result as PersonaWithProvider[];
		} catch (error) {
			handleDatabaseError(error, 'PersonaRepository.getByUserId');
		}
	}

	async getByIds(ids: string[], userId: string): Promise<PersonaWithProvider[]> {
		try {
			if (ids.length === 0) return [];

			const query = this.db
				.select({
					id: councilPersonas.id,
					userId: councilPersonas.userId,
					name: councilPersonas.name,
					description: councilPersonas.description,
					avatar: councilPersonas.avatar,
					personalityPrompt: councilPersonas.personalityPrompt,
					providerId: councilPersonas.providerId,
					isPresident: councilPersonas.isPresident,
					isDefault: councilPersonas.isDefault,
					isSystem: councilPersonas.isSystem,
					createdAt: councilPersonas.createdAt,
					updatedAt: councilPersonas.updatedAt,
					provider: {
						id: councilProviders.id,
						name: councilProviders.name,
						type: councilProviders.type,
						apiUrl: councilProviders.apiUrl,
						model: councilProviders.model,
						apiToken: councilProviders.apiToken
					}
				})
				.from(councilPersonas)
				.innerJoin(councilProviders, eq(councilPersonas.providerId, councilProviders.id))
				.where(eq(councilPersonas.userId, userId));

			const result = await query;
			return result.filter((p) => ids.includes(p.id)) as PersonaWithProvider[];
		} catch (error) {
			handleDatabaseError(error, 'PersonaRepository.getByIds');
		}
	}

	async getById(id: string, userId: string): Promise<PersonaWithProvider | null> {
		try {
			const result = await this.db
				.select({
					id: councilPersonas.id,
					userId: councilPersonas.userId,
					name: councilPersonas.name,
					description: councilPersonas.description,
					avatar: councilPersonas.avatar,
					personalityPrompt: councilPersonas.personalityPrompt,
					providerId: councilPersonas.providerId,
					isPresident: councilPersonas.isPresident,
					isDefault: councilPersonas.isDefault,
					isSystem: councilPersonas.isSystem,
					createdAt: councilPersonas.createdAt,
					updatedAt: councilPersonas.updatedAt,
					provider: {
						id: councilProviders.id,
						name: councilProviders.name,
						type: councilProviders.type,
						apiUrl: councilProviders.apiUrl,
						model: councilProviders.model,
						apiToken: councilProviders.apiToken
					}
				})
				.from(councilPersonas)
				.innerJoin(councilProviders, eq(councilPersonas.providerId, councilProviders.id))
				.where(eq(councilPersonas.id, id))
				.limit(1);
			return (result[0] as PersonaWithProvider) || null;
		} catch (error) {
			handleDatabaseError(error, 'PersonaRepository.getById');
		}
	}

	async create(
		persona: Omit<CouncilPersona, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<PersonaWithProvider> {
		try {
			const result = await this.db.insert(councilPersonas).values(persona).returning();
			const personaId = result[0].id;
			return (await this.getById(personaId, persona.userId))!;
		} catch (error) {
			handleDatabaseError(error, 'PersonaRepository.create');
		}
	}

	async update(
		id: string,
		userId: string,
		updates: Partial<CouncilPersona>
	): Promise<PersonaWithProvider | null> {
		try {
			await this.db
				.update(councilPersonas)
				.set({ ...updates, updatedAt: Math.floor(Date.now() / 1000) })
				.where(eq(councilPersonas.id, id));
			return this.getById(id, userId);
		} catch (error) {
			handleDatabaseError(error, 'PersonaRepository.update');
		}
	}

	async delete(id: string): Promise<boolean> {
		try {
			const result = await this.db.delete(councilPersonas).where(eq(councilPersonas.id, id));
			return result.changes > 0;
		} catch (error) {
			handleDatabaseError(error, 'PersonaRepository.delete');
		}
	}

	async getDefault(userId: string): Promise<PersonaWithProvider | null> {
		try {
			const result = await this.db
				.select({
					id: councilPersonas.id,
					userId: councilPersonas.userId,
					name: councilPersonas.name,
					description: councilPersonas.description,
					avatar: councilPersonas.avatar,
					personalityPrompt: councilPersonas.personalityPrompt,
					providerId: councilPersonas.providerId,
					isPresident: councilPersonas.isPresident,
					isDefault: councilPersonas.isDefault,
					isSystem: councilPersonas.isSystem,
					createdAt: councilPersonas.createdAt,
					updatedAt: councilPersonas.updatedAt,
					provider: {
						id: councilProviders.id,
						name: councilProviders.name,
						type: councilProviders.type,
						apiUrl: councilProviders.apiUrl,
						model: councilProviders.model,
						apiToken: councilProviders.apiToken
					}
				})
				.from(councilPersonas)
				.innerJoin(councilProviders, eq(councilPersonas.providerId, councilProviders.id))
				.where(eq(councilPersonas.userId, userId))
				.limit(1);
			for (const persona of result) {
				if ((persona as CouncilPersona).isDefault) {
					return persona as PersonaWithProvider;
				}
			}
			return null;
		} catch (error) {
			handleDatabaseError(error, 'PersonaRepository.getDefault');
		}
	}

	async ensureDefaultPersonas(userId: string, defaultProviderId: string): Promise<void> {
		try {
			const existingPersonas = await this.getByUserId(userId);
			const existingNames = new Set(existingPersonas.map((p) => p.name));
			const { DEFAULT_SYSTEM_PERSONAS } = await import('../../models');

			const defaultPersonas = [
				{ ...DEFAULT_SYSTEM_PERSONAS.CHAIRMAN, userId, providerId: defaultProviderId },
				{ ...DEFAULT_SYSTEM_PERSONAS.MEMBER, userId, providerId: defaultProviderId }
			];

			for (const defaultPersona of defaultPersonas) {
				if (!existingNames.has(defaultPersona.name)) {
					await this.create(defaultPersona);
				}
			}
		} catch (error) {
			handleDatabaseError(error, 'PersonaRepository.ensureDefaultPersonas');
		}
	}

	async deleteSystemPersona(id: string): Promise<boolean> {
		try {
			const persona = await this.getById(id, '');
			if (persona?.isSystem) {
				return false;
			}
			return this.delete(id);
		} catch (error) {
			handleDatabaseError(error, 'PersonaRepository.deleteSystemPersona');
		}
	}

	async getSystemPersonas(userId: string): Promise<PersonaWithProvider[]> {
		try {
			const allPersonas = await this.getByUserId(userId);
			return allPersonas.filter((p) => p.isSystem);
		} catch (error) {
			handleDatabaseError(error, 'PersonaRepository.getSystemPersonas');
		}
	}

	async getUserPersonas(userId: string): Promise<PersonaWithProvider[]> {
		try {
			const allPersonas = await this.getByUserId(userId);
			return allPersonas.filter((p) => !p.isSystem);
		} catch (error) {
			handleDatabaseError(error, 'PersonaRepository.getUserPersonas');
		}
	}
}
