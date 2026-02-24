import { BaseProviderClient } from './base-client';

export class OpenAIClient extends BaseProviderClient {
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
			throw new Error(`OpenAI API error: ${response.status} - ${error}`);
		}

		for await (const chunk of this.parseStream(response)) {
			const lines = chunk.split('\n').filter((line) => line.trim() !== '');

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.slice(6);
					if (data === '[DONE]') continue;

					try {
						const parsed = JSON.parse(data);
						const content = parsed.choices?.[0]?.delta?.content;
						if (content) {
							onChunk(content);
						}
					} catch (e) {
						console.warn('Failed to parse SSE data:', data);
					}
				}
			}
		}
	}
}
