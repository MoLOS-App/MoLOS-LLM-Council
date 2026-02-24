import { eq } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { councilPersonas, councilProviders } from '../database/schema';
import type { PersonaWithProvider, CouncilPersona } from '../../models';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export class PersonaRepository {
	protected db: BetterSQLite3Database<any>;

	constructor(db?: BetterSQLite3Database<any>) {
		this.db = (db as BetterSQLite3Database<any>) || defaultDb;
	}
	async getByUserId(userId: string, options?: { presidentsOnly?: boolean }): Promise<PersonaWithProvider[]> {
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
					model: councilProviders.model
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
	}

	async getByIds(ids: string[]): Promise<PersonaWithProvider[]> {
		if (ids.length === 0) return [];

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
					model: councilProviders.model
				}
			})
			.from(councilPersonas)
			.innerJoin(councilProviders, eq(councilPersonas.providerId, councilProviders.id))
			.where(eq(councilPersonas.userId, 'user'));
		return result.filter((p) => ids.includes(p.id)) as PersonaWithProvider[];
	}

	async getById(id: string, userId: string): Promise<PersonaWithProvider | null> {
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
					model: councilProviders.model
				}
			})
			.from(councilPersonas)
			.innerJoin(councilProviders, eq(councilPersonas.providerId, councilProviders.id))
			.where(eq(councilPersonas.id, id))
			.limit(1);
		return (result[0] as PersonaWithProvider) || null;
	}

	async create(persona: Omit<CouncilPersona, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonaWithProvider> {
		const result = await this.db.insert(councilPersonas).values(persona).returning();
		const personaId = result[0].id;
		return (await this.getById(personaId, persona.userId))!;
	}

	async update(id: string, userId: string, updates: Partial<CouncilPersona>): Promise<PersonaWithProvider | null> {
		await this.db
			.update(councilPersonas)
			.set({ ...updates, updatedAt: Math.floor(Date.now() / 1000) })
			.where(eq(councilPersonas.id, id));
		return this.getById(id, userId);
	}

	async delete(id: string): Promise<boolean> {
		const result = await this.db.delete(councilPersonas).where(eq(councilPersonas.id, id));
		return result.changes > 0;
	}

	async getDefault(userId: string): Promise<PersonaWithProvider | null> {
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
					model: councilProviders.model
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
	}

	async ensureDefaultPersonas(userId: string, defaultProviderId: string): Promise<void> {
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
	}

	async deleteSystemPersona(id: string): Promise<boolean> {
		const persona = await this.getById(id, '');
		if (persona?.isSystem) {
			return false;
		}
		return this.delete(id);
	}

	async getSystemPersonas(userId: string): Promise<PersonaWithProvider[]> {
		const allPersonas = await this.getByUserId(userId);
		return allPersonas.filter((p) => p.isSystem);
	}

	async getUserPersonas(userId: string): Promise<PersonaWithProvider[]> {
		const allPersonas = await this.getByUserId(userId);
		return allPersonas.filter((p) => !p.isSystem);
	}
}
