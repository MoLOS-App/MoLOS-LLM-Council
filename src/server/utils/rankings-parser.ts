/**
 * Unified Rankings Parser
 * Handles parsing of rankings from LLM responses
 * Supports both persona-based and model-based architectures
 */

import type { MessageRanking } from '../models/index.js';

/**
 * Parse rankings from LLM response
 * Handles both persona-based and model-based ranking formats
 *
 * @param content Raw LLM response content
 * @param architecture 'persona' | 'model' - Which ranking format to expect
 * @returns Array of rankings (empty array on parse failure)
 */
export function parseRankings(
	content: string,
	architecture: 'persona' | 'model' = 'persona'
): MessageRanking[] {
	try {
		let jsonStr = content.trim();

		// Try to extract JSON from the response
		if (architecture === 'persona') {
			// Format: [{"personaId": "...", "rank": 1, "reason": "..."}]
			const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
			if (arrayMatch) {
				jsonStr = arrayMatch[0];
			}
		} else {
			// Format: {"rankings": [{"modelId": "...", "rank": 1, "reasoning": "..."}]}
			const objectMatch = jsonStr.match(/\{[\s\S]*"rankings"[\s\S]*\}/);
			if (objectMatch) {
				jsonStr = objectMatch[0];
			}
		}

		const parsed = JSON.parse(jsonStr);

		// Handle persona-based format
		if (architecture === 'persona' && Array.isArray(parsed)) {
			return parsed.filter((r): r is MessageRanking => {
				if (typeof r !== 'object') return false;
				return (
					typeof (r as any).personaId === 'string' &&
					typeof (r as any).rank === 'number' &&
					(r as any).rank >= 1 &&
					typeof (r as any).reason === 'string'
				);
			});
		}

		// Handle model-based format - convert to persona-based
		if (architecture === 'model' && parsed && typeof parsed === 'object' && 'rankings' in parsed) {
			const rankings = (parsed as any).rankings;
			if (!Array.isArray(rankings)) return [];

			return rankings
				.filter((r): boolean => typeof r === 'object' && 'modelId' in r)
				.map(
					(r: any): MessageRanking => ({
						personaId: r.modelId,
						rank: r.rank,
						reason: r.reasoning || r.reason || ''
					})
				);
		}

		return [];
	} catch (error) {
		console.error('[RankingsParser] Failed to parse rankings:', {
			error: error instanceof Error ? error.message : String(error),
			content: content.substring(0, 200),
			architecture
		});
		return [];
	}
}

/**
 * Validate rankings array structure
 */
export function isValidRankings(rankings: unknown[]): rankings is MessageRanking[] {
	if (!Array.isArray(rankings)) {
		return false;
	}

	return rankings.every((r): r is MessageRanking => {
		if (typeof r !== 'object') return false;
		const ranking = r as any;
		return (
			typeof ranking.personaId === 'string' &&
			typeof ranking.rank === 'number' &&
			ranking.rank >= 1 &&
			typeof ranking.reason === 'string'
		);
	});
}
