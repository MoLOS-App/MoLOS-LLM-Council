import { eq, and, asc, like, desc } from 'drizzle-orm';
import { councilMessages } from '../database/schema';
import type { CouncilMessage, PersonaConversationStage } from '../../models';
import { db as defaultDb } from '$lib/server/db';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export class MessageRepository {
	protected db: BetterSQLite3Database<any>;

	constructor(db?: BetterSQLite3Database<any>) {
		this.db = (db as BetterSQLite3Database<any>) || defaultDb;
	}

	private mapToMessage(row: Record<string, unknown>): CouncilMessage {
		return {
			...row,
			rankings: (row.rankings as string) ? JSON.parse(row.rankings as string) : null
		} as CouncilMessage;
	}

	async getByConversationId(
		conversationId: string,
		stage?: PersonaConversationStage
	): Promise<CouncilMessage[]> {
		const conditions = [eq(councilMessages.conversationId, conversationId)];

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

	async getById(id: string): Promise<CouncilMessage | null> {
		const result = await this.db
			.select()
			.from(councilMessages)
			.where(eq(councilMessages.id, id))
			.limit(1);

		return result[0] ? this.mapToMessage(result[0]) : null;
	}

	async create(input: Partial<CouncilMessage> & { conversationId: string; role: 'user' | 'assistant'; content: string; stage: PersonaConversationStage }): Promise<CouncilMessage> {
		const result = await this.db
			.insert(councilMessages)
			.values({
				conversationId: input.conversationId,
				personaId: input.personaId || null,
				stage: input.stage,
				role: input.role,
				content: input.content,
				rankings: input.rankings ? JSON.stringify(input.rankings) : null
			})
			.returning();

		return this.mapToMessage(result[0] as unknown as Record<string, unknown>);
	}

	async deleteByConversationId(conversationId: string): Promise<void> {
		await this.db
			.delete(councilMessages)
			.where(eq(councilMessages.conversationId, conversationId));
	}

	async delete(id: string): Promise<boolean> {
		const result = await this.db
			.delete(councilMessages)
			.where(eq(councilMessages.id, id));

		return result.changes > 0;
	}
}
