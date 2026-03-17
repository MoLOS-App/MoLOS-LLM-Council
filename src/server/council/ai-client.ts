/**
 * Generic AI Client
 * Handles requests to various AI providers (OpenRouter, ZAI, OpenAI, Custom, etc.)
 */

import type { ProviderType } from "../../models";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  model: string;
  messages: AIMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  timeout?: number; // Request timeout in milliseconds
}

// Default timeout: 5 minutes (300000ms) - AI requests can take a while
const DEFAULT_TIMEOUT = 300000;

export interface AIResponse {
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

export abstract class BaseAIClient {
  protected apiKey: string;
  protected apiUrl: string;

  constructor(apiKey: string, apiUrl: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  abstract getHeaders(): Record<string, string>;
  abstract formatRequest(request: AIRequest): Record<string, unknown>;
  abstract parseResponse(data: unknown): string;

  async chat(request: AIRequest): Promise<string> {
    if (!this.apiUrl || this.apiUrl.trim() === "") {
      throw new Error(
        "API URL is not configured. Please check your provider settings.",
      );
    }

    if (!this.apiKey || this.apiKey.trim() === "") {
      throw new Error(
        "API key is not configured. Please check your provider settings.",
      );
    }

    const timeout = request.timeout ?? DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(this.formatRequest(request)),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.statusText} - ${error}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `Request timed out after ${timeout / 1000} seconds. Please try again or use a simpler query.`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * OpenRouter Client - uses Bearer authentication
 */
export class OpenRouterClient extends BaseAIClient {
  private referer?: string;
  private title?: string;

  constructor(apiKey: string, referer?: string, title?: string) {
    super(apiKey, "https://openrouter.ai/api/v1/chat/completions");
    this.referer = referer || "http://localhost:5173";
    this.title = title || "MoLOS LLM Council";
  }

  getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": this.referer || "",
      "X-Title": this.title || "",
    };
  }

  formatRequest(request: AIRequest): Record<string, unknown> {
    return {
      ...request,
      stream: false,
    };
  }

  parseResponse(data: unknown): string {
    const response = data as AIResponse;
    return response.choices[0]?.message?.content || "";
  }
}

/**
 * Custom/ZAI Client - uses API key in headers
 */
export class CustomAIClient extends BaseAIClient {
  constructor(apiKey: string, apiUrl: string) {
    super(apiKey, apiUrl);
  }

  getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: this.apiKey,
    };
  }

  formatRequest(request: AIRequest): Record<string, unknown> {
    return {
      model: request.model,
      messages: request.messages,
      stream: false,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
    };
  }

  parseResponse(data: unknown): string {
    const response = data as AIResponse;
    return response.choices[0]?.message?.content || "";
  }
}

/**
 * Z.AI Client - uses Bearer authentication
 * Z.AI API documentation: https://docs.z.ai/guides/overview/quick-start
 */
export class ZaiClient extends BaseAIClient {
  constructor(apiKey: string) {
    super(apiKey, "https://api.z.ai/api/paas/v4/chat/completions");
  }

  getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  formatRequest(request: AIRequest): Record<string, unknown> {
    return {
      model: request.model,
      messages: request.messages,
      stream: false,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
    };
  }

  parseResponse(data: unknown): string {
    const response = data as AIResponse;
    return response.choices[0]?.message?.content || "";
  }
}

/**
 * Z.AI Coding Client - uses coding-specific endpoint
 * Z.AI Coding API documentation: https://docs.z.ai/guides/llm/glm-5
 */
export class ZaiCodingClient extends BaseAIClient {
  constructor(apiKey: string) {
    super(apiKey, "https://api.z.ai/api/coding/paas/v4/chat/completions");
  }

  getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  formatRequest(request: AIRequest): Record<string, unknown> {
    return {
      model: request.model,
      messages: request.messages,
      stream: false,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
    };
  }

  parseResponse(data: unknown): string {
    const response = data as AIResponse;
    return response.choices[0]?.message?.content || "";
  }
}

/**
 * Fix common ZAI API configuration issues
 * Returns corrected API URL if needed
 */
function fixZaiApiUrl(apiUrl: string): string {
  if (!apiUrl || apiUrl.trim() === "") {
    return "https://api.z.ai/api/paas/v4";
  }

  // Fix coding endpoint being used instead of chat endpoint
  if (apiUrl.includes("/coding/paas/v4")) {
    console.warn(
      "[AIClient] Fixing ZAI API URL: using coding endpoint instead of chat endpoint",
    );
    return apiUrl.replace("/coding/paas/v4", "/paas/v4");
  }

  return apiUrl;
}

/**
 * AI Client Factory
 */
export function createAIClient(
  providerType: ProviderType,
  apiKey: string,
  apiUrl: string,
): BaseAIClient {
  switch (providerType) {
    case "openrouter":
      return new OpenRouterClient(apiKey);
    case "zai":
      return new ZaiClient(apiKey);
    case "zai_coding":
      return new ZaiCodingClient(apiKey);
    case "custom":
    case "openai":
    case "anthropic":
      return new CustomAIClient(apiKey, apiUrl);
    default:
      throw new Error(`Unsupported provider type: ${providerType}`);
  }
}
