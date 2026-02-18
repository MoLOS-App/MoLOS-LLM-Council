import { eq, and, asc } from 'drizzle-orm';
import { councilMessages } from '../database/schema';
import type {
	Message,
	CouncilStage,
	ModelRanking,
	CreateMessageInput
} from '../../models';
import { db as defaultDb } from '$lib/server/db';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export class MessageRepository {
	protected db: BetterSQLite3Database<any>;

	constructor(db?: BetterSQLite3Database<any>) {
		this.db = (db as BetterSQLite3Database<any>) || defaultDb;
	}

	private mapToMessage(row: Record<string, unknown>): Message {
		return {
			...row,
			rankings: (row.rankings as ModelRanking[]) || undefined,
			metadata: (row.metadata as Record<string, unknown>) || undefined
		} as Message;
	}

	async getByConversationId(
		conversationId: string,
		userId: string,
		stage?: CouncilStage
	): Promise<Message[]> {
		const conditions = [
			eq(councilMessages.conversationId, conversationId),
			eq(councilMessages.userId, userId)
		];

		if (stage) {
			conditions.push(eq(councilMessages.stage, stage));
		}

		const result = await this.db
			.select()
			.from(councilMessages)
			.where(and(...conditions))
			.orderBy(asc(councilMessages.createdAt));

		return result.map((row) => this.mapToMessage(row));
	}

	async getById(id: string, userId: string): Promise<Message | null> {
		const result = await this.db
			.select()
			.from(councilMessages)
			.where(and(eq(councilMessages.id, id), eq(councilMessages.userId, userId)))
			.limit(1);

		return result[0] ? this.mapToMessage(result[0]) : null;
	}

	async create(input: CreateMessageInput): Promise<Message> {
		const result = await this.db
			.insert(councilMessages)
			.values({
				conversationId: input.conversationId,
				userId: input.userId,
				role: input.role,
				content: input.content,
				modelId: input.modelId,
				stage: input.stage,
				rankings: input.rankings,
				metadata: input.metadata
			})
			.returning();

		return this.mapToMessage(result[0] as unknown as Record<string, unknown>);
	}

	async updateContent(
		id: string,
		userId: string,
		content: string
	): Promise<Message | null> {
		const result = await this.db
			.update(councilMessages)
			.set({ content })
			.where(and(eq(councilMessages.id, id), eq(councilMessages.userId, userId)))
			.returning();

		return result[0] ? this.mapToMessage(result[0] as unknown as Record<string, unknown>) : null;
	}

	async updateRankings(
		id: string,
		userId: string,
		rankings: ModelRanking[]
	): Promise<Message | null> {
		const result = await this.db
			.update(councilMessages)
			.set({ rankings })
			.where(and(eq(councilMessages.id, id), eq(councilMessages.userId, userId)))
			.returning();

		return result[0] ? this.mapToMessage(result[0] as unknown as Record<string, unknown>) : null;
	}

	async deleteByConversationId(conversationId: string): Promise<void> {
		await this.db
			.delete(councilMessages)
			.where(eq(councilMessages.conversationId, conversationId));
	}

	async delete(id: string, userId: string): Promise<boolean> {
		const result = await this.db
			.delete(councilMessages)
			.where(and(eq(councilMessages.id, id), eq(councilMessages.userId, userId)));

		return result.changes > 0;
	}
}
