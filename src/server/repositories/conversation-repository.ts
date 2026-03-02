import { eq, and, desc, like } from "drizzle-orm";
import { councilConversations } from "../database/schema";
import type {
  CouncilConversation,
  PersonaConversationStage,
} from "../../models";
import { db as defaultDb } from "$lib/server/db";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  safeJsonParse,
  handleDatabaseError,
} from "./repository-error-handler.js";

export class ConversationRepository {
  protected db: BetterSQLite3Database<any>;

  constructor(db?: BetterSQLite3Database<any>) {
    this.db = (db as BetterSQLite3Database<any>) || defaultDb;
  }

  private mapToConversation(row: Record<string, unknown>): CouncilConversation {
    const selectedPersonaIds = safeJsonParse<string[]>(
      row.selectedPersonaIds as string,
      [],
      "councilConversations.selectedPersonaIds",
    );

    const tags = safeJsonParse<string[]>(
      row.tags as string,
      [],
      "councilConversations.tags",
    );

    return {
      ...row,
      selectedPersonaIds,
      tags,
      messages: [],
    } as CouncilConversation;
  }

  async getByUserId(
    userId: string,
    limit: number = 50,
  ): Promise<CouncilConversation[]> {
    try {
      const result = await this.db
        .select()
        .from(councilConversations)
        .where(eq(councilConversations.userId, userId))
        .orderBy(desc(councilConversations.updatedAt))
        .limit(limit);

      return result.map((row) => this.mapToConversation(row));
    } catch (error) {
      handleDatabaseError(error, "ConversationRepository.getByUserId");
    }
  }

  async getById(
    id: string,
    userId: string,
  ): Promise<CouncilConversation | null> {
    try {
      const result = await this.db
        .select()
        .from(councilConversations)
        .where(
          and(
            eq(councilConversations.id, id),
            eq(councilConversations.userId, userId),
          ),
        )
        .limit(1);

      return result[0] ? this.mapToConversation(result[0]) : null;
    } catch (error) {
      handleDatabaseError(error, "ConversationRepository.getById");
    }
  }

  async create(
    userId: string,
    query: string,
    selectedPersonaIds: string[],
    presidentPersonaId?: string,
  ): Promise<CouncilConversation> {
    try {
      const title = query.trim().slice(0, 100) || "Untitled Conversation";
      const result = await this.db
        .insert(councilConversations)
        .values({
          userId,
          title,
          query,
          stage: "initial_responses" as PersonaConversationStage,
          selectedPersonaIds: JSON.stringify(selectedPersonaIds),
          presidentPersonaId: presidentPersonaId || null,
          tags: JSON.stringify([]),
        })
        .returning();

      return this.mapToConversation(
        result[0] as unknown as Record<string, unknown>,
      );
    } catch (error) {
      handleDatabaseError(error, "ConversationRepository.create");
    }
  }

  async updateStage(
    id: string,
    userId: string,
    stage: PersonaConversationStage,
  ): Promise<CouncilConversation | null> {
    try {
      const result = await this.db
        .update(councilConversations)
        .set({
          stage,
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(
          and(
            eq(councilConversations.id, id),
            eq(councilConversations.userId, userId),
          ),
        )
        .returning();

      return result[0]
        ? this.mapToConversation(
            result[0] as unknown as Record<string, unknown>,
          )
        : null;
    } catch (error) {
      handleDatabaseError(error, "ConversationRepository.updateStage");
    }
  }

  async update(
    id: string,
    userId: string,
    updates: Partial<{ decisionSummary: string | null; tags: string }>,
  ): Promise<CouncilConversation | null> {
    try {
      const result = await this.db
        .update(councilConversations)
        .set({
          ...updates,
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(
          and(
            eq(councilConversations.id, id),
            eq(councilConversations.userId, userId),
          ),
        )
        .returning();

      return result[0]
        ? this.mapToConversation(
            result[0] as unknown as Record<string, unknown>,
          )
        : null;
    } catch (error) {
      handleDatabaseError(error, "ConversationRepository.update");
    }
  }

  async delete(id: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(councilConversations)
        .where(
          and(
            eq(councilConversations.id, id),
            eq(councilConversations.userId, userId),
          ),
        );

      return result.changes > 0;
    } catch (error) {
      handleDatabaseError(error, "ConversationRepository.delete");
    }
  }

  async searchByUserId(
    userId: string,
    searchQuery: string,
    limit: number = 20,
  ): Promise<CouncilConversation[]> {
    try {
      const term = `%${searchQuery}%`;
      const result = await this.db
        .select()
        .from(councilConversations)
        .where(
          and(
            eq(councilConversations.userId, userId),
            like(councilConversations.query, term),
          ),
        )
        .orderBy(desc(councilConversations.updatedAt))
        .limit(limit);

      return result.map((row) => this.mapToConversation(row));
    } catch (error) {
      handleDatabaseError(error, "ConversationRepository.searchByUserId");
    }
  }
}
