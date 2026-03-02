import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { z } from "zod";
import { SettingsRepository } from "../../../server/repositories/settings-repository";
import { OpenRouterClient } from "../../../server/council/openrouter-client";
import { db } from "$lib/server/db";

const UpdateSettingsSchema = z.object({
  openrouterApiKey: z.string().optional(),
  defaultModels: z.array(z.string()).optional(),
  defaultSynthesizer: z.string().optional(),
  customStage1Prompt: z.string().optional(),
  customStage2Prompt: z.string().optional(),
  customStage3Prompt: z.string().optional(),
  streamingEnabled: z.boolean().optional(),
});

/**
 * GET /api/MoLOS-LLM-Council/settings
 * Get user settings
 */
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const settingsRepo = new SettingsRepository(db);
    const settings = await settingsRepo.getOrCreate(userId);

    // Don't expose the full API key
    const safeSettings = {
      ...settings,
      openrouterApiKey: settings.openrouterApiKey
        ? `${settings.openrouterApiKey.substring(0, 8)}...${settings.openrouterApiKey.slice(-4)}`
        : undefined,
      hasApiKey: !!settings.openrouterApiKey,
    };

    return json(safeSettings);
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    throw error(500, "Internal server error");
  }
};

/**
 * PUT /api/MoLOS-LLM-Council/settings
 * Update user settings
 */
export const PUT: RequestHandler = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const body = await request.json();
    const result = UpdateSettingsSchema.safeParse(body);

    if (!result.success) {
      throw error(400, result.error.issues[0].message);
    }

    const settingsRepo = new SettingsRepository(db);
    const settings = await settingsRepo.update(userId, result.data);

    // Safe response
    const safeSettings = {
      ...settings,
      openrouterApiKey: settings.openrouterApiKey
        ? `${settings.openrouterApiKey.substring(0, 8)}...${settings.openrouterApiKey.slice(-4)}`
        : undefined,
      hasApiKey: !!settings.openrouterApiKey,
    };

    return json(safeSettings);
  } catch (err) {
    console.error("Failed to update settings:", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Internal server error");
  }
};

/**
 * POST /api/MoLOS-LLM-Council/settings
 * Validate API key and fetch available models
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      throw error(400, "API key is required");
    }

    // Validate key by fetching models
    const client = new OpenRouterClient(apiKey);
    const models = await client.getModels();

    // Save the validated key
    const settingsRepo = new SettingsRepository(db);
    await settingsRepo.update(userId, { openrouterApiKey: apiKey });

    return json({
      success: true,
      models: models.slice(0, 50), // Return top 50 models
    });
  } catch (err) {
    console.error("Failed to validate API key:", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(400, "Invalid API key or failed to connect to OpenRouter");
  }
};
