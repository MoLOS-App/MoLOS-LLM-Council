import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { ConversationRepository } from '../../server/repositories/conversation-repository';
import { MessageRepository } from '../../server/repositories/message-repository';
import { SettingsRepository } from '../../server/repositories/settings-repository';
import { CouncilStage, MessageRole } from '../../models';
import { db } from '$lib/server/db';

// Validation schemas
const CreateConversationSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	selectedModels: z.array(z.string()).min(1, 'At least one model is required'),
	synthesizerModel: z.string().optional()
});

const UpdateConversationSchema = z.object({
	id: z.string().min(1, 'Conversation ID is required'),
	title: z.string().optional(),
	selectedModels: z.array(z.string()).optional(),
	synthesizerModel: z.string().optional()
});

/**
 * GET /api/MoLOS-LLM-Council
 * Returns conversations for the authenticated user
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const conversationId = url.searchParams.get('conversationId');
	const conversationRepo = new ConversationRepository(db);
	const messageRepo = new MessageRepository(db);

	try {
		if (conversationId) {
			// Get specific conversation with messages
			const conversation = await conversationRepo.getById(conversationId, userId);
			if (!conversation) {
				throw error(404, 'Conversation not found');
			}

			const messages = await messageRepo.getByConversationId(conversationId, userId);

			return json({ conversation, messages });
		}

		// Get all conversations
		const conversations = await conversationRepo.getByUserId(userId, 50);
		return json({ conversations });
	} catch (err) {
		console.error('Failed to fetch council data:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Internal server error');
	}
};

/**
 * POST /api/MoLOS-LLM-Council
 * Create a new conversation
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const result = CreateConversationSchema.safeParse(body);

		if (!result.success) {
			throw error(400, result.error.issues[0].message);
		}

		const settingsRepo = new SettingsRepository(db);
		const settings = await settingsRepo.getOrCreate(userId);

		const conversationRepo = new ConversationRepository(db);
		const conversation = await conversationRepo.create(userId, {
			title: result.data.title,
			currentStage: CouncilStage.STAGE_1,
			selectedModels: result.data.selectedModels,
			synthesizerModel: result.data.synthesizerModel || settings.defaultSynthesizer
		});

		return json({ conversation }, { status: 201 });
	} catch (err) {
		console.error('Failed to create conversation:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Internal server error');
	}
};

/**
 * PUT /api/MoLOS-LLM-Council
 * Update a conversation
 */
export const PUT: RequestHandler = async ({ locals, request }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const result = UpdateConversationSchema.safeParse(body);

		if (!result.success) {
			throw error(400, result.error.issues[0].message);
		}

		const { id, ...updates } = result.data;

		const conversationRepo = new ConversationRepository(db);
		const conversation = await conversationRepo.update(id, userId, updates);

		if (!conversation) {
			throw error(404, 'Conversation not found');
		}

		return json({ conversation });
	} catch (err) {
		console.error('Failed to update conversation:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Internal server error');
	}
};

/**
 * DELETE /api/MoLOS-LLM-Council
 * Delete a conversation
 */
export const DELETE: RequestHandler = async ({ locals, request }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const { id } = await request.json();

		if (!id) {
			throw error(400, 'Conversation ID is required');
		}

		const conversationRepo = new ConversationRepository(db);
		const deleted = await conversationRepo.delete(id, userId);

		if (!deleted) {
			throw error(404, 'Conversation not found');
		}

		return json({ success: true });
	} catch (err) {
		console.error('Failed to delete conversation:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Internal server error');
	}
};
