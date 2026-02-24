/**
 * Council Orchestrator
 * Manages the 3-stage AI consultation process
 */

import { OpenRouterClient, getModelDisplayName } from './openrouter-client';
import {
	buildStage1Prompt,
	buildStage2Prompt,
	buildStage3Prompt,
	DEFAULT_PROMPTS
} from './prompts';
import type {
	SSEEvent,
	CouncilStage,
	ModelRanking,
	CouncilSettings
} from '../../models';
import { SSEEventType } from '../../models';

export interface CouncilOrchestratorConfig {
	apiKey: string;
	models: string[];
	synthesizerModel: string;
	customPrompts?: {
		stage1?: string;
		stage2?: string;
		stage3?: string;
	};
}

export interface Stage1Result {
	modelId: string;
	content: string;
}

export interface Stage2Result {
	reviewerModelId: string;
	rankings: ModelRanking[];
}

export interface CouncilResult {
	stage1Responses: Stage1Result[];
	stage2Rankings: Stage2Result[];
	stage3Synthesis: string;
}

/**
 * Async generator event for streaming
 */
export type CouncilEvent = SSEEvent;

/**
 * Council Orchestrator Class
 */
export class CouncilOrchestrator {
	private client: OpenRouterClient;
	private config: CouncilOrchestratorConfig;

	constructor(config: CouncilOrchestratorConfig) {
		this.client = new OpenRouterClient(config.apiKey);
		this.config = config;
	}

