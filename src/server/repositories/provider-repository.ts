import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { councilProviders } from '../database/schema';
import type { AIProvider } from '../../models';
import { handleDatabaseError } from './repository-error-handler.js';

export class ProviderRepository {
	async getByUserId(userId: string): Promise<AIProvider[]> {
		try {
			const result = await db
				.select()
				.from(councilProviders)
				.where(eq(councilProviders.userId, userId));
			return result as AIProvider[];
		} catch (error) {
			handleDatabaseError(error, 'ProviderRepository.getByUserId');
		}
	}

	async getById(id: string, userId: string): Promise<AIProvider | null> {
		try {
			const result = await db
				.select()
				.from(councilProviders)
				.where(eq(councilProviders.id, id))
				.limit(1);
			const provider = result[0] as AIProvider | undefined;
			return provider || null;
		} catch (error) {
			handleDatabaseError(error, 'ProviderRepository.getById');
		}
	}

	async create(provider: Omit<AIProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIProvider> {
		try {
			const result = await db.insert(councilProviders).values(provider).returning();
			return result[0] as AIProvider;
		} catch (error) {
			handleDatabaseError(error, 'ProviderRepository.create');
		}
	}

	async update(
		id: string,
		userId: string,
		updates: Partial<AIProvider>
	): Promise<AIProvider | null> {
		try {
			const result = await db
				.update(councilProviders)
				.set({ ...updates, updatedAt: Math.floor(Date.now() / 1000) })
				.where(eq(councilProviders.id, id))
				.returning();
			return (result[0] as AIProvider) || null;
		} catch (error) {
			handleDatabaseError(error, 'ProviderRepository.update');
		}
	}

	async delete(id: string): Promise<boolean> {
		try {
			const result = await db.delete(councilProviders).where(eq(councilProviders.id, id));
			return result.changes > 0;
		} catch (error) {
			handleDatabaseError(error, 'ProviderRepository.delete');
		}
	}

	async setDefault(id: string, userId: string): Promise<void> {
		try {
			await db
				.update(councilProviders)
				.set({ isDefault: false })
				.where(eq(councilProviders.userId, userId));

			await db.update(councilProviders).set({ isDefault: true }).where(eq(councilProviders.id, id));
		} catch (error) {
			handleDatabaseError(error, 'ProviderRepository.setDefault');
		}
	}

	async getDefault(userId: string): Promise<AIProvider | null> {
		try {
			const result = await db
				.select()
				.from(councilProviders)
				.where(eq(councilProviders.userId, userId))
				.limit(1);
			for (const provider of result) {
				if ((provider as AIProvider).isDefault) {
					return provider as AIProvider;
				}
			}
			return null;
		} catch (error) {
			handleDatabaseError(error, 'ProviderRepository.getDefault');
		}
	}
}
