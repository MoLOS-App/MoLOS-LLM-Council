export interface ProviderConfig {
  apiUrl: string;
  apiToken: string;
  model: string;
}

export abstract class BaseProviderClient {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract streamCompletion(
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void,
  ): Promise<void>;

  protected async *parseStream(
    response: Response,
  ): AsyncGenerator<string, void, unknown> {
    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        yield chunk;
      }
    } finally {
      reader.releaseLock();
    }
  }
}
