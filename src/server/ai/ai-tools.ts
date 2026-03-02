import type { ToolDefinition } from "../../models/index.js";
import { ProviderRepository } from "../repositories/provider-repository.js";
import { PersonaRepository } from "../repositories/persona-repository.js";
import { ConversationRepository } from "../repositories/conversation-repository.js";
import { MessageRepository } from "../repositories/message-repository.js";

export function getAiTools(userId: string): ToolDefinition[] {
  const providerRepo = new ProviderRepository();
  const personaRepo = new PersonaRepository();
  const conversationRepo = new ConversationRepository();
  const messageRepo = new MessageRepository();

  return [
    // ============== PROVIDERS ==============
    {
      name: "get_council_providers",
      description: "Retrieve all AI providers configured for the LLM Council.",
      parameters: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        return await providerRepo.getByUserId(userId);
      },
    },
    {
      name: "get_council_provider",
      description: "Get a specific AI provider by ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Provider ID" },
        },
        required: ["id"],
      },
      execute: async (params) => {
        const provider = await providerRepo.getById(
          params.id as string,
          userId,
        );
        if (!provider) {
          return { error: "Provider not found" };
        }
        return provider;
      },
    },
    {
      name: "update_council_provider",
      description: "Update an AI provider configuration.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Provider ID" },
          name: { type: "string", description: "Display name" },
          apiUrl: { type: "string", description: "API endpoint URL" },
          apiToken: { type: "string", description: "API authentication token" },
          model: { type: "string", description: "Model identifier" },
          isDefault: {
            type: "boolean",
            description: "Set as default provider",
          },
        },
        required: ["id"],
      },
      execute: async (params) => {
        try {
          const updateData: Record<string, unknown> = {};
          if (params.name !== undefined) updateData.name = params.name;
          if (params.apiUrl !== undefined) updateData.apiUrl = params.apiUrl;
          if (params.apiToken !== undefined)
            updateData.apiToken = params.apiToken;
          if (params.model !== undefined) updateData.model = params.model;
          if (params.isDefault !== undefined)
            updateData.isDefault = params.isDefault;

          const provider = await providerRepo.update(
            params.id as string,
            userId,
            updateData,
          );
          if (!provider) {
            return { error: "Provider not found" };
          }
          return provider;
        } catch (error) {
          return {
            error:
              error instanceof Error
                ? error.message
                : "Failed to update provider",
          };
        }
      },
    },

    // ============== PERSONAS ==============
    {
      name: "get_council_personas",
      description:
        "Retrieve council personas. Optionally filter by presidents only or system personas.",
      parameters: {
        type: "object",
        properties: {
          presidentsOnly: {
            type: "boolean",
            description: "Only return president personas (default: false)",
          },
          systemOnly: {
            type: "boolean",
            description: "Only return system personas (default: false)",
          },
          userOnly: {
            type: "boolean",
            description: "Only return user-created personas (default: false)",
          },
        },
      },
      execute: async (params) => {
        if (params.presidentsOnly) {
          return await personaRepo.getByUserId(userId, {
            presidentsOnly: true,
          });
        }
        if (params.systemOnly) {
          return await personaRepo.getSystemPersonas(userId);
        }
        if (params.userOnly) {
          return await personaRepo.getUserPersonas(userId);
        }
        return await personaRepo.getByUserId(userId);
      },
    },
    {
      name: "get_council_persona",
      description:
        "Get a specific council persona by ID, including provider information.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Persona ID" },
        },
        required: ["id"],
      },
      execute: async (params) => {
        const persona = await personaRepo.getById(params.id as string, userId);
        if (!persona) {
          return { error: "Persona not found" };
        }
        return persona;
      },
    },
    {
      name: "create_council_persona",
      description:
        "Create a new council persona with a personality prompt and assigned provider.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Persona display name" },
          description: { type: "string", description: "Brief description" },
          avatar: { type: "string", description: "Emoji or icon for persona" },
          personalityPrompt: {
            type: "string",
            description: "System prompt defining personality and behavior",
          },
          providerId: {
            type: "string",
            description: "ID of the AI provider to use",
          },
          isPresident: {
            type: "boolean",
            description: "Whether this persona can synthesize (default: false)",
          },
        },
        required: ["name", "avatar", "personalityPrompt", "providerId"],
      },
      execute: async (params) => {
        try {
          const persona = await personaRepo.create({
            userId,
            name: params.name as string,
            description: params.description as string | undefined,
            avatar: params.avatar as string,
            personalityPrompt: params.personalityPrompt as string,
            providerId: params.providerId as string,
            isPresident: (params.isPresident as boolean) || false,
            isDefault: false,
            isSystem: false,
          });
          return persona;
        } catch (error) {
          return {
            error:
              error instanceof Error
                ? error.message
                : "Failed to create persona",
          };
        }
      },
    },
    {
      name: "update_council_persona",
      description: "Update a council persona configuration.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Persona ID" },
          name: { type: "string", description: "Display name" },
          description: { type: "string", description: "Brief description" },
          avatar: { type: "string", description: "Emoji or icon" },
          personalityPrompt: { type: "string", description: "System prompt" },
          providerId: { type: "string", description: "AI provider ID" },
          isPresident: { type: "boolean", description: "Can synthesize" },
          isDefault: { type: "boolean", description: "Default persona" },
        },
        required: ["id"],
      },
      execute: async (params) => {
        try {
          const updateData: Record<string, unknown> = {};
          if (params.name !== undefined) updateData.name = params.name;
          if (params.description !== undefined)
            updateData.description = params.description;
          if (params.avatar !== undefined) updateData.avatar = params.avatar;
          if (params.personalityPrompt !== undefined)
            updateData.personalityPrompt = params.personalityPrompt;
          if (params.providerId !== undefined)
            updateData.providerId = params.providerId;
          if (params.isPresident !== undefined)
            updateData.isPresident = params.isPresident;
          if (params.isDefault !== undefined)
            updateData.isDefault = params.isDefault;

          const persona = await personaRepo.update(
            params.id as string,
            userId,
            updateData,
          );
          if (!persona) {
            return { error: "Persona not found" };
          }
          return persona;
        } catch (error) {
          return {
            error:
              error instanceof Error
                ? error.message
                : "Failed to update persona",
          };
        }
      },
    },
    {
      name: "delete_council_persona",
      description:
        "Delete a council persona. System personas cannot be deleted and will return an error.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Persona ID to delete" },
        },
        required: ["id"],
      },
      execute: async (params) => {
        try {
          const persona = await personaRepo.getById(
            params.id as string,
            userId,
          );
          if (!persona) {
            return { error: "Persona not found" };
          }
          if (persona.isSystem) {
            return { error: "Cannot delete system personas" };
          }
          const success = await personaRepo.delete(params.id as string);
          return { success, id: params.id };
        } catch (error) {
          return {
            error:
              error instanceof Error
                ? error.message
                : "Failed to delete persona",
          };
        }
      },
    },

    // ============== CONVERSATIONS ==============
    {
      name: "get_council_conversations",
      description: "Retrieve council conversation history.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum results (default: 50)",
          },
          stage: {
            type: "string",
            enum: [
              "initial_responses",
              "peer_review",
              "synthesis",
              "completed",
            ],
            description: "Filter by conversation stage",
          },
        },
      },
      execute: async (params) => {
        const limit = (params.limit as number) || 50;
        let conversations = await conversationRepo.getByUserId(userId, limit);

        if (params.stage) {
          conversations = conversations.filter((c) => c.stage === params.stage);
        }

        return conversations;
      },
    },
    {
      name: "get_council_conversation",
      description:
        "Get a specific council conversation including all messages.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Conversation ID" },
        },
        required: ["id"],
      },
      execute: async (params) => {
        const conversation = await conversationRepo.getById(
          params.id as string,
          userId,
        );
        if (!conversation) {
          return { error: "Conversation not found" };
        }

        // Fetch messages for this conversation
        const messages = await messageRepo.getByConversationId(
          params.id as string,
        );

        return {
          ...conversation,
          messages,
        };
      },
    },
    {
      name: "search_council_conversations",
      description: "Search council conversations by query content or title.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term" },
          limit: {
            type: "number",
            description: "Maximum results (default: 20)",
          },
        },
        required: ["query"],
      },
      execute: async (params) => {
        const limit = (params.limit as number) || 20;
        return await conversationRepo.searchByUserId(
          userId,
          params.query as string,
          limit,
        );
      },
    },
    {
      name: "update_council_conversation",
      description:
        "Update a council conversation metadata (decision summary, tags).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Conversation ID" },
          decisionSummary: {
            type: "string",
            description: "Final decision or summary",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tags for categorization",
          },
        },
        required: ["id"],
      },
      execute: async (params) => {
        try {
          const updateData: Record<string, unknown> = {};
          if (params.decisionSummary !== undefined)
            updateData.decisionSummary = params.decisionSummary;
          if (params.tags !== undefined)
            updateData.tags = JSON.stringify(params.tags);

          const conversation = await conversationRepo.update(
            params.id as string,
            userId,
            updateData,
          );
          if (!conversation) {
            return { error: "Conversation not found" };
          }
          return conversation;
        } catch (error) {
          return {
            error:
              error instanceof Error
                ? error.message
                : "Failed to update conversation",
          };
        }
      },
    },

    // ============== MESSAGES ==============
    {
      name: "get_council_messages",
      description:
        "Get messages for a council conversation, optionally filtered by stage.",
      parameters: {
        type: "object",
        properties: {
          conversationId: { type: "string", description: "Conversation ID" },
          stage: {
            type: "string",
            enum: [
              "initial_responses",
              "peer_review",
              "synthesis",
              "completed",
            ],
            description: "Filter by message stage",
          },
        },
        required: ["conversationId"],
      },
      execute: async (params) => {
        const messages = await messageRepo.getByConversationId(
          params.conversationId as string,
          params.stage as
            | "initial_responses"
            | "peer_review"
            | "synthesis"
            | "completed"
            | undefined,
        );
        return messages;
      },
    },
  ];
}
