/**
 * Council Executor
 * Shared logic for running the 3-stage council process
 * Used by both API routes and AI tools
 */

import { createAIClient } from "./ai-client.js";
import type { PersonaWithProvider } from "../../models/index.js";

export interface Stage1Result {
  personaId: string;
  personaName: string;
  content: string;
}

export interface Stage2Result {
  reviewerPersonaId: string;
  reviewerPersonaName: string;
  rankings: Array<{
    personaId: string;
    rank: number;
    reason: string;
  }>;
}

export interface CouncilExecutorResult {
  stage1Responses: Stage1Result[];
  stage2Rankings: Stage2Result[];
  stage3Synthesis: string | null;
}

/**
 * Default max tokens for each stage (can be overridden via settings)
 */
export const DEFAULT_MAX_TOKENS = {
  stage1: 1024,
  stage2: 512,
  stage3: 4096,
} as const;

/**
 * Configuration for council execution
 */
export interface CouncilExecutorConfig {
  maxTokensStage1?: number;
  maxTokensStage2?: number;
  maxTokensStage3?: number;
}

/**
 * Validate that a persona has a properly configured provider
 * 
 * Z.AI has two valid endpoints:
 * - General API: https://api.z.ai/api/paas/v4 (for general chat)
 * - Coding API: https://api.z.ai/api/coding/paas/v4 (for GLM Coding Plan)
 */
export function validatePersonaProvider(
  persona: PersonaWithProvider,
): { valid: boolean; error?: string; warning?: string } {
  if (!persona.provider?.apiToken) {
    return {
      valid: false,
      error: `Persona "${persona.name}" has no configured provider or API token. Please configure providers in Settings.`,
    };
  }

  // Check for ZAI provider type/URL mismatches (both endpoints are valid!)
  const isCodingEndpoint = persona.provider?.apiUrl?.includes("/coding/paas/v4");
  const isGeneralEndpoint = persona.provider?.apiUrl?.includes("/api/paas/v4") && !isCodingEndpoint;
  const providerType = persona.provider?.type;

  // Warning if using general ZAI type with coding endpoint (mismatch, but allow it)
  if (providerType === "zai" && isCodingEndpoint) {
    console.warn(
      `[Council] Provider "${persona.provider.name}" uses ZAI general type with coding endpoint. ` +
      'Consider changing provider type to "Z.AI (Coding)" for clarity.'
    );
    // Don't block - allow the request to proceed
  }

  // Warning if using coding ZAI type with general endpoint (mismatch, but allow it)
  if (providerType === "zai_coding" && isGeneralEndpoint) {
    console.warn(
      `[Council] Provider "${persona.provider.name}" uses ZAI Coding type with general endpoint. ` +
      'Consider changing provider type to "Z.AI" for clarity.'
    );
    // Don't block - allow the request to proceed
  }

  return { valid: true };
}

/**
 * Run the 3-stage council process synchronously
 */
export async function runCouncilExecutor(
  query: string,
  personas: PersonaWithProvider[],
  presidentPersona: PersonaWithProvider | null,
  config?: CouncilExecutorConfig,
): Promise<CouncilExecutorResult> {
  const stage1Responses: Stage1Result[] = [];
  const stage2Rankings: Stage2Result[] = [];

  // Use configured max tokens or defaults
  const maxTokensStage1 = config?.maxTokensStage1 ?? DEFAULT_MAX_TOKENS.stage1;
  const maxTokensStage2 = config?.maxTokensStage2 ?? DEFAULT_MAX_TOKENS.stage2;
  const maxTokensStage3 = config?.maxTokensStage3 ?? DEFAULT_MAX_TOKENS.stage3;

  console.log(`[Council] Running with max tokens - Stage1: ${maxTokensStage1}, Stage2: ${maxTokensStage2}, Stage3: ${maxTokensStage3}`);

  // Stage 1: Get responses from each persona (parallel)
  const stage1Promises = personas.map(async (persona) => {
    const client = createAIClient(
      persona.provider.type,
      persona.provider.apiToken,
      persona.provider.apiUrl,
    );
    const prompt = `${persona.personalityPrompt}\n\nUser: ${query}`;

    const content = await client.chat({
      model: persona.provider.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokensStage1,
    });

    return {
      personaId: persona.id,
      personaName: persona.name,
      content,
    };
  });

  stage1Responses.push(...(await Promise.all(stage1Promises)));
  console.log(`[Council] Stage 1 complete: ${stage1Responses.length} responses`);

  // Stage 2: Each persona ranks the responses (parallel)
  const stage2Promises = personas.map(async (persona) => {
    const client = createAIClient(
      persona.provider.type,
      persona.provider.apiToken,
      persona.provider.apiUrl,
    );

    const responsesText = stage1Responses
      .map(
        (r, i) =>
          `${i + 1}. Persona: ${r.personaName}\nContent: ${r.content}`,
      )
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
      max_tokens: maxTokensStage2,
    });

    // Create simplified rankings (in a real implementation, you'd parse the AI response)
    const rankings = stage1Responses.map((r, i) => ({
      personaId: r.personaId,
      rank: i + 1,
      reason: "Evaluation provided in review",
    }));

    return {
      reviewerPersonaId: persona.id,
      reviewerPersonaName: persona.name,
      rankings,
    };
  });

  stage2Rankings.push(...(await Promise.all(stage2Promises)));
  console.log(`[Council] Stage 2 complete: ${stage2Rankings.length} rankings`);

  // Stage 3: Synthesis by president
  let stage3Synthesis: string | null = null;
  if (presidentPersona && presidentPersona.provider?.apiToken) {
    const client = createAIClient(
      presidentPersona.provider.type,
      presidentPersona.provider.apiToken,
      presidentPersona.provider.apiUrl,
    );

    const responsesText = stage1Responses
      .map((r) => `**${r.personaName}:**\n${r.content}`)
      .join("\n\n---\n\n");

    const synthesisPrompt = `${presidentPersona.personalityPrompt}

Synthesize the following council responses into a comprehensive, balanced answer. Highlight:
1. Key areas of consensus
2. Important disagreements or alternative perspectives
3. Actionable recommendations

Council Responses:
${responsesText}`;

    stage3Synthesis = await client.chat({
      model: presidentPersona.provider.model,
      messages: [{ role: "user", content: synthesisPrompt }],
      max_tokens: maxTokensStage3,
    });
    console.log(`[Council] Stage 3 complete: synthesis length ${stage3Synthesis?.length ?? 0}`);
  }

  return {
    stage1Responses,
    stage2Rankings,
    stage3Synthesis,
  };
}
