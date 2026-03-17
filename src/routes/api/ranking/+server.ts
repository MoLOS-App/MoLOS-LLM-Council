import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { z } from "zod";
import { PersonaRepository } from "../../../server/repositories/persona-repository";
import { createAIClient } from "../../../server/council/ai-client";
import { SettingsRepository } from "../../../server/repositories/settings-repository";
import { db } from "$lib/server/db";
import type { Stage1Result } from "../../../server/council/council-executor";

const RankingRequestSchema = z.object({
  personaId: z.string().min(1, "Persona ID is required"),
  responses: z.array(z.object({
    personaId: z.string(),
    personaName: z.string(),
    content: z.string(),
  })).min(1, "At least one response is required"),
  maxTokens: z.number().optional(),
});

/**
 * POST /api/MoLOS-LLM-Council/ranking
 * Get a ranking from a persona for the given responses
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const body = await request.json();
    const result = RankingRequestSchema.safeParse(body);

    if (!result.success) {
      throw error(400, result.error.issues[0].message);
    }

    const { personaId, responses, maxTokens } = result.data;

    // Get persona with provider
    const personaRepo = new PersonaRepository(db);
    const persona = await personaRepo.getById(personaId, userId);

    if (!persona) {
      throw error(404, "Persona not found");
    }

    if (!persona.provider?.apiToken) {
      throw error(400, "Persona has no configured provider or API token");
    }

    // Get settings for max tokens if not provided
    let tokens = maxTokens;
    if (!tokens) {
      const settingsRepo = new SettingsRepository(db);
      const settings = await settingsRepo.getOrCreate(userId);
      tokens = settings.maxTokensStage2 ?? 512;
    }

    // Create AI client and get ranking
    const client = createAIClient(
      persona.provider.type,
      persona.provider.apiToken,
      persona.provider.apiUrl,
    );

    const responsesText = responses
      .map((r, i) => `${i + 1}. Persona: ${r.personaName}\nContent: ${r.content}`)
      .join("\n\n---\n\n");

    const rankingPrompt = `${persona.personalityPrompt}

Review the following responses and provide a brief evaluation of each. Focus on:
1. Quality of reasoning
2. Clarity of explanation
3. Practical usefulness

Responses:
${responsesText}`;

    const content = await client.chat({
      model: persona.provider.model,
      messages: [{ role: "user", content: rankingPrompt }],
      max_tokens: tokens,
    });

    // Create simplified rankings
    const rankings = responses.map((r, i) => ({
      personaId: r.personaId,
      rank: i + 1,
      reason: "Evaluation provided in review",
    }));

    return json({
      success: true,
      ranking: {
        reviewerPersonaId: persona.id,
        reviewerPersonaName: persona.name,
        rankings,
        review: content,
      },
    });
  } catch (err) {
    console.error("[Council] Ranking error:", err);

    if (err instanceof Error) {
      // Parse API errors for better user feedback
      if (err.message.includes("API error")) {
        const apiErrorMatch = err.message.match(/API error: (.+) - (.+)/);
        if (apiErrorMatch) {
          const statusText = apiErrorMatch[1];
          const details = apiErrorMatch[2];

          if (details.includes("guardrail restrictions") || details.includes("data policy")) {
            return json({
              success: false,
              error: "OpenRouter: No endpoints available with current privacy settings.",
            });
          }

          return json({
            success: false,
            error: `Provider API error: ${statusText}`,
          });
        }
      }

      return json({
        success: false,
        error: err.message,
      });
    }

    return json({
      success: false,
      error: "An unexpected error occurred",
    });
  }
};
