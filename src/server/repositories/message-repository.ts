import { eq, and, asc, like, desc } from 'drizzle-orm';
import { councilMessages } from '../database/schema';
import type { CouncilMessage, PersonaConversationStage, MessageRanking } from '../../models';
import { db as defaultDb } from '$lib/server/db';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { safeJsonParse, handleDatabaseError } from './repository-error-handler.js';

export class MessageRepository {
	protected db: BetterSQLite3Database<any>;

	constructor(db?: BetterSQLite3Database<any>) {
		this.db = (db as BetterSQLite3Database<any>) || defaultDb;
	}

	private mapToMessage(row: Record<string, unknown>): CouncilMessage {
		const rankings = safeJsonParse<MessageRanking[] | null>(
			row.rankings as string,
			null,
			'councilMessages.rankings'
		);

		return {
			...row,
			rankings
		} as CouncilMessage;
	}

	async getByConversationId(
		conversationId: string,
		stage?: PersonaConversationStage
	): Promise<CouncilMessage[]> {
		try {
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
		} catch (error) {
			handleDatabaseError(error, 'MessageRepository.getByConversationId');
		}
	}

	async getById(id: string): Promise<CouncilMessage | null> {
		try {
			const result = await this.db
				.select()
				.from(councilMessages)
				.where(eq(councilMessages.id, id))
				.limit(1);

			return result[0] ? this.mapToMessage(result[0]) : null;
		} catch (error) {
			handleDatabaseError(error, 'MessageRepository.getById');
		}
	}

	async create(
		input: Partial<CouncilMessage> & {
			userId: string;
			conversationId: string;
			role: 'user' | 'assistant';
			content: string;
			stage: PersonaConversationStage;
		}
	): Promise<CouncilMessage> {
		try {
			const result = await this.db
				.insert(councilMessages)
				.values({
					userId: input.userId,
					conversationId: input.conversationId,
					personaId: input.personaId || null,
					stage: input.stage,
					role: input.role,
					content: input.content,
					rankings: input.rankings ? JSON.stringify(input.rankings) : null
				})
				.returning();

			return this.mapToMessage(result[0] as unknown as Record<string, unknown>);
		} catch (error) {
			handleDatabaseError(error, 'MessageRepository.create');
		}
	}

	async deleteByConversationId(conversationId: string): Promise<void> {
		try {
			await this.db
				.delete(councilMessages)
				.where(eq(councilMessages.conversationId, conversationId));
		} catch (error) {
			handleDatabaseError(error, 'MessageRepository.deleteByConversationId');
		}
	}

	async delete(id: string): Promise<boolean> {
		try {
			const result = await this.db.delete(councilMessages).where(eq(councilMessages.id, id));

			return result.changes > 0;
		} catch (error) {
			handleDatabaseError(error, 'MessageRepository.delete');
		}
	}
}
