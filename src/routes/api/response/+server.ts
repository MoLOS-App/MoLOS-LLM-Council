import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { z } from "zod";
import { PersonaRepository } from "../../../server/repositories/persona-repository";
import { createAIClient } from "../../../server/council/ai-client";
import { SettingsRepository } from "../../../server/repositories/settings-repository";
import { db } from "$lib/server/db";

const ResponseRequestSchema = z.object({
  personaId: z.string().min(1, "Persona ID is required"),
  query: z.string().min(1, "Query is required"),
  maxTokens: z.number().optional(),
});

/**
 * POST /api/MoLOS-LLM-Council/response
 * Get a single response from a persona
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const body = await request.json();
    const result = ResponseRequestSchema.safeParse(body);

    if (!result.success) {
      throw error(400, result.error.issues[0].message);
    }

    const { personaId, query, maxTokens } = result.data;

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
      tokens = settings.maxTokensStage1 ?? 1024;
    }

    // Create AI client and get response
    const client = createAIClient(
      persona.provider.type,
      persona.provider.apiToken,
      persona.provider.apiUrl,
    );

    const prompt = `${persona.personalityPrompt}\n\nUser: ${query}`;

    const content = await client.chat({
      model: persona.provider.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: tokens,
    });

    return json({
      success: true,
      response: {
        personaId: persona.id,
        personaName: persona.name,
        content,
      },
    });
  } catch (err) {
    console.error("[Council] Response error:", err);

    if (err instanceof Error) {
      // Parse API errors for better user feedback
      if (err.message.includes("API error")) {
        const apiErrorMatch = err.message.match(/API error: (.+) - (.+)/);
        if (apiErrorMatch) {
          const statusText = apiErrorMatch[1];
          const details = apiErrorMatch[2];

          // Check for OpenRouter privacy restrictions
          if (details.includes("guardrail restrictions") || details.includes("data policy")) {
            return json({
              success: false,
              error: "OpenRouter: No endpoints available with current privacy settings. Configure at: https://openrouter.ai/settings/privacy",
            });
          }

          // Check for ZAI balance issues
          if (details.includes("Insufficient balance") || details.includes("no resource package")) {
            return json({
              success: false,
              error: "ZAI API: Insufficient balance. Recharge at: https://z.ai/manage-apikey/billing",
            });
          }

          return json({
            success: false,
            error: `Provider API error: ${statusText}`,
          });
        }
      }

      // Timeout error
      if (err.message.includes("timed out")) {
        return json({
          success: false,
          error: err.message,
        });
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
