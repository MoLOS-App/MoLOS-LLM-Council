<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import {
		Loader2,
		Save,
		Key,
		Plus,
		Trash2,
		Edit,
		CheckCircle,
		ArrowLeft,
		X,
		Copy
	} from 'lucide-svelte';
	import { loadSettings, updateSettings } from '../../../stores/council.store.js';
	import type { AIProvider, ProviderType } from '../../../models/index.js';

	const PROVIDER_TYPES = [
		{ value: 'openrouter', label: 'OpenRouter' },
		{ value: 'zai', label: 'Z.AI (General)' },
		{ value: 'zai_coding', label: 'Z.AI (Coding)' },
		{ value: 'openai', label: 'OpenAI' },
		{ value: 'anthropic', label: 'Anthropic' },
		{ value: 'custom', label: 'Custom' }
	] as const;

	let providers = $state<AIProvider[]>([]);
	let isSaving = $state(false);
	let isSavingProvider = $state(false);
	let isDeleting = $state('');
	let openAccordionItems = $state<string[]>([]);
	let showDeleteDialog = $state(false);
	let pendingDeleteId = $state<string | null>(null);

	let editingProvider = $state<AIProvider | null>(null);
	let showCreateForm = $state(false);

	let newProvider = $state<{
		type: ProviderType;
		name: string;
		apiUrl: string;
		apiToken: string;
		model: string;
	}>({
		type: 'openrouter',
		name: '',
		apiUrl: '',
		apiToken: '',
		model: ''
	});

	let customStage1Prompt = $state('');
	let customStage2Prompt = $state('');
	let customStage3Prompt = $state('');
	let maxTokensStage1 = $state(1024);
	let maxTokensStage2 = $state(512);
	let maxTokensStage3 = $state(4096);

	async function loadProvidersData() {
		const response = await fetch('/api/MoLOS-LLM-Council/providers');
		if (response.ok) {
			const data = await response.json();
			providers = data.providers || [];
		}
	}

	onMount(async () => {
		await loadProvidersData();
		const settings = await loadSettings();

		if (settings) {
			customStage1Prompt = settings.customStage1Prompt || '';
			customStage2Prompt = settings.customStage2Prompt || '';
			customStage3Prompt = settings.customStage3Prompt || '';
			maxTokensStage1 = settings.maxTokensStage1 ?? 1024;
			maxTokensStage2 = settings.maxTokensStage2 ?? 512;
			maxTokensStage3 = settings.maxTokensStage3 ?? 4096;
		}
	});

	async function handleSaveSettings() {
		isSaving = true;
		try {
			await updateSettings({
				customStage1Prompt: customStage1Prompt.trim() || undefined,
				customStage2Prompt: customStage2Prompt.trim() || undefined,
				customStage3Prompt: customStage3Prompt.trim() || undefined,
				maxTokensStage1,
				maxTokensStage2,
				maxTokensStage3
			});
		} catch (err) {
			console.error('Failed to save settings:', err);
		} finally {
			isSaving = false;
		}
	}

	async function handleCreateProvider() {
		isSavingProvider = true;
		try {
			const response = await fetch('/api/MoLOS-LLM-Council/providers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: newProvider.type,
					name: newProvider.name,
					apiUrl: newProvider.apiUrl,
					apiToken: newProvider.apiToken,
					model: newProvider.model,
					isDefault: false
				})
			});

			if (response.ok) {
				await loadProvidersData();
				showCreateForm = false;
				newProvider = {
					type: 'openrouter',
					name: '',
					apiUrl: '',
					apiToken: '',
					model: ''
				};
			}
		} catch (err) {
			console.error('Failed to create provider:', err);
		} finally {
			isSavingProvider = false;
		}
	}

	async function handleSetDefault(id: string) {
		try {
			await fetch(`/api/MoLOS-LLM-Council/providers/${id}`, {
				method: 'POST'
			});
			await loadProvidersData();
		} catch (err) {
			console.error('Failed to set default provider:', err);
		}
	}

	function handleEditProvider(provider: AIProvider) {
		editingProvider = { ...provider };
		newProvider = {
			type: provider.type,
			name: provider.name,
			apiUrl: provider.apiUrl,
			apiToken: provider.apiToken,
			model: provider.model
		};
		openAccordionItems = [provider.id];
	}

	async function handleUpdateProvider() {
		if (!editingProvider) return;

		isSavingProvider = true;
		try {
			const response = await fetch(`/api/MoLOS-LLM-Council/providers/${editingProvider.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: newProvider.type,
					name: newProvider.name,
					apiUrl: newProvider.apiUrl,
					apiToken: newProvider.apiToken,
					model: newProvider.model
				})
			});

			if (response.ok) {
				await loadProvidersData();
				editingProvider = null;
				openAccordionItems = [];
				newProvider = {
					type: 'openrouter',
					name: '',
					apiUrl: '',
					apiToken: '',
					model: ''
				};
			}
		} catch (err) {
			console.error('Failed to update provider:', err);
		} finally {
			isSavingProvider = false;
		}
	}

	function handleCancelEdit() {
		editingProvider = null;
		openAccordionItems = [];
		newProvider = {
			type: 'openrouter',
			name: '',
			apiUrl: '',
			apiToken: '',
			model: ''
		};
	}

	async function handleDeleteProvider(id: string) {
		pendingDeleteId = id;
		showDeleteDialog = true;
	}

	async function confirmDeleteProvider() {
		if (!pendingDeleteId) return;

		isDeleting = pendingDeleteId;
		try {
			const response = await fetch(`/api/MoLOS-LLM-Council/providers/${pendingDeleteId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await loadProvidersData();
				openAccordionItems = openAccordionItems.filter((item) => item !== pendingDeleteId);
			}
		} catch (err) {
			console.error('Failed to delete provider:', err);
		} finally {
			isDeleting = '';
			showDeleteDialog = false;
			pendingDeleteId = null;
		}
	}

	function handleProviderTypeChange(type: ProviderType) {
		newProvider.type = type;

		switch (type) {
			case 'openrouter':
				newProvider.apiUrl = 'https://openrouter.ai/api/v1';
				break;
			case 'zai':
				newProvider.apiUrl = 'https://api.z.ai/api/paas/v4';
				break;
			case 'zai_coding':
				newProvider.apiUrl = 'https://api.z.ai/api/coding/paas/v4';
				break;
			case 'openai':
				newProvider.apiUrl = 'https://api.openai.com/v1';
				break;
			case 'anthropic':
				newProvider.apiUrl = 'https://api.anthropic.com/v1';
				break;
			case 'custom':
				newProvider.apiUrl = '';
				break;
		}
	}

	function handleDuplicateProvider(provider: AIProvider) {
		// Pre-fill the create form with the provider's data
		newProvider = {
			type: provider.type,
			name: `Copy of ${provider.name}`,
			apiUrl: provider.apiUrl,
			apiToken: provider.apiToken || '',
			model: provider.model
		};
		editingProvider = null;
		showCreateForm = true;
		openAccordionItems = ['new'];
	}

	function getProviderLabel(type: ProviderType): string {
		return PROVIDER_TYPES.find((t) => t.value === type)?.label || type;
	}
</script>

<div class="min-h-screen bg-background">
	<main class="container-fluid px-4 py-6">
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Left Column: Providers -->
			<div class="space-y-6">
				<Card>
					<CardHeader>
						<div class="flex items-center justify-between">
							<CardTitle class="flex items-center gap-2">
								<Key class="h-5 w-5" />
								AI Providers
							</CardTitle>
							<Button
								variant="outline"
								size="sm"
								onclick={() => {
									editingProvider = null;
									showCreateForm = !showCreateForm;
									if (showCreateForm) {
										openAccordionItems = ['new'];
									} else {
										openAccordionItems = [];
									}
								}}
							>
								<Plus class="mr-1 h-4 w-4" />
								{showCreateForm ? 'Cancel' : 'Add Provider'}
							</Button>
						</div>
						<CardDescription>
							Configure AI providers for your council. Personas will use these providers to generate
							responses.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Accordion.Root
							bind:value={openAccordionItems}
							type="multiple"
							class="w-full space-y-3"
						>
							{#if showCreateForm}
								<Accordion.Item value="new" class="rounded-xl border">
									<Accordion.Trigger class="px-4">
										<div class="flex items-center gap-2">
											<Plus class="h-4 w-4" />
											<span>Add New Provider</span>
										</div>
									</Accordion.Trigger>
									<Accordion.Content class="px-4 pb-4">
										<div class="space-y-4 pt-2">
											<div class="space-y-2">
												<Label for="providerType">Provider Type</Label>
												<select
													id="providerType"
													bind:value={newProvider.type}
													onchange={(e) =>
														handleProviderTypeChange(
															(e.target as HTMLSelectElement).value as ProviderType
														)}
													class="border-input w-full rounded-md border bg-background px-3 py-2 text-sm"
												>
													{#each PROVIDER_TYPES as type}
														<option value={type.value}>{type.label}</option>
													{/each}
												</select>
											</div>

											<div class="space-y-2">
												<Label for="providerName">Name *</Label>
												<Input
													id="providerName"
													bind:value={newProvider.name}
													placeholder="e.g., OpenRouter Account"
												/>
											</div>

											<div class="space-y-2">
												<Label for="providerUrl">API URL *</Label>
												<Input
													id="providerUrl"
													bind:value={newProvider.apiUrl}
													placeholder="https://api.example.com/v1"
													autocomplete="off"
												/>
											</div>

											<div class="space-y-2">
												<Label for="providerToken">API Token</Label>
												<Input
													id="providerToken"
													type="password"
													bind:value={newProvider.apiToken}
													placeholder="sk-..."
													autocomplete="off"
												/>
											</div>

											<div class="space-y-2">
												<Label for="providerModel">Default Model *</Label>
												<Input
													id="providerModel"
													bind:value={newProvider.model}
													placeholder="e.g., anthropic/claude-3.5-sonnet"
												/>
											</div>

											<div class="flex gap-2 pt-2">
												<Button
													variant="outline"
													onclick={() => {
														showCreateForm = false;
														editingProvider = null;
														newProvider = {
															type: 'openrouter',
															name: '',
															apiUrl: '',
															apiToken: '',
															model: ''
														};
														openAccordionItems = [];
													}}
												>
													<X class="mr-1 h-3 w-3" />
													Cancel
												</Button>
												<Button
													onclick={handleCreateProvider}
													disabled={isSavingProvider ||
														!newProvider.name.trim() ||
														!newProvider.apiUrl.trim() ||
														!newProvider.model.trim()}
												>
													{#if isSavingProvider}
														<Loader2 class="mr-2 h-4 w-4 animate-spin" />
													{/if}
													Create Provider
												</Button>
											</div>
										</div>
									</Accordion.Content>
								</Accordion.Item>
							{/if}

							{#if providers.length === 0}
								<div class="text-muted-foreground py-8 text-center">
									<Key class="mx-auto mb-2 h-12 w-12 opacity-50" />
									<p>No providers configured yet.</p>
									<p class="text-sm">Add a provider to start using council.</p>
								</div>
							{:else}
								{#each providers as provider}
									{@const isEditing = editingProvider?.id === provider.id}
									{@const isDefault = provider.isDefault}

									<Accordion.Item value={provider.id} class="rounded-xl border">
										<Accordion.Trigger class="px-4">
											<div class="flex items-center gap-3">
												<div
													class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
												>
													<Key class="h-4 w-4 text-primary" />
												</div>
												<div class="flex min-w-0 flex-1 flex-col items-start gap-1">
													<div class="flex items-center gap-2">
														<span class="truncate text-sm font-semibold">
															{provider.name}
														</span>
														{#if isDefault}
															<Badge variant="default" class="text-xs">Default</Badge>
														{/if}
													</div>
													<span class="text-muted-foreground text-xs">
														{getProviderLabel(provider.type)} · {provider.model}
													</span>
												</div>
											</div>
										</Accordion.Trigger>

										<Accordion.Content class="px-4 pb-4">
											<div class="space-y-4 pt-2">
												{#if isEditing}
													<div class="space-y-3">
														<div class="space-y-2">
															<Label>Provider Type</Label>
															<select
																bind:value={newProvider.type}
																onchange={(e) =>
																	handleProviderTypeChange(
																		(e.target as HTMLSelectElement).value as ProviderType
																	)}
																class="border-input w-full rounded-md border bg-background px-3 py-2 text-sm"
															>
																{#each PROVIDER_TYPES as type}
																	<option value={type.value}>{type.label}</option>
																{/each}
															</select>
														</div>

														<div class="space-y-2">
															<Label>Name *</Label>
															<Input bind:value={newProvider.name} />
														</div>

														<div class="space-y-2">
															<Label>API URL *</Label>
															<Input bind:value={newProvider.apiUrl} autocomplete="off" />
														</div>

														<div class="space-y-2">
															<Label>API Token</Label>
															<Input
																type="password"
																bind:value={newProvider.apiToken}
																placeholder="Leave unchanged"
																autocomplete="off"
															/>
														</div>

														<div class="space-y-2">
															<Label>Default Model *</Label>
															<Input bind:value={newProvider.model} />
														</div>

														<div class="flex gap-2 pt-2">
															<Button variant="outline" onclick={handleCancelEdit}>
																<X class="mr-1 h-3 w-3" />
																Cancel
															</Button>
															<Button
																onclick={handleUpdateProvider}
																disabled={isSavingProvider ||
																	!newProvider.name.trim() ||
																	!newProvider.apiUrl.trim() ||
																	!newProvider.model.trim()}
															>
																{#if isSavingProvider}
																	<Loader2 class="mr-2 h-4 w-4 animate-spin" />
																{:else}
																	<Save class="mr-2 h-4 w-4" />
																{/if}
																Save Changes
															</Button>
														</div>
													</div>
												{:else}
													<div class="space-y-3">
														<div class="grid grid-cols-2 gap-3">
															<div>
																<Label class="text-muted-foreground text-xs">Provider Type</Label>
																<div class="mt-1 font-medium">
																	{getProviderLabel(provider.type)}
																</div>
															</div>
															<div>
																<Label class="text-muted-foreground text-xs">Model</Label>
																<div class="mt-1 font-mono text-sm">
																	{provider.model}
																</div>
															</div>
														</div>

														<div>
															<Label class="text-muted-foreground text-xs">API URL</Label>
															<div class="mt-1 font-mono text-sm">
																{provider.apiUrl}
															</div>
														</div>

														<div class="flex flex-wrap gap-2 pt-2">
															{#if !isDefault}
																<Button
																	variant="outline"
																	size="sm"
																	onclick={() => handleSetDefault(provider.id)}
																>
																	<CheckCircle class="mr-1 h-3 w-3" />
																	Set Default
																</Button>
															{/if}

															<Button
																variant="outline"
																size="sm"
																onclick={() => handleEditProvider(provider)}
															>
																<Edit class="mr-1 h-3 w-3" />
																Edit
															</Button>

															<Button
																variant="outline"
																size="sm"
																onclick={() => handleDuplicateProvider(provider)}
															>
																<Copy class="mr-1 h-3 w-3" />
																Duplicate
															</Button>

															<Button
																variant="ghost"
																size="sm"
																class="text-destructive hover:bg-destructive/10"
																onclick={() => handleDeleteProvider(provider.id)}
																disabled={isDeleting === provider.id}
															>
																{#if isDeleting === provider.id}
																	<Loader2 class="h-3 w-3 animate-spin" />
																{:else}
																	<Trash2 class="h-3 w-3" />
																{/if}
																Delete
															</Button>
														</div>
													</div>
												{/if}
											</div>
										</Accordion.Content>
									</Accordion.Item>
								{/each}
							{/if}
						</Accordion.Root>
					</CardContent>
				</Card>
			</div>

			<!-- Right Column: Council Settings -->
			<div class="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Max Tokens</CardTitle>
						<CardDescription>
							Configure response length limits for each stage. Lower values = faster responses.
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<Label for="maxTokens1">Stage 1: Initial Responses</Label>
							<Input
								id="maxTokens1"
								type="number"
								min={256}
								max={8192}
								step={256}
								bind:value={maxTokensStage1}
							/>
							<p class="text-muted-foreground text-xs">
								Tokens per persona response (default: 1024)
							</p>
						</div>

						<div class="space-y-2">
							<Label for="maxTokens2">Stage 2: Peer Review</Label>
							<Input
								id="maxTokens2"
								type="number"
								min={128}
								max={4096}
								step={128}
								bind:value={maxTokensStage2}
							/>
							<p class="text-muted-foreground text-xs">Tokens per review (default: 512)</p>
						</div>

						<div class="space-y-2">
							<Label for="maxTokens3">Stage 3: Synthesis</Label>
							<Input
								id="maxTokens3"
								type="number"
								min={512}
								max={16384}
								step={512}
								bind:value={maxTokensStage3}
							/>
							<p class="text-muted-foreground text-xs">
								Tokens for final synthesis (default: 4096)
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Custom Prompts</CardTitle>
						<CardDescription>
							Customize system prompts for each council stage. Leave empty to use defaults.
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<Label for="stage1Prompt">Stage 1: Initial Responses</Label>
							<Textarea
								id="stage1Prompt"
								placeholder="Custom prompt for stage 1..."
								rows={3}
								bind:value={customStage1Prompt}
							/>
						</div>

						<div class="space-y-2">
							<Label for="stage2Prompt">Stage 2: Peer Review</Label>
							<Textarea
								id="stage2Prompt"
								placeholder="Custom prompt for stage 2..."
								rows={3}
								bind:value={customStage2Prompt}
							/>
						</div>

						<div class="space-y-2">
							<Label for="stage3Prompt">Stage 3: Synthesis</Label>
							<Textarea
								id="stage3Prompt"
								placeholder="Custom prompt for stage 3..."
								rows={3}
								bind:value={customStage3Prompt}
							/>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>

		<!-- Save Settings Button -->
		<div class="relative right-0 bottom-0 left-0 z-0 bg-background p-4">
			<div class="container-fluid flex justify-end">
				<Button onclick={handleSaveSettings} disabled={isSaving} size="lg">
					{#if isSaving}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<Save class="mr-2 h-4 w-4" />
					{/if}
					Save Council Settings
				</Button>
			</div>
		</div>
	</main>

	<!-- Delete Confirmation Dialog -->
	<Dialog.Root bind:open={showDeleteDialog}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Delete Provider?</Dialog.Title>
				<Dialog.Description>
					Are you sure you want to delete this provider? This action cannot be undone.
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showDeleteDialog = false)}>Cancel</Button>
				<Button variant="destructive" onclick={confirmDeleteProvider}>Delete</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>

<style>
	.container-fluid {
		width: 100%;
		max-width: 100%;
		padding: 0 1rem;
	}
</style>
