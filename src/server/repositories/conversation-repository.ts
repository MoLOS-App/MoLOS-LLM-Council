import { eq, and, desc } from 'drizzle-orm';
import { councilConversations } from '../database/schema';
import type { Conversation, CouncilStage, CreateConversationInput } from '../../models';
import { db as defaultDb } from '$lib/server/db';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export class ConversationRepository {
	protected db: BetterSQLite3Database<any>;

	constructor(db?: BetterSQLite3Database<any>) {
		this.db = (db as BetterSQLite3Database<any>) || defaultDb;
	}

	private mapToConversation(row: Record<string, unknown>): Conversation {
		return {
			...row,
			selectedModels: (row.selectedModels as string[]) || [],
			synthesizerModel: (row.synthesizerModel as string) || undefined
		} as Conversation;
	}

	async getByUserId(userId: string, limit: number = 50): Promise<Conversation[]> {
		const result = await this.db
			.select()
			.from(councilConversations)
			.where(eq(councilConversations.userId, userId))
			.orderBy(desc(councilConversations.updatedAt))
			.limit(limit);

		return result.map((row) => this.mapToConversation(row));
	}

	async getById(id: string, userId: string): Promise<Conversation | null> {
		const result = await this.db
			.select()
			.from(councilConversations)
			.where(and(eq(councilConversations.id, id), eq(councilConversations.userId, userId)))
			.limit(1);

		return result[0] ? this.mapToConversation(result[0]) : null;
	}

	async create(
		userId: string,
		input: CreateConversationInput
	): Promise<Conversation> {
		const result = await this.db
			.insert(councilConversations)
			.values({
				userId,
				title: input.title,
				currentStage: input.currentStage || 'stage_1',
				selectedModels: input.selectedModels || [],
				synthesizerModel: input.synthesizerModel || 'anthropic/claude-3.5-sonnet'
			})
			.returning();

		return this.mapToConversation(result[0] as unknown as Record<string, unknown>);
	}

	async updateStage(
		id: string,
		userId: string,
		stage: CouncilStage
	): Promise<Conversation | null> {
		const result = await this.db
			.update(councilConversations)
			.set({
				currentStage: stage,
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(and(eq(councilConversations.id, id), eq(councilConversations.userId, userId)))
			.returning();

		return result[0] ? this.mapToConversation(result[0] as unknown as Record<string, unknown>) : null;
	}

	async update(
		id: string,
		userId: string,
		updates: { title?: string; selectedModels?: string[]; synthesizerModel?: string }
	): Promise<Conversation | null> {
		const result = await this.db
			.update(councilConversations)
			.set({
				...updates,
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
}
