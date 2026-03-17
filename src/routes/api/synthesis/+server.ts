import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { z } from "zod";
import { PersonaRepository } from "../../../server/repositories/persona-repository";
import { createAIClient } from "../../../server/council/ai-client";
import { SettingsRepository } from "../../../server/repositories/settings-repository";
import { db } from "$lib/server/db";

const SynthesisRequestSchema = z.object({
  presidentPersonaId: z.string().min(1, "President Persona ID is required"),
  responses: z.array(z.object({
    personaId: z.string(),
    personaName: z.string(),
    content: z.string(),
  })).min(1, "At least one response is required"),
  maxTokens: z.number().optional(),
});

/**
 * POST /api/MoLOS-LLM-Council/synthesis
 * Get a synthesis from the president persona
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const body = await request.json();
    const result = SynthesisRequestSchema.safeParse(body);

    if (!result.success) {
      throw error(400, result.error.issues[0].message);
    }

    const { presidentPersonaId, responses, maxTokens } = result.data;

    // Get president persona with provider
    const personaRepo = new PersonaRepository(db);
    const president = await personaRepo.getById(presidentPersonaId, userId);

    if (!president) {
      throw error(404, "President persona not found");
    }

    if (!president.provider?.apiToken) {
      throw error(400, "President persona has no configured provider or API token");
    }

    // Get settings for max tokens if not provided
    let tokens = maxTokens;
    if (!tokens) {
      const settingsRepo = new SettingsRepository(db);
      const settings = await settingsRepo.getOrCreate(userId);
      tokens = settings.maxTokensStage3 ?? 4096;
    }

    // Create AI client and get synthesis
    const client = createAIClient(
      president.provider.type,
      president.provider.apiToken,
      president.provider.apiUrl,
    );

    const responsesText = responses
      .map((r) => `**${r.personaName}:**\n${r.content}`)
      .join("\n\n---\n\n");

    const synthesisPrompt = `${president.personalityPrompt}

Synthesize the following council responses into a comprehensive, balanced answer. Highlight:
1. Key areas of consensus
2. Important disagreements or alternative perspectives
3. Actionable recommendations

Council Responses:
${responsesText}`;

    const content = await client.chat({
      model: president.provider.model,
      messages: [{ role: "user", content: synthesisPrompt }],
      max_tokens: tokens,
    });

    return json({
      success: true,
      synthesis: content,
    });
  } catch (err) {
    console.error("[Council] Synthesis error:", err);

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
