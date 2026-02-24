import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { councilConversations, councilMessages } from '../database/schema';
import { ProviderRepository } from '../repositories/provider-repository';
import { PersonaRepository } from '../repositories/persona-repository';
import { createProviderClient } from '../providers/factory';
import { PersonaConversationStage } from '../../models';

interface CouncilRequest {
	query: string;
	selectedPersonaIds: string[];
	presidentPersonaId: string | null;
}

interface SSEEvent {
	type: 'meta' | 'stage_start' | 'text_delta' | 'rankings_complete' | 'synthesis_delta' | 'error' | 'done';
	data?: any;
}

export async function* orchestrateCouncil(
	userId: string,
	request: CouncilRequest,
	onChunk: (event: SSEEvent) => void
) {
	const { query, selectedPersonaIds, presidentPersonaId } = request;

	const personaRepo = new PersonaRepository();
	const providerRepo = new ProviderRepository();

	const personas = await personaRepo.getByIds(selectedPersonaIds);

	if (personas.length === 0) {
		throw new Error('No personas selected');
	}

	const president = presidentPersonaId ? personas.find((p) => p.id === presidentPersonaId) : personas[0];

	if (!president) {
		throw new Error('President not found');
	}

	onChunk({ type: 'meta', data: { personasCount: personas.length, presidentId: president.id } });

	const conversation = await db
		.insert(councilConversations)
		.values({
			userId,
			query,
			stage: PersonaConversationStage.INITIAL_RESPONSES,
			selectedPersonaIds,
			presidentPersonaId,
			tags: [],
			createdAt: Math.floor(Date.now() / 1000),
			updatedAt: Math.floor(Date.now() / 1000)
		})
		.returning();
	const convId = conversation[0].id;

	await db.insert(councilMessages).values({
		id: crypto.randomUUID(),
		conversationId: convId,
		personaId: null,
		stage: PersonaConversationStage.INITIAL_RESPONSES,
		role: 'user',
		content: query,
		rankings: null,
		createdAt: Math.floor(Date.now() / 1000)
	});

	const stage1Responses: Map<string, string> = new Map();

	onChunk({ type: 'stage_start', data: { stage: 'initial_responses' } });

	for (const persona of personas) {
		const provider = await providerRepo.getById(persona.providerId, userId);
		if (!provider) {
			continue;
		}

		const client = createProviderClient(provider);

		const messageId = crypto.randomUUID();
		await db.insert(councilMessages).values({
			id: messageId,
			conversationId: convId,
			personaId: persona.id,
			stage: PersonaConversationStage.INITIAL_RESPONSES,
			role: 'assistant',
			content: '',
			rankings: null,
			createdAt: Math.floor(Date.now() / 1000)
		});

		let fullResponse = '';

		await client.streamCompletion(
			[
				{ role: 'system', content: persona.personalityPrompt },
				{ role: 'user', content: query }
			],
			(chunk) => {
				fullResponse += chunk;
				onChunk({
					type: 'text_delta',
					data: { personaId: persona.id, delta: chunk, avatar: persona.avatar }
				});
			}
		);

		stage1Responses.set(persona.id, fullResponse);

		await db
			.update(councilMessages)
			.set({ content: fullResponse })
			.where(eq(councilMessages.id, messageId));
	}

	await db
		.update(councilConversations)
		.set({ stage: PersonaConversationStage.PEER_REVIEW, updatedAt: Math.floor(Date.now() / 1000) })
		.where(eq(councilConversations.id, convId));

	onChunk({ type: 'stage_start', data: { stage: 'peer_review' } });

	for (const reviewer of personas) {
		const provider = await providerRepo.getById(reviewer.providerId, userId);
		if (!provider) continue;

		const client = createProviderClient(provider);

		const reviewPrompt = buildReviewPrompt(stage1Responses, reviewer);

		const messageId = crypto.randomUUID();
		await db.insert(councilMessages).values({
			id: messageId,
			conversationId: convId,
			personaId: reviewer.id,
			stage: PersonaConversationStage.PEER_REVIEW,
			role: 'assistant',
			content: '',
			rankings: null,
			createdAt: Math.floor(Date.now() / 1000)
		});

		let fullReview = '';
		const rankings: Array<{ personaId: string; rank: number; reason: string }> = [];

		await client.streamCompletion(
			[
				{ role: 'system', content: reviewer.personalityPrompt },
				{ role: 'user', content: reviewPrompt }
			],
			(chunk) => {
				fullReview += chunk;
			}
		);

		const parsedRankings = parseRankings(fullReview);
		rankings.push(...parsedRankings);

		await db
			.update(councilMessages)
			.set({ content: fullReview, rankings: parsedRankings })
			.where(eq(councilMessages.id, messageId));

		onChunk({
			type: 'rankings_complete',
			data: { reviewerId: reviewer.id, rankings: parsedRankings, avatar: reviewer.avatar }
		});
	}

	await db
		.update(councilConversations)
		.set({ stage: PersonaConversationStage.SYNTHESIS, updatedAt: Math.floor(Date.now() / 1000) })
		.where(eq(councilConversations.id, convId));

	onChunk({ type: 'stage_start', data: { stage: 'synthesis' } });

	const presidentProvider = await providerRepo.getById(president.providerId, userId);
	if (!presidentProvider) {
		throw new Error('President provider not found');
	}

	const presidentClient = createProviderClient(presidentProvider);

	const synthesisPrompt = buildSynthesisPrompt(stage1Responses);

	const messageId = crypto.randomUUID();
	await db.insert(councilMessages).values({
		id: messageId,
		conversationId: convId,
		personaId: president.id,
		stage: PersonaConversationStage.SYNTHESIS,
		role: 'assistant',
		content: '',
		rankings: null,
		createdAt: Math.floor(Date.now() / 1000)
	});

	let fullSynthesis = '';

	await presidentClient.streamCompletion(
		[
			{ role: 'system', content: president.personalityPrompt },
			{ role: 'user', content: synthesisPrompt }
		],
		(chunk) => {
			fullSynthesis += chunk;
			onChunk({
				type: 'synthesis_delta',
				data: { delta: chunk, avatar: president.avatar }
			});
		}
	);

	await db
		.update(councilMessages)
		.set({ content: fullSynthesis })
		.where(eq(councilMessages.id, messageId));

	await db
		.update(councilConversations)
		.set({
			stage: PersonaConversationStage.COMPLETED,
			decisionSummary: fullSynthesis.slice(0, 500),
			updatedAt: Math.floor(Date.now() / 1000)
		})
		.where(eq(councilConversations.id, convId));

	onChunk({ type: 'done', data: { conversationId: convId, summary: fullSynthesis.slice(0, 500) } });
}

