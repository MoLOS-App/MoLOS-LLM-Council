import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { z } from "zod";
import { PersonaRepository } from "../../../server/repositories/persona-repository";
import { ensureDefaultPersonasForUser } from "../../../server/council/persona-initializer";
import { db } from "$lib/server/db";

const CreatePersonaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  avatar: z.string().min(1, "Avatar is required"),
  personalityPrompt: z.string().min(1, "Personality prompt is required"),
  providerId: z.string().min(1, "Provider ID is required"),
  isPresident: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    await ensureDefaultPersonasForUser(userId);

    const personaRepo = new PersonaRepository(db);
    const personas = await personaRepo.getByUserId(userId);

    return json({ personas });
  } catch (err) {
    console.error("[API Error] Failed to fetch personas:", err);
    // Re-throw if already has a status code (like error() throws)
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to fetch personas");
  }
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const body = await request.json();
    const result = CreatePersonaSchema.safeParse(body);

    if (!result.success) {
      throw error(400, result.error.issues[0].message);
    }

    const personaRepo = new PersonaRepository(db);
    const persona = await personaRepo.create({
      userId,
      ...result.data,
      isPresident: result.data.isPresident || false,
      isDefault: result.data.isDefault || false,
      isSystem: false,
    });

    return json({ persona }, { status: 201 });
  } catch (err) {
    console.error("[API Error] Failed to create persona:", err);
    // Re-throw if already has a status code
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to create persona");
  }
};
