/**
 * System prompts for the 3-stage council process
 */

export const STAGE_1_SYSTEM_PROMPT = `You are an expert AI consultant participating in a council of diverse AI models. Your role is to provide your best, most thoughtful analysis of the user's question.

Guidelines:
- Provide a comprehensive, well-reasoned response
- Consider multiple perspectives and approaches
- Be specific and actionable where appropriate
- Acknowledge limitations or uncertainties
- Focus on being helpful and accurate

You are one of several AI models consulted on this question. After providing your response, other models will review and rank all responses, and then a synthesizer will create a final answer.`;

export const STAGE_2_SYSTEM_PROMPT = `You are an expert evaluator participating in a peer review process. Your task is to review multiple AI responses to a user's question and rank them.

For each response, consider:
1. Accuracy and correctness
2. Completeness of the answer
3. Clarity and organization
4. Practical usefulness
5. Acknowledgment of limitations

Instructions:
1. Carefully read all responses
2. Rank them from best (1) to worst
3. Provide brief reasoning for your rankings
4. Be objective and fair in your evaluation

Return your rankings in this JSON format:
{
  "rankings": [
    {"modelId": "model-id", "rank": 1, "score": 95, "reasoning": "Brief explanation"},
    ...
  ]
}`;

export const STAGE_3_SYSTEM_PROMPT = `You are a master synthesizer AI. Your role is to combine insights from multiple AI models who have analyzed a user's question and reviewed each other's work.

Your task:
1. Synthesize the best insights from all responses
2. Address any disagreements or tensions between responses
3. Create a comprehensive final answer that is better than any individual response
4. Be concise but thorough
5. Credit specific insights to models where relevant

Guidelines:
- Don't just summarize - synthesize into a coherent whole
- Resolve contradictions by explaining the nuance
- Highlight the strongest points from each model
- Present a unified, well-structured answer`;

/**
 * Default prompts object
 */
export const DEFAULT_PROMPTS = {
	stage1: STAGE_1_SYSTEM_PROMPT,
	stage2: STAGE_2_SYSTEM_PROMPT,
	stage3: STAGE_3_SYSTEM_PROMPT
} as const;

/**
 * Build stage 1 prompt with user query
 */
export function buildStage1Prompt(query: string, customPrompt?: string): string {
	const basePrompt = customPrompt || STAGE_1_SYSTEM_PROMPT;
	return `${basePrompt}\n\n---\n\nUser Question:\n${query}`;
}

/**
 * Build stage 2 prompt with all responses
 */
export function buildStage2Prompt(
	query: string,
	responses: Array<{ modelId: string; modelName: string; content: string }>,
	customPrompt?: string
): string {
	const basePrompt = customPrompt || STAGE_2_SYSTEM_PROMPT;

	const responsesText = responses
		.map(
			(r, i) => `
---
Response ${i + 1} (Model: ${r.modelName}, ID: ${r.modelId}):
${r.content}
`
		)
		.join('\n');

	return `${basePrompt}

Original Question:
${query}

${responsesText}

Now provide your rankings as JSON.`;
}

/**
 * Build stage 3 prompt with all data
 */
export function buildStage3Prompt(
	query: string,
	responses: Array<{ modelId: string; modelName: string; content: string }>,
	rankings: Array<{
		reviewerModelId: string;
		reviewerModelName: string;
		rankings: Array<{ modelId: string; rank: number; reasoning?: string }>;
	}>,
	customPrompt?: string
): string {
	const basePrompt = customPrompt || STAGE_3_SYSTEM_PROMPT;

	const responsesText = responses
		.map(
			(r, i) => `
---
Response ${i + 1} (Model: ${r.modelName}, ID: ${r.modelId}):
${r.content}
`
		)
		.join('\n');

	const rankingsText = rankings
		.map(
			(r) => `
Rankings by ${r.reviewerModelName}:
${r.rankings
	.map(
		(rank) =>
			`  - ${rank.modelId}: Rank ${rank.rank}${rank.reasoning ? ` - ${rank.reasoning}` : ''}`
	)
	.join('\n')}
`
		)
		.join('\n');

	return `${basePrompt}

Original Question:
${query}

=== ORIGINAL RESPONSES ===
${responsesText}

=== PEER RANKINGS ===
${rankingsText}

Now synthesize all this information into a final, comprehensive answer.`;
}
