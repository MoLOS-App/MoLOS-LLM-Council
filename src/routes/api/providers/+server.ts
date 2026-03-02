import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { z } from "zod";
import { ProviderRepository } from "../../../server/repositories/provider-repository";
import { db } from "$lib/server/db";

const CreateProviderSchema = z.object({
  type: z.enum([
    "openrouter",
    "openai",
    "anthropic",
    "zai",
    "zai_coding",
    "custom",
  ]),
  name: z.string().min(1, "Name is required"),
  apiUrl: z.string().min(1, "API URL is required"),
  apiToken: z.string().min(1, "API token is required"),
  model: z.string().min(1, "Model is required"),
  isDefault: z.boolean().optional(),
});

export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const providerRepo = new ProviderRepository();
    const providers = await providerRepo.getByUserId(userId);

    return json({ providers });
  } catch (err) {
    console.error("[API Error] Failed to fetch providers:", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to fetch providers");
  }
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const body = await request.json();
    const result = CreateProviderSchema.safeParse(body);

    if (!result.success) {
      throw error(400, result.error.issues[0].message);
    }

    const providerRepo = new ProviderRepository();
    const provider = await providerRepo.create({
      userId,
      ...result.data,
      isDefault: result.data.isDefault || false,
    });

    if (result.data.isDefault) {
      await providerRepo.setDefault(provider.id, userId);
    }

    return json({ provider }, { status: 201 });
  } catch (err) {
    console.error("[API Error] Failed to create provider:", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to create provider");
  }
};
