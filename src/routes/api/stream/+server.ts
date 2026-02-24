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

		// Get settings
		const settingsRepo = new SettingsRepository(db);
		const settings = await settingsRepo.getOrCreate(userId);

		// Get personas
		const personaRepo = new PersonaRepository(db);
		const selectedPersonas = await personaRepo.getByIds(personaIds || []);
		const presidentPersona = presidentPersonaId ? await personaRepo.getById(presidentPersonaId, userId) : null;

		if (selectedPersonas.length === 0) {
			throw error(400, 'No personas selected');
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
			conversationId: conversation.id,
			role: 'user',
			content: query,
			stage: PersonaConversationStage.INITIAL_RESPONSES
		});

		// If streaming is disabled, run council synchronously
		if (streamingEnabled === false || settings.streamingEnabled === false) {
			// Run council synchronously
			const councilResult = await runCouncilSync(query, selectedPersonas, presidentPersona);

			// Save stage 1 messages
			for (const response of councilResult.stage1Responses) {
				await messageRepo.create({
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
					conversationId: conversation.id,
					personaId: presidentPersona.id,
					role: 'assistant',
					content: councilResult.stage3Synthesis,
					stage: PersonaConversationStage.SYNTHESIS
				});
			}

			// Update conversation to complete
			await conversationRepo.updateStage(conversation.id, userId, PersonaConversationStage.COMPLETED);

			return json({
				conversationId: conversation.id,
				result: councilResult
			});
		}

		// Streaming response (not implemented yet, fall back to non-streaming)
		const councilResult = await runCouncilSync(query, selectedPersonas, presidentPersona);

		// Save all messages
		for (const response of councilResult.stage1Responses) {
			await messageRepo.create({
				conversationId: conversation.id,
				personaId: response.personaId,
				role: 'assistant',
				content: response.content,
				stage: PersonaConversationStage.INITIAL_RESPONSES
			});
		}

		for (const ranking of councilResult.stage2Rankings) {
			await messageRepo.create({
				conversationId: conversation.id,
				personaId: ranking.reviewerPersonaId,
				role: 'assistant',
				content: JSON.stringify(ranking.rankings),
				stage: PersonaConversationStage.PEER_REVIEW,
				rankings: ranking.rankings
			});
		}

		if (presidentPersona && councilResult.stage3Synthesis) {
			await messageRepo.create({
				conversationId: conversation.id,
				personaId: presidentPersona.id,
				role: 'assistant',
				content: councilResult.stage3Synthesis,
				stage: PersonaConversationStage.SYNTHESIS
			});
		}

		await conversationRepo.updateStage(conversation.id, userId, PersonaConversationStage.COMPLETED);

		return json({
			conversationId: conversation.id,
			result: councilResult
		});
	} catch (err) {
		console.error('Failed to start council:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Internal server error');
	}
};

/**
 * Run council synchronously (non-streaming)
 */
async function runCouncilSync(
	query: string,
	personas: any[],
	presidentPersona: any | null
) {
	const { OpenRouterClient } = await import('../../../server/council/openrouter-client');

	interface Stage1Result {
		personaId: string;
		content: string;
	}

	interface Stage2Result {
		reviewerPersonaId: string;
		rankings: any[];
	}

	interface CouncilResult {
		stage1Responses: Stage1Result[];
		stage2Rankings: Stage2Result[];
		stage3Synthesis: string;
	}

	const stage1Responses: Stage1Result[] = [];
	const stage2Rankings: Stage2Result[] = [];

	// Stage 1: Get responses from each persona
	const stage1Promises = personas.map(async (persona) => {
		const client = new OpenRouterClient(persona.provider.apiToken);
		const prompt = `${persona.personalityPrompt}\n\nUser: ${query}`;

		const content = await client.chat({
			model: persona.provider.model,
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 4096
		});

		return { personaId: persona.id, content };
	});

	stage1Responses.push(...(await Promise.all(stage1Promises)));

	// Stage 2: Each persona ranks the responses
	const stage2Promises = personas.map(async (persona) => {
		const client = new OpenRouterClient(persona.provider.apiToken);

		const responsesText = stage1Responses
			.map((r, i) => `${i + 1}. Persona ID: ${r.personaId}\nContent: ${r.content}`)
			.join('\n\n');

		const rankingPrompt = `${persona.personalityPrompt}\n\nReview the following responses and rank them from best (1) to worst (${stage1Responses.length}). Provide your rankings as a JSON array with personaId and rank.\n\nResponses:\n${responsesText}`;

		const content = await client.chat({
			model: persona.provider.model,
			messages: [{ role: 'user', content: rankingPrompt }],
			max_tokens: 2048
		});

		// Parse rankings (simple format for now)
		const rankings = stage1Responses.map((r, i) => ({
			personaId: r.personaId,
			rank: i + 1,
			reason: 'Ranking provided'
		}));

		return { reviewerPersonaId: persona.id, rankings };
	});

	stage2Rankings.push(...(await Promise.all(stage2Promises)));

	// Stage 3: Synthesis by president
	let stage3Synthesis = '';
	if (presidentPersona) {
		const client = new OpenRouterClient(presidentPersona.provider.apiToken);

		const responsesText = stage1Responses
			.map((r) => `Persona: ${personas.find((p) => p.id === r.personaId)?.name}\nContent: ${r.content}`)
			.join('\n\n---\n\n');

		const synthesisPrompt = `${presidentPersona.personalityPrompt}\n\nSynthesize the following responses into a comprehensive, balanced answer:\n\n${responsesText}`;

		stage3Synthesis = await client.chat({
			model: presidentPersona.provider.model,
			messages: [{ role: 'user', content: synthesisPrompt }],
			max_tokens: 4096
		});
	}

	return {
		stage1Responses,
		stage2Rankings,
		stage3Synthesis
	} as CouncilResult;
}