function buildReviewPrompt(responses: Map<string, string>, reviewer: any): string {
	let prompt = `Review the following responses to a council query from your unique perspective as ${reviewer.name}. `;
	prompt += `Your role: ${reviewer.description}\n\n`;
	prompt += `Please rank these responses (1=best to N=worst) and provide reasoning:\n\n`;

	let index = 1;
	for (const [personaId, response] of responses.entries()) {
		prompt += `Response ${index}:\n${response}\n\n`;
		index++;
	}

	prompt +=
		'Provide your rankings in this JSON format:\n[{"personaId": "...", "rank": 1, "reason": "..."}]';

	return prompt;
}

function buildSynthesisPrompt(responses: Map<string, string>): string {
	let prompt = 'As the Council President, synthesize the following council responses into a comprehensive, balanced recommendation.\n\n';

	prompt += 'Responses:\n';
	for (const [personaId, response] of responses.entries()) {
		prompt += `-${response}\n\n`;
	}

	prompt += 'Provide a synthesis that:\n1. Identifies key themes and consensus points\n2. Highlights important divergences\n3. Offers actionable recommendations\n4. Considers different perspectives';

	return prompt;
}

function parseRankings(text: string): Array<{ personaId: string; rank: number; reason: string }> {
	try {
		const jsonMatch = text.match(/\[[\s\S]*\]/);
		if (!jsonMatch) return [];

		const parsed = JSON.parse(jsonMatch[0]);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
