import { ProviderType, type AIProvider } from '../../models';
import { OpenRouterClient } from './openrouter-client';
import { OpenAIClient } from './openai-client';
import { AnthropicClient } from './anthropic-client';
import { CustomClient } from './custom-client';
import type { BaseProviderClient } from './base-client';

export function createProviderClient(provider: AIProvider): BaseProviderClient {
	const config = {
		apiUrl: provider.apiUrl,
		apiToken: provider.apiToken,
		model: provider.model
	};

	switch (provider.type) {
		case ProviderType.OPENROUTER:
			return new OpenRouterClient(config);
		case ProviderType.OPENAI:
			return new OpenAIClient(config);
		case ProviderType.ANTHROPIC:
			return new AnthropicClient(config);
		case ProviderType.ZAI:
			return new CustomClient(config);
		case ProviderType.ZAI_CODING:
			return new CustomClient(config);
		case ProviderType.CUSTOM:
			return new CustomClient(config);
		default:
			throw new Error(`Unknown provider type: ${provider.type}`);
	}
}

export { OpenRouterClient, OpenAIClient, AnthropicClient, CustomClient };
export { BaseProviderClient };
