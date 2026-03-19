import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { SettingsRepository } from '../../../server/repositories/settings-repository';
import { ConversationRepository } from '../../../server/repositories/conversation-repository';
import { MessageRepository } from '../../../server/repositories/message-repository';
import { PersonaRepository } from '../../../server/repositories/persona-repository';
import { PersonaConversationStage, SSEEventType } from '../../../models';
import { db } from '$lib/server/db';
import type { CouncilEvent } from '../../../server/council/orchestrator';
import {
	runCouncilExecutor,
	validatePersonaProvider,
	DEFAULT_MAX_TOKENS,
	type CouncilExecutorConfig
} from '../../../server/council/council-executor';

const StartCouncilSchema = z.object({
	query: z.string().min(1, 'Query is required'),
	personaIds: z.array(z.string()).optional(),
	presidentPersonaId: z.string().optional(),
	conversationId: z.string().optional(),
	streamingEnabled: z.boolean().optional()
});

/**
 * POST /api/MoLOS-LLM-Council/stream
 * Start a council session with streaming events (non-streaming for now)
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

		const { query, personaIds, presidentPersonaId, conversationId, streamingEnabled } = result.data;

		console.log('[Council] Starting council with:', {
			query,
			personaIds,
			presidentPersonaId
		});

		// Get personas
		const personaRepo = new PersonaRepository(db);
		const selectedPersonas = await personaRepo.getByIds(personaIds || [], userId);
		const presidentPersona = presidentPersonaId
			? await personaRepo.getById(presidentPersonaId, userId)
			: null;

		console.log(
			'[Council] Found personas:',
			selectedPersonas.length,
			'president:',
			presidentPersona?.name
		);

		if (selectedPersonas.length === 0) {
			throw error(400, 'No personas selected or personas not found');
		}

		// Check that all personas have valid providers with API tokens
		for (const persona of selectedPersonas) {
			if (!persona.provider?.apiToken) {
				console.error('[Council] Persona missing provider/API token:', persona.name);
				throw error(
					400,
					`Persona "${persona.name}" has no configured provider or API token. Please configure providers in Settings.`
				);
			}

			// Check for ZAI configuration issues (warnings only, both endpoints are valid)
			if (persona.provider?.type === 'custom' && persona.provider?.apiUrl?.includes('api.z.ai')) {
				console.warn(
					'[Council] ZAI provider configured as type "custom". Should be type "zai" or "zai_coding" for better support.'
				);
			}

			// Warn about ZAI type/endpoint mismatches (both endpoints are valid!)
			const isCodingEndpoint = persona.provider?.apiUrl?.includes('/coding/paas/v4');
			if (persona.provider?.type === 'zai' && isCodingEndpoint) {
				console.warn(
					'[Council] Provider uses ZAI general type with coding endpoint. ' +
						'Consider changing to "Z.AI (Coding)" type for clarity.'
				);
			}
			if (
				persona.provider?.type === 'zai_coding' &&
				persona.provider?.apiUrl?.includes('/api/paas/v4') &&
				!isCodingEndpoint
			) {
				console.warn(
					'[Council] Provider uses ZAI Coding type with general endpoint. ' +
						'Consider changing to "Z.AI" type for clarity.'
				);
			}
		}

		if (presidentPersona && !presidentPersona.provider?.apiToken) {
			console.error('[Council] President missing provider/API token');
			throw error(
				400,
				'President persona has no configured provider or API token. Please configure providers in Settings.'
			);
		}

		// Check president for ZAI configuration issues (warnings only, both endpoints are valid)
		const presidentIsCodingEndpoint =
			presidentPersona?.provider?.apiUrl?.includes('/coding/paas/v4');
		if (presidentPersona?.provider?.type === 'zai' && presidentIsCodingEndpoint) {
			console.warn(
				'[Council] President provider uses ZAI general type with coding endpoint. ' +
					'Consider changing to "Z.AI (Coding)" type for clarity.'
			);
		}
		if (
			presidentPersona?.provider?.type === 'zai_coding' &&
			presidentPersona?.provider?.apiUrl?.includes('/api/paas/v4') &&
			!presidentIsCodingEndpoint
		) {
			console.warn(
				'[Council] President provider uses ZAI Coding type with general endpoint. ' +
					'Consider changing to "Z.AI" type for clarity.'
			);
		}

		// Get conversation repository
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
			conversation = await conversationRepo.create(
				userId,
				query,
				personaIds || [],
				presidentPersonaId
			);
		}

		// Save user message
		await messageRepo.create({
			userId,
			conversationId: conversation.id,
			role: 'user',
			content: query,
			stage: PersonaConversationStage.INITIAL_RESPONSES
		});

		// Run council synchronously (non-streaming only for now)
		if (true) {
			// Get settings for max tokens configuration
			const settingsRepo = new SettingsRepository(db);
			const settings = await settingsRepo.getOrCreate(userId);
			const councilConfig: CouncilExecutorConfig = {
				maxTokensStage1: settings.maxTokensStage1 ?? DEFAULT_MAX_TOKENS.stage1,
				maxTokensStage2: settings.maxTokensStage2 ?? DEFAULT_MAX_TOKENS.stage2,
				maxTokensStage3: settings.maxTokensStage3 ?? DEFAULT_MAX_TOKENS.stage3
			};

			console.log(
				`[Council] Running with max tokens - Stage1: ${councilConfig.maxTokensStage1}, Stage2: ${councilConfig.maxTokensStage2}, Stage3: ${councilConfig.maxTokensStage3}`
			);

			// Run council using shared executor (same as AI tools)
			const councilResult = await runCouncilExecutor(
				query,
				selectedPersonas,
				presidentPersona,
				councilConfig
			);

			// Save stage 1 messages
			for (const response of councilResult.stage1Responses) {
				await messageRepo.create({
					userId,
					conversationId: conversation.id,
					personaId: response.personaId,
					role: 'assistant',
					content: response.content,
					stage: PersonaConversationStage.INITIAL_RESPONSES
				});
			}

			// Save stage 2 rankings
			for (const ranking of councilResult.stage2Rankings) {
				await messageRepo.create({
					userId,
					conversationId: conversation.id,
					personaId: ranking.reviewerPersonaId,
					role: 'assistant',
					content: JSON.stringify(ranking.rankings),
					stage: PersonaConversationStage.PEER_REVIEW,
					rankings: ranking.rankings
				});
			}

			// Save stage 3 synthesis
			if (presidentPersona && councilResult.stage3Synthesis) {
				await messageRepo.create({
					userId,
					conversationId: conversation.id,
					personaId: presidentPersona.id,
					role: 'assistant',
					content: councilResult.stage3Synthesis,
					stage: PersonaConversationStage.SYNTHESIS
				});
			}

			// Update conversation to complete
			await conversationRepo.updateStage(
				conversation.id,
				userId,
				PersonaConversationStage.COMPLETED
			);

			return json({
				conversationId: conversation.id,
				result: councilResult
			});
		}

		// Note: Streaming response will be implemented in future versions
	} catch (err) {
		console.error('Failed to start council:', err);

		// Build error response for frontend to display as toast
		let errorResponse = {
			success: false,
			error: 'An unexpected error occurred'
		};

		if (err instanceof Error) {
			console.error('[Council] Error details:', err.message, err.stack);

			// Parse API errors for better user feedback
			if (err.message.includes('API error')) {
				const apiErrorMatch = err.message.match(/API error: (.+) - (.+)/);
				if (apiErrorMatch) {
					const statusText = apiErrorMatch[1];
					const details = apiErrorMatch[2];

					// Check for ZAI coding endpoint being used
					if (details.includes('/coding/paas/v4') || details.includes('path":"/v4"')) {
						console.error(
							'[Council] ZAI provider configured with coding endpoint. Should use chat endpoint.'
						);
						errorResponse = {
							success: false,
							error:
								'Invalid ZAI API URL. Please change provider type to "zai" or update API URL to: https://api.z.ai/api/paas/v4'
						};
					}
					// Check for ZAI specific errors
					else if (
						details.includes('Insufficient balance') ||
						details.includes('1113') ||
						details.includes('no resource package')
					) {
						console.error('[Council] ZAI API balance or package issue.');
						errorResponse = {
							success: false,
							error:
								'ZAI API: Insufficient balance or no active resource package. Please recharge at: https://z.ai/manage-apikey/billing'
						};
					} else if (details.includes('Too Many Requests') || details.includes('rate limit')) {
						console.error('[Council] Rate limit exceeded for ZAI provider.');
						errorResponse = {
							success: false,
							error: 'Rate limit exceeded. Please try again later.'
						};
					} else if (details.includes('token expired') || details.includes('401')) {
						console.error('[Council] Invalid or expired ZAI API token.');
						errorResponse = {
							success: false,
							error: 'Invalid or expired ZAI API token. Please check your provider credentials.'
						};
					}
					// Provide user-friendly messages based on error type
					else if (statusText.includes('Not Found') || details.includes('Not Found')) {
						console.error('[Council] API endpoint not found. Check provider configuration.');
						errorResponse = {
							success: false,
							error: 'Invalid provider API URL. Please check your provider settings.'
						};
					} else if (statusText.includes('Unauthorized') || details.includes('401')) {
						console.error('[Council] Invalid API key for provider.');
						errorResponse = {
							success: false,
							error: 'Invalid API key. Please check your provider credentials.'
						};
					} else if (statusText.includes('rate limit') || details.includes('429')) {
						console.error('[Council] Rate limit exceeded for provider.');
						errorResponse = {
							success: false,
							error: 'Rate limit exceeded. Please try again later.'
						};
					} else {
						errorResponse = {
							success: false,
							error: `Provider API error: ${statusText}`
						};
					}
				}
			}

			// Check for missing API key or URL
			else if (
				err.message.includes('API key is not configured') ||
				err.message.includes('API URL is not configured')
			) {
				console.error(
					'[Council] Provider not properly configured. Please check provider settings.'
				);
				errorResponse = {
					success: false,
					error: 'Provider not configured. Please check your provider API key and URL in Settings.'
				};
			}
			// Other errors
			else {
				errorResponse = {
					success: false,
					error: err.message || 'An unexpected error occurred'
				};
			}
		}

		// Return error response (200 OK) so frontend can show toast without getting stuck
		return json(errorResponse);
	}
};