	/**
	 * Run the full council process with streaming events
	 */
	async *runCouncil(query: string): AsyncGenerator<CouncilEvent> {
		const models = this.config.models;
		const synthesizerModel = this.config.synthesizerModel;

		// Store results
		const stage1Responses: Stage1Result[] = [];
		const stage2Rankings: Stage2Result[] = [];
		let stage3Content = '';

		try {
			// === STAGE 1: Initial Responses ===
			yield {
				type: SSEEventType.STAGE_START,
				stage: 'stage_1' as CouncilStage,
				models
			};

			// Run all models - stream each and yield events
			for (const modelId of models) {
				const prompt = buildStage1Prompt(query, this.config.customPrompts?.stage1);

				const stream = this.client.chatStream({
					model: modelId,
					messages: [{ role: 'user', content: prompt }],
					max_tokens: 4096
				});

				let content = '';

				// Stream text deltas
				for await (const delta of stream) {
					content += delta;
					yield {
						type: SSEEventType.TEXT_DELTA,
						modelId,
						delta,
						stage: 'stage_1' as CouncilStage
					};
				}

				// Yield complete event and store result
				stage1Responses.push({ modelId, content });

				yield {
					type: SSEEventType.MODEL_RESPONSE_COMPLETE,
					modelId,
					fullContent: content,
					stage: 'stage_1' as CouncilStage
				};
			}

			// === STAGE 2: Peer Rankings ===
			yield {
				type: SSEEventType.STAGE_START,
				stage: 'stage_2' as CouncilStage,
				models
			};

			// Each model ranks the responses
			for (const modelId of models) {
				try {
					const rankings = await this.runStage2Model(query, stage1Responses, modelId);

					stage2Rankings.push({
						reviewerModelId: modelId,
						rankings
					});

					yield {
						type: SSEEventType.RANKING_COMPLETE,
						modelId,
						rankings
					};
				} catch (error) {
					console.error(`Stage 2 failed for model ${modelId}:`, error);
					// Continue without rankings from this model
				}
			}

			// === STAGE 3: Synthesis ===
			yield {
				type: SSEEventType.STAGE_START,
				stage: 'stage_3' as CouncilStage,
				models: [synthesizerModel]
			};

			try {
				const synthesisStream = this.runStage3Stream(query, stage1Responses, stage2Rankings);

				for await (const delta of synthesisStream) {
					stage3Content += delta;
					yield {
						type: SSEEventType.SYNTHESIS_DELTA,
						delta
					};
				}
			} catch (error) {
				console.error('Stage 3 failed:', error);
				yield {
					type: SSEEventType.ERROR,
					message: `Synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
				};
			}

			// Done
			yield { type: SSEEventType.DONE };
		} catch (error) {
			yield {
				type: SSEEventType.ERROR,
				message: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Execute a single stage 1 model and return its full response
	 */
	private async executeStage1Model(query: string, modelId: string): Promise<Stage1Result> {
		const prompt = buildStage1Prompt(query, this.config.customPrompts?.stage1);

		const content = await this.client.chat({
			model: modelId,
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 4096
		});

		return { modelId, content };
	}

	/**
	 * Run stage 2 for a single model (get rankings)
	 */
	private async runStage2Model(
		query: string,
		responses: Stage1Result[],
		modelId: string
	): Promise<ModelRanking[]> {
		const responsesForPrompt = responses.map((r) => ({
			modelId: r.modelId,
			modelName: getModelDisplayName(r.modelId),
			content: r.content
		}));

		const prompt = buildStage2Prompt(query, responsesForPrompt, this.config.customPrompts?.stage2);

		const content = await this.client.chat({
			model: modelId,
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 2048
		});

		return this.client.parseRankingsResponse(content);
	}

	/**
	 * Run stage 3 synthesis with streaming
	 */
	private async *runStage3Stream(
		query: string,
		responses: Stage1Result[],
		rankings: Stage2Result[]
	): AsyncGenerator<string> {
		const responsesForPrompt = responses.map((r) => ({
			modelId: r.modelId,
			modelName: getModelDisplayName(r.modelId),
			content: r.content
		}));

		const rankingsForPrompt = rankings.map((r) => ({
			reviewerModelId: r.reviewerModelId,
			reviewerModelName: getModelDisplayName(r.reviewerModelId),
			rankings: r.rankings
		}));

		const prompt = buildStage3Prompt(
			query,
			responsesForPrompt,
			rankingsForPrompt,
			this.config.customPrompts?.stage3
		);

		yield* this.client.chatStream({
			model: this.config.synthesizerModel,
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 4096
		});
	}

	/**
	 * Run full council without streaming (returns final result)
	 */
	async runCouncilSync(query: string): Promise<CouncilResult> {
		const models = this.config.models;
		const stage1Responses: Stage1Result[] = [];
		const stage2Rankings: Stage2Result[] = [];

		// Stage 1: Get all responses in parallel
		const stage1Promises = models.map((modelId) => this.executeStage1Model(query, modelId));
		stage1Responses.push(...(await Promise.all(stage1Promises)));

		// Stage 2: Get rankings from each model
		const stage2Promises = models.map((modelId) =>
			this.runStage2Model(query, stage1Responses, modelId)
				.then((rankings) => ({ reviewerModelId: modelId, rankings }))
				.catch(() => ({ reviewerModelId: modelId, rankings: [] }))
		);
		stage2Rankings.push(...(await Promise.all(stage2Promises)));

		// Stage 3: Synthesis
		const responsesForPrompt = stage1Responses.map((r) => ({
			modelId: r.modelId,
			modelName: getModelDisplayName(r.modelId),
			content: r.content
		}));

		const rankingsForPrompt = stage2Rankings.map((r) => ({
			reviewerModelId: r.reviewerModelId,
			reviewerModelName: getModelDisplayName(r.reviewerModelId),
			rankings: r.rankings
		}));

		const prompt = buildStage3Prompt(
			query,
			responsesForPrompt,
			rankingsForPrompt,
			this.config.customPrompts?.stage3
		);

		const stage3Synthesis = await this.client.chat({
			model: this.config.synthesizerModel,
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 4096
		});

		return {
			stage1Responses,
			stage2Rankings,
			stage3Synthesis
		};
	}
}

/**
 * Factory function to create orchestrator from settings
 */
export function createOrchestrator(settings: CouncilSettings): CouncilOrchestrator {
	if (!settings.openrouterApiKey) {
		throw new Error('OpenRouter API key not configured');
	}

	return new CouncilOrchestrator({
		apiKey: settings.openrouterApiKey,
		models: settings.defaultModels,
		synthesizerModel: settings.defaultSynthesizer,
		customPrompts: {
			stage1: settings.customStage1Prompt,
			stage2: settings.customStage2Prompt,
			stage3: settings.customStage3Prompt
		}
	});
}
