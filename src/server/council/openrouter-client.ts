/**
 * OpenRouter API Client
 * Handles streaming and non-streaming requests to OpenRouter
 */

import type { OpenRouterModel, ModelRanking } from "../../models";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private referer?: string;
  private title?: string;

  constructor(apiKey: string, referer?: string, title?: string) {
    this.apiKey = apiKey;
    this.referer = referer || "http://localhost:5173";
    this.title = title || "MoLOS LLM Council";
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": this.referer || "",
      "X-Title": this.title || "",
    };
  }

  /**
   * Fetch available models from OpenRouter
   */
  async getModels(): Promise<OpenRouterModel[]> {
    const response = await fetch(`${OPENROUTER_API_URL}/models`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      description: model.description,
      context_length: model.context_length || 4096,
      pricing: model.pricing,
    }));
  }

  /**
   * Non-streaming chat completion
   */
  async chat(request: OpenRouterRequest): Promise<string> {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...request,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `OpenRouter API error: ${response.statusText} - ${error}`,
      );
    }

    const data: OpenRouterResponse = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  /**
   * Streaming chat completion - returns async generator
   */
  async *chatStream(request: OpenRouterRequest): AsyncGenerator<string> {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `OpenRouter API error: ${response.statusText} - ${error}`,
      );
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed || trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content;

              if (delta) {
                yield delta;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Parse rankings from a JSON response
   */
  parseRankingsResponse(content: string): ModelRanking[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*"rankings"[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.rankings || [];
      }

      // Try direct JSON parse
      const parsed = JSON.parse(content);
      return parsed.rankings || [];
    } catch {
      console.error("Failed to parse rankings response:", content);
      return [];
    }
  }
}

/**
 * Get model display name from ID
 */
export function getModelDisplayName(modelId: string): string {
  const parts = modelId.split("/");
  if (parts.length >= 2) {
    return parts[1].split(":")[0]; // Remove version suffix
  }
  return modelId;
}
