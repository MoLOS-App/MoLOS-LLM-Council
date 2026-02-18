import { eq } from 'drizzle-orm';
import { councilSettings } from '../database/schema';
import type { CouncilSettings, UpdateSettingsInput } from '../../models';
import { db as defaultDb } from '$lib/server/db';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

const DEFAULT_SETTINGS: Partial<CouncilSettings> = {
	defaultModels: [
		'anthropic/claude-3.5-sonnet',
		'openai/gpt-4o',
		'google/gemini-2.0-flash-001'
	],
	defaultSynthesizer: 'anthropic/claude-3.5-sonnet',
	streamingEnabled: true
};

export class SettingsRepository {
	protected db: BetterSQLite3Database<any>;

	constructor(db?: BetterSQLite3Database<any>) {
		this.db = (db as BetterSQLite3Database<any>) || defaultDb;
	}

	private mapToSettings(row: Record<string, unknown>): CouncilSettings {
		return {
			...row,
			openrouterApiKey: (row.openrouterApiKey as string) || undefined,
			defaultModels: (row.defaultModels as string[]) || DEFAULT_SETTINGS.defaultModels!,
			defaultSynthesizer: (row.defaultSynthesizer as string) || DEFAULT_SETTINGS.defaultSynthesizer!,
			customStage1Prompt: (row.customStage1Prompt as string) || undefined,
			customStage2Prompt: (row.customStage2Prompt as string) || undefined,
			customStage3Prompt: (row.customStage3Prompt as string) || undefined
		} as CouncilSettings;
	}

	async getByUserId(userId: string): Promise<CouncilSettings | null> {
		const result = await this.db
			.select()
			.from(councilSettings)
			.where(eq(councilSettings.userId, userId))
			.limit(1);

		return result[0] ? this.mapToSettings(result[0]) : null;
	}

	async getOrCreate(userId: string): Promise<CouncilSettings> {
		let settings = await this.getByUserId(userId);

		if (!settings) {
			const result = await this.db
				.insert(councilSettings)
				.values({
					userId,
					...DEFAULT_SETTINGS
				})
				.returning();

			settings = this.mapToSettings(result[0] as unknown as Record<string, unknown>);
		}

		return settings;
	}

	async update(userId: string, input: UpdateSettingsInput): Promise<CouncilSettings> {
		// Ensure settings exist first
		await this.getOrCreate(userId);

		const result = await this.db
			.update(councilSettings)
			.set({
				...input,
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(eq(councilSettings.userId, userId))
			.returning();

		return this.mapToSettings(result[0] as unknown as Record<string, unknown>);
	}

	async upsert(userId: string, input: UpdateSettingsInput): Promise<CouncilSettings> {
		const existing = await this.getByUserId(userId);

		if (existing) {
			return this.update(userId, input);
		}

		const result = await this.db
			.insert(councilSettings)
			.values({
				userId,
				...DEFAULT_SETTINGS,
				...input
			})
			.returning();

		return this.mapToSettings(result[0] as unknown as Record<string, unknown>);
	}
}
