import type { ToolDefinition, PersonaConversationStage } from '../../models/index.js';
import { ProviderRepository } from '../repositories/provider-repository.js';
import { PersonaRepository } from '../repositories/persona-repository.js';
import { ConversationRepository } from '../repositories/conversation-repository.js';
import { MessageRepository } from '../repositories/message-repository.js';
import { SettingsRepository } from '../repositories/settings-repository.js';
import {
	runCouncilExecutor,
	validatePersonaProvider,
	DEFAULT_MAX_TOKENS,
	type CouncilExecutorResult,
	type CouncilExecutorConfig
} from '../council/council-executor.js';

// Default timeout is now 10 minutes (council can take a while with multiple personas)
const DEFAULT_TIMEOUT_MS = 600000; // 10 minutes

/**
 * Helper to select appropriate personas for the council
 * - First tries to find personas marked as default
 * - If no defaults, selects up to 3 most appropriate non-president personas
 * - Returns info about what was selected for user feedback
 */
async function selectPersonasForCouncil(
	personaRepo: PersonaRepository,
	userId: string
): Promise<{
	members: Awaited<ReturnType<PersonaRepository['getByUserId']>>;
	presidents: Awaited<ReturnType<PersonaRepository['getByUserId']>>;
	selectionInfo: {
		usedDefaults: boolean;
		selectedMembers: string[];
		selectedPresident: string | null;
		message: string;
	};
}> {
	const allPersonas = await personaRepo.getByUserId(userId);
	const presidents = allPersonas.filter((p) => p.isPresident);

	// First try: personas marked as default
	let defaultMembers = allPersonas.filter((p) => !p.isPresident && p.isDefault);
	let usedDefaults = defaultMembers.length > 0;

	// If no defaults, select up to 3 non-president personas (most recently updated)
	if (defaultMembers.length === 0) {
		const nonPresidents = allPersonas
			.filter((p) => !p.isPresident)
			.sort((a, b) => b.updatedAt - a.updatedAt);
		defaultMembers = nonPresidents.slice(0, 3);
	}

	const presidentPersona = presidents[0] || null;

	// Build selection message
	const memberNames = defaultMembers.map((p) => `${p.avatar} ${p.name}`).join(', ');
	const presidentName = presidentPersona
		? `${presidentPersona.avatar} ${presidentPersona.name}`
		: null;

	let message = '';
	if (usedDefaults) {
		message = `Using default council members: ${memberNames}`;
		if (presidentName) {
			message += ` with ${presidentName} as president for synthesis.`;
		}
	} else {
		message = `No default personas configured. Auto-selected ${defaultMembers.length} council member(s): ${memberNames}`;
		if (presidentName) {
			message += ` with ${presidentName} as president for synthesis.`;
		}
		message += " Tip: Mark personas as 'default' in Settings for consistent selection.";
	}

	return {
		members: defaultMembers,
		presidents,
		selectionInfo: {
			usedDefaults,
			selectedMembers: defaultMembers.map((p) => p.name),
			selectedPresident: presidentPersona?.name || null,
			message
		}
	};
}

/**
 * Run council with timeout wrapper (timeout is very long now)
 */
async function runCouncilWithTimeout(
	query: string,
	personas: Parameters<typeof runCouncilExecutor>[1],
	presidentPersona: Parameters<typeof runCouncilExecutor>[2],
	config: CouncilExecutorConfig,
	timeoutMs: number
): Promise<CouncilExecutorResult> {
	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => {
			reject(
				new Error(
					`Council execution timed out after ${Math.round(timeoutMs / 1000 / 60)} minutes. Try reducing the number of personas or using faster models.`
				)
			);
		}, timeoutMs);
	});

	return Promise.race([
		runCouncilExecutor(query, personas, presidentPersona, config),
		timeoutPromise
	]);
}

