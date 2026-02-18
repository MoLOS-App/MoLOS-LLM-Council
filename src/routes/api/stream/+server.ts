import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { SettingsRepository } from '../../../server/repositories/settings-repository';
import { ConversationRepository } from '../../../server/repositories/conversation-repository';
import { MessageRepository } from '../../../server/repositories/message-repository';
import { CouncilOrchestrator, createOrchestrator } from '../../../server/council/orchestrator';
import { CouncilStage, MessageRole, SSEEventType } from '../../../models';
import { db } from '$lib/server/db';
import type { CouncilEvent } from '../../../server/council/orchestrator';

const StartCouncilSchema = z.object({
	query: z.string().min(1, 'Query is required'),
	models: z.array(z.string()).optional(),
	synthesizerModel: z.string().optional(),
	conversationId: z.string().optional()
});

/**
 * POST /api/MoLOS-LLM-Council/stream
 * Start a council session with streaming events
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const result = StartCouncilSchema.safeParse(body);

		if (!result.success) {
			throw error(400, result.error.issues[0].message);
		}

		const { query, models, synthesizerModel, conversationId } = result.data;

		// Get settings
		const settingsRepo = new SettingsRepository(db);
		const settings = await settingsRepo.getOrCreate(userId);

		if (!settings.openrouterApiKey) {
			throw error(400, 'OpenRouter API key not configured. Please add it in settings.');
		}

		// Get or create conversation
		const conversationRepo = new ConversationRepository(db);
		const messageRepo = new MessageRepository(db);

		let conversation;
		if (conversationId) {
			conversation = await conversationRepo.getById(conversationId, userId);
			if (!conversation) {
				throw error(404, 'Conversation not found');
			}
		} else {
			// Create new conversation
			const title = query.substring(0, 50) + (query.length > 50 ? '...' : '');
			conversation = await conversationRepo.create(userId, {
				title,
				currentStage: CouncilStage.STAGE_1,
				selectedModels: models || settings.defaultModels,
				synthesizerModel: synthesizerModel || settings.defaultSynthesizer
			});
		}

		// Save user message
		await messageRepo.create({
			conversationId: conversation.id,
			userId,
			role: MessageRole.USER,
			content: query,
			stage: CouncilStage.STAGE_1
		});

		// Create orchestrator
		const orchestrator = new CouncilOrchestrator({
			apiKey: settings.openrouterApiKey,
			models: conversation.selectedModels,
			synthesizerModel: conversation.synthesizerModel,
			customPrompts: {
				stage1: settings.customStage1Prompt,
				stage2: settings.customStage2Prompt,
				stage3: settings.customStage3Prompt
			}
		});

		// Check if streaming is enabled
		const shouldStream = settings.streamingEnabled;

		if (!shouldStream) {
			// Non-streaming response
			const councilResult = await orchestrator.runCouncilSync(query);

			// Save stage 1 responses
			for (const response of councilResult.stage1Responses) {
				await messageRepo.create({
					conversationId: conversation.id,
					userId,
					role: MessageRole.ASSISTANT,
					content: response.content,
					modelId: response.modelId,
					stage: CouncilStage.STAGE_1
				});
			}

			// Save stage 2 rankings
			for (const ranking of councilResult.stage2Rankings) {
				await messageRepo.create({
					conversationId: conversation.id,
					userId,
					role: MessageRole.ASSISTANT,
					content: JSON.stringify(ranking.rankings),
					modelId: ranking.reviewerModelId,
					stage: CouncilStage.STAGE_2,
					rankings: ranking.rankings
				});
			}

			// Save stage 3 synthesis
			await messageRepo.create({
				conversationId: conversation.id,
				userId,
				role: MessageRole.ASSISTANT,
				content: councilResult.stage3Synthesis,
				modelId: conversation.synthesizerModel,
				stage: CouncilStage.STAGE_3
			});

			// Update conversation to complete
			await conversationRepo.updateStage(conversation.id, userId, CouncilStage.COMPLETE);

			return json({
				conversationId: conversation.id,
				result: councilResult
			});
		}

		// Streaming response
		const encoder = new TextEncoder();
		let streamClosed = false;

		// Track content for saving
		const stage1Contents: Map<string, string> = new Map();
		const stage2Rankings: Array<{ reviewerModelId: string; rankings: any[] }> = [];
		let stage3Content = '';

		const stream = new ReadableStream({
			async start(controller) {
				const safeEnqueue = (data: Uint8Array) => {
					if (!streamClosed) {
						try {
							controller.enqueue(data);
						} catch (e) {
							streamClosed = true;
						}
					}
				};

				const sendEvent = (event: CouncilEvent) => {
					safeEnqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
				};

				try {
					// Send conversation ID first
					sendEvent({
						type: SSEEventType.META,
						conversationId: conversation!.id
					});

					// Run council with streaming
					for await (const event of orchestrator.runCouncil(query)) {
						sendEvent(event);

						// Track content for saving
						if (event.type === SSEEventType.TEXT_DELTA && 'modelId' in event && 'delta' in event) {
							const modelId = event.modelId as string;
							const delta = event.delta as string;

							if (event.stage === 'stage_1') {
								const existing = stage1Contents.get(modelId) || '';
								stage1Contents.set(modelId, existing + delta);
							} else if (event.stage === 'stage_3') {
								stage3Content += delta;
							}
						}

						if (event.type === SSEEventType.SYNTHESIS_DELTA && 'delta' in event) {
							stage3Content += event.delta as string;
						}

						if (event.type === SSEEventType.RANKING_COMPLETE && 'modelId' in event && 'rankings' in event) {
							stage2Rankings.push({
								reviewerModelId: event.modelId as string,
								rankings: event.rankings as any[]
							});
						}
					}

					// Save all messages to database
					// Stage 1 responses
					for (const [modelId, content] of stage1Contents) {
						await messageRepo.create({
							conversationId: conversation!.id,
							userId,
							role: MessageRole.ASSISTANT,
							content,
							modelId,
							stage: CouncilStage.STAGE_1
						});
					}

					// Stage 2 rankings
					for (const ranking of stage2Rankings) {
						await messageRepo.create({
							conversationId: conversation!.id,
							userId,
							role: MessageRole.ASSISTANT,
							content: JSON.stringify(ranking.rankings),
							modelId: ranking.reviewerModelId,
							stage: CouncilStage.STAGE_2,
							rankings: ranking.rankings
						});
					}

					// Stage 3 synthesis
					if (stage3Content) {
						await messageRepo.create({
							conversationId: conversation!.id,
							userId,
							role: MessageRole.ASSISTANT,
							content: stage3Content,
							modelId: conversation!.synthesizerModel,
							stage: CouncilStage.STAGE_3
						});
					}

					// Update conversation stage
					await conversationRepo.updateStage(conversation!.id, userId, CouncilStage.COMPLETE);

					// Send done
					safeEnqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				} catch (err) {
					console.error('Council streaming error:', err);
					sendEvent({
						type: SSEEventType.ERROR,
						message: err instanceof Error ? err.message : 'Unknown error'
					});
					safeEnqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no'
			}
		});
	} catch (err) {
		console.error('Failed to start council:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Internal server error');
	}
};
