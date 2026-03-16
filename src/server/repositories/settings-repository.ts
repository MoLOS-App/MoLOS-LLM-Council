import { eq } from "drizzle-orm";
import { councilSettings } from "../database/schema";
import type {
  CouncilSettings,
  UpdateSettingsInput,
} from "../../models/index.js";
import { db as defaultDb } from "$lib/server/db";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  safeJsonParse,
  handleDatabaseError,
} from "./repository-error-handler.js";

const DEFAULT_SETTINGS = {
  defaultModels: [
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o",
    "google/gemini-2.0-flash-001",
  ],
  defaultSynthesizer: "anthropic/claude-3.5-sonnet",
  streamingEnabled: true,
  maxTokensStage1: 1024,
  maxTokensStage2: 512,
  maxTokensStage3: 4096,
};

/**
 * Insert data shape for councilSettings table
 */
interface CouncilSettingsInsert {
  userId: string;
  openrouterApiKey: string | null;
  defaultModels: string;
  defaultSynthesizer: string;
  customStage1Prompt: string | null;
  customStage2Prompt: string | null;
  customStage3Prompt: string | null;
  maxTokensStage1: number;
  maxTokensStage2: number;
  maxTokensStage3: number;
  streamingEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export class SettingsRepository {
  protected db: BetterSQLite3Database<any>;

  constructor(db?: BetterSQLite3Database<any>) {
    this.db = (db as BetterSQLite3Database<any>) || defaultDb;
  }

  private mapToSettings(row: Record<string, unknown>): CouncilSettings {
    const defaultModels = safeJsonParse<string[]>(
      row.defaultModels as string,
      DEFAULT_SETTINGS.defaultModels!,
      "councilSettings.defaultModels",
    );

    return {
      ...row,
      openrouterApiKey: (row.openrouterApiKey as string) || undefined,
      defaultModels,
      defaultSynthesizer:
        (row.defaultSynthesizer as string) ||
        DEFAULT_SETTINGS.defaultSynthesizer ||
        "",
      customStage1Prompt: (row.customStage1Prompt as string) || undefined,
      customStage2Prompt: (row.customStage2Prompt as string) || undefined,
      customStage3Prompt: (row.customStage3Prompt as string) || undefined,
      maxTokensStage1: (row.maxTokensStage1 as number) ?? DEFAULT_SETTINGS.maxTokensStage1,
      maxTokensStage2: (row.maxTokensStage2 as number) ?? DEFAULT_SETTINGS.maxTokensStage2,
      maxTokensStage3: (row.maxTokensStage3 as number) ?? DEFAULT_SETTINGS.maxTokensStage3,
      streamingEnabled: (row.streamingEnabled as boolean) ?? DEFAULT_SETTINGS.streamingEnabled,
    } as CouncilSettings;
  }

  async getByUserId(userId: string): Promise<CouncilSettings | null> {
    try {
      const result = await this.db
        .select()
        .from(councilSettings)
        .where(eq(councilSettings.userId, userId))
        .limit(1);

      return result[0] ? this.mapToSettings(result[0]) : null;
    } catch (error) {
      handleDatabaseError(error, "SettingsRepository.getByUserId");
    }
  }

  async getOrCreate(userId: string): Promise<CouncilSettings> {
    try {
      let result = await this.db
        .select()
        .from(councilSettings)
        .where(eq(councilSettings.userId, userId))
        .limit(1);

      if (result.length === 0) {
        const now = Math.floor(Date.now() / 1000);
        const insertData = {
          userId,
          openrouterApiKey: "",
          defaultModels: JSON.stringify(DEFAULT_SETTINGS.defaultModels),
          defaultSynthesizer: DEFAULT_SETTINGS.defaultSynthesizer,
          customStage1Prompt: null,
          customStage2Prompt: null,
          customStage3Prompt: null,
          maxTokensStage1: DEFAULT_SETTINGS.maxTokensStage1,
          maxTokensStage2: DEFAULT_SETTINGS.maxTokensStage2,
          maxTokensStage3: DEFAULT_SETTINGS.maxTokensStage3,
          streamingEnabled: DEFAULT_SETTINGS.streamingEnabled,
          createdAt: now,
          updatedAt: now,
        };
        result = await this.db
          .insert(councilSettings)
          .values(insertData)
          .returning();
      }

      return this.mapToSettings(result[0]);
    } catch (error) {
      handleDatabaseError(error, "SettingsRepository.getOrCreate");
    }
  }

  async update(
    userId: string,
    input: UpdateSettingsInput,
  ): Promise<CouncilSettings> {
    try {
      await this.getOrCreate(userId);

      const updateData: Record<string, unknown> = {
        updatedAt: Math.floor(Date.now() / 1000),
      };

      // Add only the fields that are actually provided in input
      if (input.openrouterApiKey !== undefined)
        updateData.openrouterApiKey = input.openrouterApiKey;
      if (input.defaultModels !== undefined)
        updateData.defaultModels = JSON.stringify(input.defaultModels);
      if (input.defaultSynthesizer !== undefined)
        updateData.defaultSynthesizer = input.defaultSynthesizer;
      if (input.customStage1Prompt !== undefined)
        updateData.customStage1Prompt = input.customStage1Prompt;
      if (input.customStage2Prompt !== undefined)
        updateData.customStage2Prompt = input.customStage2Prompt;
      if (input.customStage3Prompt !== undefined)
        updateData.customStage3Prompt = input.customStage3Prompt;
      if (input.maxTokensStage1 !== undefined)
        updateData.maxTokensStage1 = input.maxTokensStage1;
      if (input.maxTokensStage2 !== undefined)
        updateData.maxTokensStage2 = input.maxTokensStage2;
      if (input.maxTokensStage3 !== undefined)
        updateData.maxTokensStage3 = input.maxTokensStage3;
      if (input.streamingEnabled !== undefined)
        updateData.streamingEnabled = input.streamingEnabled;

      const result = await this.db
        .update(councilSettings)
        .set(updateData)
        .where(eq(councilSettings.userId, userId))
        .returning();

      return this.mapToSettings(
        result[0] as unknown as Record<string, unknown>,
      );
    } catch (error) {
      handleDatabaseError(error, "SettingsRepository.update");
    }
  }

  async upsert(
    userId: string,
    input: UpdateSettingsInput,
  ): Promise<CouncilSettings> {
    try {
      const existing = await this.getByUserId(userId);

      if (existing) {
        return this.update(userId, input);
      }

      const now = Math.floor(Date.now() / 1000);
      const insertData: CouncilSettingsInsert = {
        userId,
        defaultModels: JSON.stringify(DEFAULT_SETTINGS.defaultModels),
        defaultSynthesizer: DEFAULT_SETTINGS.defaultSynthesizer,
        streamingEnabled: DEFAULT_SETTINGS.streamingEnabled,
        maxTokensStage1: DEFAULT_SETTINGS.maxTokensStage1,
        maxTokensStage2: DEFAULT_SETTINGS.maxTokensStage2,
        maxTokensStage3: DEFAULT_SETTINGS.maxTokensStage3,
        customStage1Prompt: null,
        customStage2Prompt: null,
        customStage3Prompt: null,
        openrouterApiKey: null,
        createdAt: now,
        updatedAt: now,
      };

      // Override with input values
      if (input.openrouterApiKey !== undefined)
        insertData.openrouterApiKey = input.openrouterApiKey;
      if (input.defaultModels !== undefined)
        insertData.defaultModels = JSON.stringify(input.defaultModels);
      if (input.defaultSynthesizer !== undefined)
        insertData.defaultSynthesizer = input.defaultSynthesizer;
      if (input.customStage1Prompt !== undefined)
        insertData.customStage1Prompt = input.customStage1Prompt;
      if (input.customStage2Prompt !== undefined)
        insertData.customStage2Prompt = input.customStage2Prompt;
      if (input.customStage3Prompt !== undefined)
        insertData.customStage3Prompt = input.customStage3Prompt;
      if (input.maxTokensStage1 !== undefined)
        insertData.maxTokensStage1 = input.maxTokensStage1;
      if (input.maxTokensStage2 !== undefined)
        insertData.maxTokensStage2 = input.maxTokensStage2;
      if (input.maxTokensStage3 !== undefined)
        insertData.maxTokensStage3 = input.maxTokensStage3;
      if (input.streamingEnabled !== undefined)
        insertData.streamingEnabled = input.streamingEnabled;

      const result = await this.db
        .insert(councilSettings)
        .values(insertData)
        .returning();

      return this.mapToSettings(
        result[0] as unknown as Record<string, unknown>,
      );
    } catch (error) {
      handleDatabaseError(error, "SettingsRepository.upsert");
    }
  }
}
