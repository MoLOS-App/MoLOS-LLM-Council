import { eq, and, desc, like } from 'drizzle-orm';
import { councilConversations } from '../database/schema';
import type { CouncilConversation, PersonaConversationStage } from '../../models';
import { db as defaultDb } from '$lib/server/db';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export class ConversationRepository {
	protected db: BetterSQLite3Database<any>;

	constructor(db?: BetterSQLite3Database<any>) {
		this.db = (db as BetterSQLite3Database<any>) || defaultDb;
	}

	private mapToConversation(row: Record<string, unknown>): CouncilConversation {
		return {
			...row,
			selectedPersonaIds: JSON.parse((row.selectedPersonaIds as string) || '[]'),
			tags: JSON.parse((row.tags as string) || '[]'),
			messages: []
		} as CouncilConversation;
	}

	async getByUserId(userId: string, limit: number = 50): Promise<CouncilConversation[]> {
		const result = await this.db
			.select()
			.from(councilConversations)
			.where(eq(councilConversations.userId, userId))
			.orderBy(desc(councilConversations.updatedAt))
			.limit(limit);

		return result.map((row) => this.mapToConversation(row));
	}

	async getById(id: string, userId: string): Promise<CouncilConversation | null> {
		const result = await this.db
			.select()
			.from(councilConversations)
			.where(and(eq(councilConversations.id, id), eq(councilConversations.userId, userId)))
			.limit(1);

		return result[0] ? this.mapToConversation(result[0]) : null;
	}

	async create(
		userId: string,
		query: string,
		selectedPersonaIds: string[],
		presidentPersonaId?: string
	): Promise<CouncilConversation> {
		const result = await this.db
			.insert(councilConversations)
			.values({
				userId,
				query,
				stage: 'initial_responses' as PersonaConversationStage,
				selectedPersonaIds: JSON.stringify(selectedPersonaIds),
				presidentPersonaId: presidentPersonaId || null,
				tags: JSON.stringify([])
			})
			.returning();

		return this.mapToConversation(result[0] as unknown as Record<string, unknown>);
	}

	async updateStage(
		id: string,
		userId: string,
		stage: PersonaConversationStage
	): Promise<CouncilConversation | null> {
		const result = await this.db
			.update(councilConversations)
			.set({
				stage,
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(and(eq(councilConversations.id, id), eq(councilConversations.userId, userId)))
			.returning();

		return result[0] ? this.mapToConversation(result[0] as unknown as Record<string, unknown>) : null;
	}

	async delete(id: string, userId: string): Promise<boolean> {
		const result = await this.db
			.delete(councilConversations)
			.where(and(eq(councilConversations.id, id), eq(councilConversations.userId, userId)));

		return result.changes > 0;
	}

	async searchByUserId(
		userId: string,
		searchQuery: string,
		limit: number = 20
	): Promise<CouncilConversation[]> {
		const term = `%${searchQuery}%`;
		const result = await this.db
			.select()
			.from(councilConversations)
			.where(and(eq(councilConversations.userId, userId), like(councilConversations.query, term)))
			.orderBy(desc(councilConversations.updatedAt))
			.limit(limit);

		return result.map((row) => this.mapToConversation(row));
	}
}
