import { BaseProviderClient } from './base-client';

export class CustomClient extends BaseProviderClient {
	async streamCompletion(
		messages: Array<{ role: string; content: string }>,
		onChunk: (chunk: string) => void
	): Promise<void> {
		const response = await fetch(`${this.config.apiUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.config.apiToken}`
			},
			body: JSON.stringify({
				model: this.config.model,
				messages,
				stream: true
			})
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Custom API error: ${response.status} - ${error}`);
		}

		try {
			for await (const chunk of this.parseStream(response)) {
				const lines = chunk.split('\n').filter((line) => line.trim() !== '');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						if (data === '[DONE]') continue;

						try {
							const parsed = JSON.parse(data);
							// Validate structure before accessing
							if (parsed && Array.isArray(parsed.choices) && parsed.choices.length > 0) {
								const content = parsed.choices[0]?.delta?.content;
								if (content) {
									onChunk(content);
								}
							}
						} catch (e) {
							// Log with more context for debugging
							console.warn('[CustomClient] Failed to parse SSE data:', {
								data: data.substring(0, 100),
								error: e instanceof Error ? e.message : String(e)
							});
						}
					}
				}
			}
		} catch (e) {
			// Catch and re-throw with context if it's not a parsing error
			if (e instanceof Error && !e.message.includes('Failed to parse SSE')) {
				console.error('[CustomClient] Streaming error:', e);
				throw new Error(`Custom streaming failed: ${e.message}`);
			}
		}
	}
}
