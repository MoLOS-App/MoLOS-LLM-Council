import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { z } from "zod";
import type { SearchResult } from "@molos/core/types/search";
import { ConversationRepository } from "../../../server/repositories/conversation-repository";
import { MessageRepository } from "../../../server/repositories/message-repository";
import { db } from "$lib/server/db";

const SearchSchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const moduleId = "MoLOS-LLM-Council";
const moduleName = "LLM Council";

const buildSnippet = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 140).trim()}...`;
};

const toMs = (value?: number | null) => (value ? value * 1000 : undefined);

export const GET: RequestHandler = async ({ locals, url }) => {
  const userId = locals.user?.id;
  if (!userId) throw error(401, "Unauthorized");

  const parsed = SearchSchema.safeParse({
    q: url.searchParams.get("q"),
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    throw error(400, parsed.error.issues[0]?.message ?? "Invalid query");
  }

  const { q, limit } = parsed.data;
  const perTypeLimit = Math.min(20, limit ?? 20);

  const conversationRepo = new ConversationRepository(db);
  const messageRepo = new MessageRepository(db);

  const [conversations, messages] = await Promise.all([
    conversationRepo.searchByUserId(userId, q, perTypeLimit),
    messageRepo.searchByUserId(userId, q, perTypeLimit),
  ]);

  const results: SearchResult[] = [
    ...conversations.map((conv) => ({
      moduleId,
      moduleName,
      entityType: "conversation",
      entityId: conv.id,
      title: conv.title,
      snippet: undefined,
      href: `/ui/MoLOS-LLM-Council?conversation=${conv.id}`,
      updatedAt: toMs(conv.updatedAt),
    })),
    ...messages.map((msg) => ({
      moduleId,
      moduleName,
      entityType: "message",
      entityId: msg.id,
      title: msg.modelId ? `Message from ${msg.modelId}` : "Message",
      snippet: buildSnippet(msg.content),
      href: `/ui/MoLOS-LLM-Council?conversation=${msg.conversationId}`,
      updatedAt: toMs(msg.createdAt),
    })),
  ];

  return json({ query: q, results, total: results.length });
};
