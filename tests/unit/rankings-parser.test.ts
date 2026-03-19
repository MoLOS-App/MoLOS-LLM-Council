import { describe, it, expect } from 'vitest';
import { parseRankings, isValidRankings } from '../../src/server/utils/rankings-parser.js';
import type { MessageRanking } from '../../src/models/index.js';

describe('Rankings Parser', () => {
	describe('parseRankings - persona architecture', () => {
		it('should parse valid persona-based rankings', () => {
			const content = JSON.stringify([
				{ personaId: 'persona-1', rank: 1, reason: 'Best answer' },
				{ personaId: 'persona-2', rank: 2, reason: 'Good but not best' }
			]);

			const result = parseRankings(content, 'persona');
			expect(result).toHaveLength(2);
			expect(result[0].personaId).toBe('persona-1');
			expect(result[0].rank).toBe(1);
		});

		it('should extract JSON from wrapped content', () => {
			const content = `Here are the rankings: ${JSON.stringify([
				{ personaId: 'persona-1', rank: 1, reason: 'Best' }
			])}. Thanks!`;

			const result = parseRankings(content, 'persona');
			expect(result).toHaveLength(1);
			expect(result[0].personaId).toBe('persona-1');
		});

		it('should return empty array on invalid JSON', () => {
			const result = parseRankings('not valid json', 'persona');
			expect(result).toEqual([]);
		});

		it('should filter out invalid rankings', () => {
			const content = JSON.stringify([
				{ personaId: 'persona-1', rank: 1, reason: 'Good' },
				{ personaId: 'persona-2', rank: 'invalid', reason: 'Bad' } // Invalid rank type
			]);

			const result = parseRankings(content, 'persona');
			expect(result).toHaveLength(1);
			expect(result[0].personaId).toBe('persona-1');
		});
	});

	describe('parseRankings - model architecture', () => {
		it('should parse model-based rankings and convert to persona-based', () => {
			const content = JSON.stringify({
				rankings: [
					{ modelId: 'gpt-4', rank: 1, reasoning: 'Best' },
					{ modelId: 'claude-3', rank: 2, reasoning: 'Good' }
				]
			});

			const result = parseRankings(content, 'model');
			expect(result).toHaveLength(2);
			expect(result[0].personaId).toBe('gpt-4');
			expect(result[0].reason).toBe('Best');
		});

		it('should use reasoning field as reason when available', () => {
			const content = JSON.stringify({
				rankings: [{ modelId: 'gpt-4', rank: 1, reasoning: 'Top choice' }]
			});

			const result = parseRankings(content, 'model');
			expect(result[0].reason).toBe('Top choice');
		});

		it('should fallback to empty reason if reasoning not available', () => {
			const content = JSON.stringify({
				rankings: [{ modelId: 'gpt-4', rank: 1 }]
			});

			const result = parseRankings(content, 'model');
			expect(result[0].reason).toBe('');
		});
	});

	describe('isValidRankings', () => {
		it('should validate correct rankings', () => {
			const rankings: MessageRanking[] = [
				{ personaId: 'p1', rank: 1, reason: 'Good' },
				{ personaId: 'p2', rank: 2, reason: 'Fair' }
			];

			expect(isValidRankings(rankings)).toBe(true);
		});

		it('should reject invalid rankings', () => {
			const invalidRankings = [
				{ personaId: 'p1', rank: 1, reason: 'Good' },
				{ personaId: 'p2', rank: 'invalid', reason: 'Bad' } // Invalid rank
			];

			expect(isValidRankings(invalidRankings)).toBe(false);
		});

		it('should reject non-array input', () => {
			expect(isValidRankings({} as any)).toBe(false);
			expect(isValidRankings(null as any)).toBe(false);
		});

		it('should reject invalid objects', () => {
			const invalidRankings = [
				{ personaId: 'p1', rank: 1, reason: 'Good' },
				{ invalid: 'field' } as any // Missing required fields
			];

			expect(isValidRankings(invalidRankings)).toBe(false);
		});
	});
});
