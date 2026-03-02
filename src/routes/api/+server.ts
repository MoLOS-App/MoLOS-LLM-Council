import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { z } from "zod";
import { ConversationRepository } from "../../server/repositories/conversation-repository";
import { MessageRepository } from "../../server/repositories/message-repository";
import { PersonaConversationStage, MessageRole } from "../../models";
import { db } from "$lib/server/db";

// Validation schemas
const CreateConversationSchema = z.object({
  query: z.string().min(1, "Query is required"),
  selectedPersonaIds: z
    .array(z.string())
    .min(1, "At least one persona is required"),
  presidentPersonaId: z.string().optional(),
  title: z.string().optional(),
});

const UpdateConversationSchema = z.object({
  id: z.string().min(1, "Conversation ID is required"),
  stage: z
    .enum(["initial_responses", "peer_review", "synthesis", "completed"])
    .optional(),
  decisionSummary: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/MoLOS-LLM-Council
 * Returns conversations for the authenticated user
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  const conversationId = url.searchParams.get("conversationId");
  const conversationRepo = new ConversationRepository(db);
  const messageRepo = new MessageRepository(db);

  try {
    if (conversationId) {
      // Get specific conversation with messages
      const conversation = await conversationRepo.getById(
        conversationId,
        userId,
      );
      if (!conversation) {
        throw error(404, "Conversation not found");
      }

      const messages = await messageRepo.getByConversationId(conversationId);

      return json({ conversation, messages });
    }

    // Get all conversations
    const conversations = await conversationRepo.getByUserId(userId, 50);
    return json({ conversations });
  } catch (err) {
    console.error("Failed to fetch council data:", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Internal server error");
  }
};

/**
 * POST /api/MoLOS-LLM-Council
 * Create a new conversation (persona-based)
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const body = await request.json();
    const result = CreateConversationSchema.safeParse(body);

    if (!result.success) {
      throw error(400, result.error.issues[0].message);
    }

    const { query, selectedPersonaIds, presidentPersonaId, title } =
      result.data;

    const conversationRepo = new ConversationRepository(db);
    const conversation = await conversationRepo.create(
      userId,
      query,
      selectedPersonaIds,
      presidentPersonaId,
    );

    return json({ conversation }, { status: 201 });
  } catch (err) {
    console.error("Failed to create conversation:", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Internal server error");
  }
};

/**
 * PUT /api/MoLOS-LLM-Council
 * Update a conversation
 */
export const PUT: RequestHandler = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const body = await request.json();
    const result = UpdateConversationSchema.safeParse(body);

    if (!result.success) {
      throw error(400, result.error.issues[0].message);
    }

    const { id, stage, decisionSummary, tags } = result.data;

    const conversationRepo = new ConversationRepository(db);

    if (stage) {
      // Update stage
      const conversation = await conversationRepo.updateStage(
        id,
        userId,
        stage as PersonaConversationStage,
      );
      if (!conversation) {
        throw error(404, "Conversation not found");
      }
      return json({ conversation });
    }

    if (decisionSummary !== undefined || tags) {
      // Update other fields
      const conversation = await conversationRepo.update(id, userId, {
        decisionSummary,
        tags: tags ? JSON.stringify(tags) : undefined,
      });
      if (!conversation) {
        throw error(404, "Conversation not found");
      }
      return json({ conversation });
    }

    throw error(400, "No valid update fields provided");
  } catch (err) {
    console.error("Failed to update conversation:", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Internal server error");
  }
};

/**
 * DELETE /api/MoLOS-LLM-Council
 * Delete a conversation
 */
export const DELETE: RequestHandler = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const { id } = await request.json();

    if (!id) {
      throw error(400, "Conversation ID is required");
    }

    const conversationRepo = new ConversationRepository(db);
    const deleted = await conversationRepo.delete(id, userId);

    if (!deleted) {
      throw error(404, "Conversation not found");
    }

    return json({ success: true });
  } catch (err) {
    console.error("Failed to delete conversation:", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Internal server error");
  }
};
