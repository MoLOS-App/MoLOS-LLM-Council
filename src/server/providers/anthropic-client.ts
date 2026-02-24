import { BaseProviderClient } from './base-client';

export class AnthropicClient extends BaseProviderClient {
	async streamCompletion(
		messages: Array<{ role: string; content: string }>,
		onChunk: (chunk: string) => void
	): Promise<void> {
		const systemMessage = messages.find((m) => m.role === 'system');
		const userMessages = messages.filter((m) => m.role !== 'system');

		const response = await fetch(`${this.config.apiUrl}/messages`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.config.apiToken,
				'anthropic-version': '2023-06-01',
				'anthropic-dangerous-direct-browser-access': 'true'
			},
			body: JSON.stringify({
				model: this.config.model,
				max_tokens: 4096,
				system: systemMessage?.content,
				messages: userMessages,
				stream: true
			})
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Anthropic API error: ${response.status} - ${error}`);
		}

		for await (const chunk of this.parseStream(response)) {
			const lines = chunk.split('\n').filter((line) => line.trim() !== '');

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.slice(6);

					try {
						const parsed = JSON.parse(data);
						if (parsed.type === 'content_block_delta') {
							const delta = parsed.delta?.text;
							if (delta) {
								onChunk(delta);
							}
						}
					} catch (e) {
						console.warn('Failed to parse SSE data:', data);
					}
				}
			}
		}
	}
}