export function getAiTools(userId: string): ToolDefinition[] {
	const providerRepo = new ProviderRepository();
	const personaRepo = new PersonaRepository();
	const conversationRepo = new ConversationRepository();
	const messageRepo = new MessageRepository();
	const settingsRepo = new SettingsRepository();

	return [
		// ============== PROVIDERS ==============
		{
			name: 'get_council_providers',
			description: 'Retrieve all AI providers configured for the LLM Council.',
			parameters: {
				type: 'object',
				properties: {}
			},
			metadata: { submodule: 'providers' },
			execute: async () => {
				return await providerRepo.getByUserId(userId);
			}
		},
		{
			name: 'get_council_provider',
			description: 'Get a specific AI provider by ID.',
			parameters: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Provider ID' }
				},
				required: ['id']
			},
			metadata: { submodule: 'providers' },
			execute: async (params) => {
				const provider = await providerRepo.getById(params.id as string, userId);
				if (!provider) {
					return { error: 'Provider not found' };
				}
				return provider;
			}
		},
		{
			name: 'update_council_provider',
			description: 'Update an AI provider configuration.',
			parameters: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Provider ID' },
					name: { type: 'string', description: 'Display name' },
					apiUrl: { type: 'string', description: 'API endpoint URL' },
					apiToken: { type: 'string', description: 'API authentication token' },
					model: { type: 'string', description: 'Model identifier' },
					isDefault: {
						type: 'boolean',
						description: 'Set as default provider'
					}
				},
				required: ['id']
			},
			metadata: { submodule: 'providers' },
			execute: async (params) => {
				try {
					const updateData: Record<string, unknown> = {};
					if (params.name !== undefined) updateData.name = params.name;
					if (params.apiUrl !== undefined) updateData.apiUrl = params.apiUrl;
					if (params.apiToken !== undefined) updateData.apiToken = params.apiToken;
					if (params.model !== undefined) updateData.model = params.model;
					if (params.isDefault !== undefined) updateData.isDefault = params.isDefault;

					const provider = await providerRepo.update(params.id as string, userId, updateData);
					if (!provider) {
						return { error: 'Provider not found' };
					}
					return provider;
				} catch (error) {
					return {
						error: error instanceof Error ? error.message : 'Failed to update provider'
					};
				}
			}
		},

		// ============== PERSONAS ==============
		{
			name: 'get_council_personas',
			description:
				'Retrieve council personas. Optionally filter by presidents only or system personas.',
			parameters: {
				type: 'object',
				properties: {
					presidentsOnly: {
						type: 'boolean',
						description: 'Only return president personas (default: false)'
					},
					systemOnly: {
						type: 'boolean',
						description: 'Only return system personas (default: false)'
					},
					userOnly: {
						type: 'boolean',
						description: 'Only return user-created personas (default: false)'
					}
				}
			},
			metadata: { submodule: 'personas' },
			execute: async (params) => {
				if (params.presidentsOnly) {
					return await personaRepo.getByUserId(userId, {
						presidentsOnly: true
					});
				}
				if (params.systemOnly) {
					return await personaRepo.getSystemPersonas(userId);
				}
				if (params.userOnly) {
					return await personaRepo.getUserPersonas(userId);
				}
				return await personaRepo.getByUserId(userId);
			}
		},
		{
			name: 'get_council_persona',
			description: 'Get a specific council persona by ID, including provider information.',
			parameters: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Persona ID' }
				},
				required: ['id']
			},
			metadata: { submodule: 'personas' },
			execute: async (params) => {
				const persona = await personaRepo.getById(params.id as string, userId);
				if (!persona) {
					return { error: 'Persona not found' };
				}
				return persona;
			}
		},
		{
			name: 'create_council_persona',
			description: 'Create a new council persona with a personality prompt and assigned provider.',
			parameters: {
				type: 'object',
				properties: {
					name: { type: 'string', description: 'Persona display name' },
					description: { type: 'string', description: 'Brief description' },
					avatar: { type: 'string', description: 'Emoji or icon for persona' },
					personalityPrompt: {
						type: 'string',
						description: 'System prompt defining personality and behavior'
					},
					providerId: {
						type: 'string',
						description: 'ID of the AI provider to use'
					},
					isPresident: {
						type: 'boolean',
						description: 'Whether this persona can synthesize (default: false)'
					}
				},
				required: ['name', 'avatar', 'personalityPrompt', 'providerId']
			},
			metadata: { submodule: 'personas' },
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
						isSystem: false
					});
					return persona;
				} catch (error) {
					return {
						error: error instanceof Error ? error.message : 'Failed to create persona'
					};
				}
			}
		},
		{
			name: 'update_council_persona',
			description: 'Update a council persona configuration.',
			parameters: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Persona ID' },
					name: { type: 'string', description: 'Display name' },
					description: { type: 'string', description: 'Brief description' },
					avatar: { type: 'string', description: 'Emoji or icon' },
					personalityPrompt: { type: 'string', description: 'System prompt' },
					providerId: { type: 'string', description: 'AI provider ID' },
					isPresident: { type: 'boolean', description: 'Can synthesize' },
					isDefault: { type: 'boolean', description: 'Default persona' }
				},
				required: ['id']
			},
			metadata: { submodule: 'personas' },
			execute: async (params) => {
				try {
					const updateData: Record<string, unknown> = {};
					if (params.name !== undefined) updateData.name = params.name;
					if (params.description !== undefined) updateData.description = params.description;
					if (params.avatar !== undefined) updateData.avatar = params.avatar;
					if (params.personalityPrompt !== undefined)
						updateData.personalityPrompt = params.personalityPrompt;
					if (params.providerId !== undefined) updateData.providerId = params.providerId;
					if (params.isPresident !== undefined) updateData.isPresident = params.isPresident;
					if (params.isDefault !== undefined) updateData.isDefault = params.isDefault;

					const persona = await personaRepo.update(params.id as string, userId, updateData);
					if (!persona) {
						return { error: 'Persona not found' };
					}
					return persona;
				} catch (error) {
					return {
						error: error instanceof Error ? error.message : 'Failed to update persona'
					};
				}
			}
		},
		{
			name: 'delete_council_persona',
			description:
				'Delete a council persona. System personas cannot be deleted and will return an error.',
			parameters: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Persona ID to delete' }
				},
				required: ['id']
			},
			metadata: { submodule: 'personas' },
			execute: async (params) => {
				try {
					const persona = await personaRepo.getById(params.id as string, userId);
					if (!persona) {
						return { error: 'Persona not found' };
					}
					if (persona.isSystem) {
						return { error: 'Cannot delete system personas' };
					}
					const success = await personaRepo.delete(params.id as string);
					return { success, id: params.id };
				} catch (error) {
					return {
						error: error instanceof Error ? error.message : 'Failed to delete persona'
					};
				}
			}
		},

		// ============== CONVERSATIONS ==============
		{
			name: 'get_council_conversations',
			description: 'Retrieve council conversation history.',
			parameters: {
				type: 'object',
				properties: {
					limit: {
						type: 'number',
						description: 'Maximum results (default: 50)'
					},
					stage: {
						type: 'string',
						enum: ['initial_responses', 'peer_review', 'synthesis', 'completed'],
						description: 'Filter by conversation stage'
					}
				}
			},
			metadata: { submodule: 'conversations' },
			execute: async (params) => {
				const limit = (params.limit as number) || 50;
				let conversations = await conversationRepo.getByUserId(userId, limit);

				if (params.stage) {
					conversations = conversations.filter((c) => c.stage === params.stage);
				}

				return conversations;
			}
		},
		{
			name: 'get_council_conversation',
			description: 'Get a specific council conversation including all messages.',
			parameters: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Conversation ID' }
				},
				required: ['id']
			},
			metadata: { submodule: 'conversations' },
			execute: async (params) => {
				const conversation = await conversationRepo.getById(params.id as string, userId);
				if (!conversation) {
					return { error: 'Conversation not found' };
				}

				// Fetch messages for this conversation
				const messages = await messageRepo.getByConversationId(params.id as string);

				return {
					...conversation,
					messages
				};
			}
		},
		{
			name: 'search_council_conversations',
			description: 'Search council conversations by query content or title.',
			parameters: {
				type: 'object',
				properties: {
					query: { type: 'string', description: 'Search term' },
					limit: {
						type: 'number',
						description: 'Maximum results (default: 20)'
					}
				},
				required: ['query']
			},
			metadata: { submodule: 'conversations' },
			execute: async (params) => {
				const limit = (params.limit as number) || 20;
				return await conversationRepo.searchByUserId(userId, params.query as string, limit);
			}
		},
		{
			name: 'update_council_conversation',
			description: 'Update a council conversation metadata (decision summary, tags).',
			parameters: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Conversation ID' },
					decisionSummary: {
						type: 'string',
						description: 'Final decision or summary'
					},
					tags: {
						type: 'array',
						items: { type: 'string' },
						description: 'Tags for categorization'
					}
				},
				required: ['id']
			},
			metadata: { submodule: 'conversations' },
			execute: async (params) => {
				try {
					const updateData: Record<string, unknown> = {};
					if (params.decisionSummary !== undefined)
						updateData.decisionSummary = params.decisionSummary;
					if (params.tags !== undefined) updateData.tags = JSON.stringify(params.tags);

					const conversation = await conversationRepo.update(
						params.id as string,
						userId,
						updateData
					);
					if (!conversation) {
						return { error: 'Conversation not found' };
					}
					return conversation;
				} catch (error) {
					return {
						error: error instanceof Error ? error.message : 'Failed to update conversation'
					};
				}
			}
		},

		// ============== MESSAGES ==============
		{
			name: 'get_council_messages',
			description: 'Get messages for a council conversation, optionally filtered by stage.',
			parameters: {
				type: 'object',
				properties: {
					conversationId: { type: 'string', description: 'Conversation ID' },
					stage: {
						type: 'string',
						enum: ['initial_responses', 'peer_review', 'synthesis', 'completed'],
						description: 'Filter by message stage'
					}
				},
				required: ['conversationId']
			},
			metadata: { submodule: 'messages' },
			execute: async (params) => {
				const messages = await messageRepo.getByConversationId(
					params.conversationId as string,
					params.stage as
						| 'initial_responses'
						| 'peer_review'
						| 'synthesis'
						| 'completed'
						| undefined
				);
				return messages;
			}
		},

		// ============== COUNCIL EXECUTION ==============
		{
			name: 'ask_council',
			description:
				"Run a full 3-stage council consultation with multiple AI personas. Stage 1: Each persona provides their perspective. Stage 2: Personas review and rank each other's responses. Stage 3: President persona synthesizes all perspectives into a comprehensive answer. IMPORTANT: This can take several minutes depending on the number of personas.",
			parameters: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description: 'The question to ask the council'
					},
					personaIds: {
						type: 'array',
						items: { type: 'string' },
						description:
							'Persona IDs to use for council members. If not provided, automatically selects appropriate personas (defaults first, then most recent).'
					},
					presidentPersonaId: {
						type: 'string',
						description:
							'President persona ID for synthesis. If not provided, uses the first available president.'
					}
				},
				required: ['query']
			},
			metadata: { submodule: 'council' },
			execute: async (params) => {
				try {
					const query = params.query as string;
					const personaIds = params.personaIds as string[] | undefined;
					const presidentPersonaId = params.presidentPersonaId as string | undefined;

					// Get settings for max tokens configuration
					const settings = await settingsRepo.getOrCreate(userId);
					const councilConfig: CouncilExecutorConfig = {
						maxTokensStage1: settings.maxTokensStage1 ?? DEFAULT_MAX_TOKENS.stage1,
						maxTokensStage2: settings.maxTokensStage2 ?? DEFAULT_MAX_TOKENS.stage2,
						maxTokensStage3: settings.maxTokensStage3 ?? DEFAULT_MAX_TOKENS.stage3
					};

					// Get personas - either specified or auto-selected
					let selectedPersonas: Awaited<ReturnType<PersonaRepository['getByUserId']>>;
					let presidentPersona: Awaited<ReturnType<PersonaRepository['getById']>>;
					let selectionInfo: {
						usedDefaults: boolean;
						selectedMembers: string[];
						selectedPresident: string | null;
						message: string;
					};

					if (personaIds && personaIds.length > 0) {
						// User specified personas
						selectedPersonas = await personaRepo.getByIds(personaIds, userId);
						presidentPersona = presidentPersonaId
							? await personaRepo.getById(presidentPersonaId, userId)
							: (await selectPersonasForCouncil(personaRepo, userId)).presidents[0] || null;
						selectionInfo = {
							usedDefaults: false,
							selectedMembers: selectedPersonas.map((p) => p.name),
							selectedPresident: presidentPersona?.name || null,
							message: `Using specified personas: ${selectedPersonas.map((p) => p.name).join(', ')}`
						};
					} else {
						// Auto-select personas
						const selection = await selectPersonasForCouncil(personaRepo, userId);
						selectedPersonas = selection.members;
						presidentPersona = presidentPersonaId
							? await personaRepo.getById(presidentPersonaId, userId)
							: selection.presidents[0] || null;
						selectionInfo = selection.selectionInfo;
					}

					if (selectedPersonas.length === 0) {
						return {
							error: 'No personas available. Please create personas in Settings first.',
							success: false
						};
					}

					// Validate all personas have configured providers
					for (const persona of selectedPersonas) {
						const validation = validatePersonaProvider(persona);
						if (!validation.valid) {
							return {
								error: validation.error,
								success: false
							};
						}
					}

					if (presidentPersona) {
						const validation = validatePersonaProvider(presidentPersona);
						if (!validation.valid) {
							return {
								error: validation.error,
								success: false
							};
						}
					}

					console.log(`[ask_council] ${selectionInfo.message}`);

					// Create conversation
					const conversation = await conversationRepo.create(
						userId,
						query,
						selectedPersonas.map((p) => p.id),
						presidentPersona?.id
					);

					// Save user message
					await messageRepo.create({
						userId,
						conversationId: conversation.id,
						role: 'user',
						content: query,
						stage: 'initial_responses' as PersonaConversationStage
					});

					// Run the 3-stage council process
					const councilResult = await runCouncilWithTimeout(
						query,
						selectedPersonas,
						presidentPersona,
						councilConfig,
						DEFAULT_TIMEOUT_MS
					);

					// Save stage 1 messages
					for (const response of councilResult.stage1Responses) {
						await messageRepo.create({
							userId,
							conversationId: conversation.id,
							personaId: response.personaId,
							role: 'assistant',
							content: response.content,
							stage: 'initial_responses' as PersonaConversationStage
						});
					}

					// Save stage 2 rankings
					for (const ranking of councilResult.stage2Rankings) {
						await messageRepo.create({
							userId,
							conversationId: conversation.id,
							personaId: ranking.reviewerPersonaId,
							role: 'assistant',
							content: JSON.stringify(ranking.rankings),
							stage: 'peer_review' as PersonaConversationStage,
							rankings: ranking.rankings
						});
					}

					// Save stage 3 synthesis
					if (presidentPersona && councilResult.stage3Synthesis) {
						await messageRepo.create({
							userId,
							conversationId: conversation.id,
							personaId: presidentPersona.id,
							role: 'assistant',
							content: councilResult.stage3Synthesis,
							stage: 'synthesis' as PersonaConversationStage
						});
					}

					// Update conversation to complete
					await conversationRepo.updateStage(
						conversation.id,
						userId,
						'completed' as PersonaConversationStage
					);

					return {
						success: true,
						conversationId: conversation.id,
						selectionInfo,
						result: {
							stage1Responses: councilResult.stage1Responses.map((r) => ({
								personaId: r.personaId,
								personaName: r.personaName,
								content: r.content
							})),
							stage2Rankings: councilResult.stage2Rankings.map((r) => ({
								reviewerPersonaId: r.reviewerPersonaId,
								reviewerPersonaName: r.reviewerPersonaName,
								rankings: r.rankings
							})),
							stage3Synthesis: councilResult.stage3Synthesis
						}
					};
				} catch (error) {
					console.error('[ask_council] Error:', error);
					return {
						error: error instanceof Error ? error.message : 'An unexpected error occurred',
						success: false
					};
				}
			}
		},
		{
			name: 'ask_council_quick',
			description:
				"Quick council consultation using automatically selected personas. Runs the full 3-stage process with default settings. Use this for fast consultations when you don't need to customize personas. The system will automatically select appropriate personas (defaults first, then most recent). IMPORTANT: This can take several minutes.",
			parameters: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description: 'The question to ask the council'
					}
				},
				required: ['query']
			},
			metadata: { submodule: 'council' },
			execute: async (params) => {
				try {
					const query = params.query as string;

					// Get settings for max tokens configuration
					const settings = await settingsRepo.getOrCreate(userId);
					const councilConfig: CouncilExecutorConfig = {
						maxTokensStage1: settings.maxTokensStage1 ?? DEFAULT_MAX_TOKENS.stage1,
						maxTokensStage2: settings.maxTokensStage2 ?? DEFAULT_MAX_TOKENS.stage2,
						maxTokensStage3: settings.maxTokensStage3 ?? DEFAULT_MAX_TOKENS.stage3
					};

					// Auto-select personas
					const { members, presidents, selectionInfo } = await selectPersonasForCouncil(
						personaRepo,
						userId
					);

					if (members.length === 0) {
						return {
							error: 'No personas available. Please create personas in Settings first.',
							success: false
						};
					}

					const presidentPersona = presidents[0] || null;

					// Validate all personas have configured providers
					for (const persona of members) {
						const validation = validatePersonaProvider(persona);
						if (!validation.valid) {
							return {
								error: validation.error,
								success: false
							};
						}
					}

					if (presidentPersona) {
						const validation = validatePersonaProvider(presidentPersona);
						if (!validation.valid) {
							return {
								error: validation.error,
								success: false
							};
						}
					}

					console.log(`[ask_council_quick] ${selectionInfo.message}`);

					// Create conversation
					const conversation = await conversationRepo.create(
						userId,
						query,
						members.map((p) => p.id),
						presidentPersona?.id
					);

					// Save user message
					await messageRepo.create({
						userId,
						conversationId: conversation.id,
						role: 'user',
						content: query,
						stage: 'initial_responses' as PersonaConversationStage
					});

					// Run the 3-stage council process
					const councilResult = await runCouncilWithTimeout(
						query,
						members,
						presidentPersona,
						councilConfig,
						DEFAULT_TIMEOUT_MS
					);

					// Save stage 1 messages
					for (const response of councilResult.stage1Responses) {
						await messageRepo.create({
							userId,
							conversationId: conversation.id,
							personaId: response.personaId,
							role: 'assistant',
							content: response.content,
							stage: 'initial_responses' as PersonaConversationStage
						});
					}

					// Save stage 2 rankings
					for (const ranking of councilResult.stage2Rankings) {
						await messageRepo.create({
							userId,
							conversationId: conversation.id,
							personaId: ranking.reviewerPersonaId,
							role: 'assistant',
							content: JSON.stringify(ranking.rankings),
							stage: 'peer_review' as PersonaConversationStage,
							rankings: ranking.rankings
						});
					}

					// Save stage 3 synthesis
					if (presidentPersona && councilResult.stage3Synthesis) {
						await messageRepo.create({
							userId,
							conversationId: conversation.id,
							personaId: presidentPersona.id,
							role: 'assistant',
							content: councilResult.stage3Synthesis,
							stage: 'synthesis' as PersonaConversationStage
						});
					}

					// Update conversation to complete
					await conversationRepo.updateStage(
						conversation.id,
						userId,
						'completed' as PersonaConversationStage
					);

					return {
						success: true,
						conversationId: conversation.id,
						selectionInfo,
						synthesis: councilResult.stage3Synthesis,
						perspectives: councilResult.stage1Responses.map((r) => ({
							personaName: r.personaName,
							summary: r.content.length > 200 ? r.content.substring(0, 200) + '...' : r.content
						}))
					};
				} catch (error) {
					console.error('[ask_council_quick] Error:', error);
					return {
						error: error instanceof Error ? error.message : 'An unexpected error occurred',
						success: false
					};
				}
			}
		},
		{
			name: 'get_default_council_personas',
			description:
				'Get the personas available for council consultations. Returns members (non-president personas) and presidents (synthesis-capable personas). Use this to discover which personas will be auto-selected.',
			parameters: {
				type: 'object',
				properties: {}
			},
			metadata: { submodule: 'council' },
			execute: async () => {
				try {
					const allPersonas = await personaRepo.getByUserId(userId);
					const presidents = allPersonas.filter((p) => p.isPresident);
					const defaultMembers = allPersonas.filter((p) => !p.isPresident && p.isDefault);
					const nonDefaultMembers = allPersonas.filter((p) => !p.isPresident && !p.isDefault);

					return {
						defaultMembers: defaultMembers.map((p) => ({
							id: p.id,
							name: p.name,
							avatar: p.avatar,
							description: p.description,
							isDefault: p.isDefault
						})),
						otherMembers: nonDefaultMembers.map((p) => ({
							id: p.id,
							name: p.name,
							avatar: p.avatar,
							description: p.description,
							isDefault: p.isDefault
						})),
						presidents: presidents.map((p) => ({
							id: p.id,
							name: p.name,
							avatar: p.avatar,
							description: p.description
						})),
						selectionExplanation:
							defaultMembers.length > 0
								? 'Default personas will be used first when asking the council.'
								: 'No default personas configured. The most recent 3 non-president personas will be auto-selected.'
					};
				} catch (error) {
					console.error('[get_default_council_personas] Error:', error);
					return {
						error: error instanceof Error ? error.message : 'An unexpected error occurred',
						success: false
					};
				}
			}
		}
	];
}
