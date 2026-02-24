<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import {
		Loader2,
		Save,
		Key,
		Plus,
		Trash2,
		Edit,
		CheckCircle,
		ArrowLeft
	} from 'lucide-svelte';
	import {
		settingsStore,
		loadSettings,
		updateSettings
	} from '../../../stores/council.store.js';
	import {
		loadProviders,
		createProvider,
		updateProvider,
		deleteProvider,
		setDefaultProvider
	} from '../../../stores/personas.store.js';
	import type { AIProvider, ProviderType } from '../../../models/index.js';

	const PROVIDER_TYPES = [
		{ value: 'openrouter', label: 'OpenRouter' },
		{ value: 'openai', label: 'OpenAI' },
		{ value: 'anthropic', label: 'Anthropic' },
		{ value: 'custom', label: 'Custom' }
	] as const;

	let providers = $state<AIProvider[]>([]);
	let isSaving = $state(false);
	let isSavingProvider = $state(false);
	let isDeleting = $state('');

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

	let streamingEnabled = $state(true);
	let customStage1Prompt = $state('');
	let customStage2Prompt = $state('');
	let customStage3Prompt = $state('');

	onMount(async () => {
		await loadProviders();
		const settings = await loadSettings();

		if (settings) {
			streamingEnabled = settings.streamingEnabled ?? true;
			customStage1Prompt = settings.customStage1Prompt || '';
			customStage2Prompt = settings.customStage2Prompt || '';
			customStage3Prompt = settings.customStage3Prompt || '';
		}
	});

	async function handleSaveSettings() {
		isSaving = true;
		try {
			await updateSettings({
				streamingEnabled,
				customStage1Prompt: customStage1Prompt.trim() || undefined,
				customStage2Prompt: customStage2Prompt.trim() || undefined,
				customStage3Prompt: customStage3Prompt.trim() || undefined
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
			await createProvider({
				type: newProvider.type,
				name: newProvider.name,
				apiUrl: newProvider.apiUrl,
				apiToken: newProvider.apiToken,
				model: newProvider.model,
				isDefault: false
			});
			await loadProviders();
			showCreateForm = false;
			newProvider = {
				type: 'openrouter',
				name: '',
				apiUrl: '',
				apiToken: '',
				model: ''
			};
		} catch (err) {
			console.error('Failed to create provider:', err);
		} finally {
			isSavingProvider = false;
		}
	}

	async function handleSetDefault(id: string) {
		try {
			await setDefaultProvider(id);
			await loadProviders();
		} catch (err) {
			console.error('Failed to set default provider:', err);
		}
	}

	function handleEditProvider(provider: AIProvider) {
		editingProvider = { ...provider };
		showCreateForm = true;
	}

	async function handleUpdateProvider() {
		if (!editingProvider) return;

		isSavingProvider = true;
		try {
			await updateProvider(editingProvider.id, editingProvider);
			await loadProviders();
			editingProvider = null;
			showCreateForm = false;
		} catch (err) {
			console.error('Failed to update provider:', err);
		} finally {
			isSavingProvider = false;
		}
	}

	async function handleDeleteProvider(id: string) {
		if (!confirm('Are you sure you want to delete this provider?')) return;

		isDeleting = id;
		try {
			await deleteProvider(id);
			await loadProviders();
		} catch (err) {
			console.error('Failed to delete provider:', err);
		} finally {
			isDeleting = '';
		}
	}

	function handleProviderTypeChange(type: ProviderType) {
		newProvider.type = type;

		switch (type) {
			case 'openrouter':
				newProvider.apiUrl = 'https://openrouter.ai/api/v1';
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
</script>

<div class="min-h-screen bg-background">
	<div class="border-b">
		<div class="container-fluid px-4 py-3">
			<div class="flex items-center justify-between">
				<h1 class="text-xl font-bold">Council Settings</h1>
				<Button variant="ghost" size="sm" onclick={() => goto('/ui/MoLOS-LLM-Council')}>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Back to Council
				</Button>
			</div>
		</div>
	</div>

	<main class="container-fluid px-4 py-6">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
								}}
							>
								<Plus class="mr-1 h-4 w-4" />
								{showCreateForm ? 'Cancel' : 'Add Provider'}
							</Button>
						</div>
						<CardDescription>
							Configure AI providers for your council. Personas will use these providers to generate responses.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{#if showCreateForm}
							<div class="space-y-4 p-4 border rounded-lg bg-muted/50">
								<h3 class="mb-4 font-semibold">
									{editingProvider ? 'Edit Provider' : 'Add New Provider'}
								</h3>

								<div class="space-y-2">
									<Label for="providerType">Provider Type</Label>
									<select
										bind:value={newProvider.type}
										onchange={(e) => handleProviderTypeChange((e.target as HTMLSelectElement).value as ProviderType)}
										class="provider-select"
									>
										{#each PROVIDER_TYPES as type}
											<option value={type.value}>{type.label}</option>
										{/each}
									</select>
								</div>

								<div class="space-y-2">
									<Label for="providerName">Name</Label>
									<Input
										id="providerName"
										bind:value={newProvider.name}
										placeholder="e.g., OpenRouter Account"
									/>
								</div>

								<div class="space-y-2">
									<Label for="providerUrl">API URL</Label>
									<Input
										id="providerUrl"
										bind:value={newProvider.apiUrl}
										placeholder="https://api.example.com/v1"
									/>
								</div>

								<div class="space-y-2">
									<Label for="providerToken">API Token</Label>
									<Input
										id="providerToken"
										type="password"
										bind:value={newProvider.apiToken}
										placeholder="sk-..."
									/>
								</div>

								<div class="space-y-2">
									<Label for="providerModel">Default Model</Label>
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
											editingProvider = null;
											showCreateForm = false;
											newProvider = {
												type: 'openrouter',
												name: '',
												apiUrl: '',
												apiToken: '',
												model: ''
											};
										}}
									>
										Cancel
									</Button>
									<Button
										onclick={editingProvider ? handleUpdateProvider : handleCreateProvider}
										disabled={
											isSavingProvider ||
											!newProvider.name.trim() ||
											!newProvider.apiUrl.trim() ||
											!newProvider.model.trim()
										}
									>
										{#if isSavingProvider}
											<Loader2 class="mr-2 h-4 w-4 animate-spin" />
										{/if}
										{editingProvider ? 'Update' : 'Create'} Provider
									</Button>
								</div>
							</div>
						{:else}
							{#if providers.length === 0}
								<div class="text-center py-8 text-muted-foreground">
									<p>No providers configured yet.</p>
									<p class="text-sm">Add a provider to start using the council.</p>
								</div>
							{:else}
								<div class="space-y-3">
									{#each providers as provider}
										<div class="provider-card {provider.isDefault ? 'default' : ''}">
											<div class="provider-header">
												<div class="provider-info">
													<span class="provider-type">{PROVIDER_TYPES.find(t => t.value === provider.type)?.label || provider.type}</span>
													<h4 class="provider-name">{provider.name}</h4>
												</div>
												{#if provider.isDefault}
													<span class="default-badge">
														<CheckCircle class="h-4 w-4" />
														Default
													</span>
												{/if}
											</div>

											<div class="provider-details">
												<div class="detail-row">
													<span class="detail-label">Model:</span>
													<code class="detail-value">{provider.model}</code>
												</div>
												<div class="detail-row">
													<span class="detail-label">URL:</span>
													<code class="detail-value">{provider.apiUrl}</code>
												</div>
											</div>

											<div class="provider-actions">
												{#if !provider.isDefault}
													<Button
														variant="ghost"
														size="sm"
														onclick={() => handleSetDefault(provider.id)}
														title="Set as default"
													>
														<CheckCircle class="h-4 w-4" />
													</Button>
												{/if}
												<Button
													variant="ghost"
													size="sm"
													onclick={() => handleEditProvider(provider)}
													title="Edit provider"
												>
													<Edit class="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													class="destructive"
													onclick={() => handleDeleteProvider(provider.id)}
													disabled={isDeleting === provider.id}
													title="Delete provider"
												>
													{#if isDeleting === provider.id}
														<Loader2 class="h-4 w-4 animate-spin" />
													{:else}
														<Trash2 class="h-4 w-4" />
													{/if}
												</Button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						{/if}
					</CardContent>
				</Card>
			</div>

			<!-- Right Column: Council Settings -->
			<div class="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Streaming Settings</CardTitle>
						<CardDescription>Control how responses are displayed</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="flex items-center justify-between py-2">
							<div class="flex-1">
								<Label for="streaming">Enable Streaming</Label>
								<p class="text-sm text-muted-foreground">
									Show responses as they are generated
								</p>
							</div>
							<Switch
								id="streaming"
								checked={streamingEnabled}
								onCheckedChange={(v) => (streamingEnabled = v)}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Custom Prompts</CardTitle>
						<CardDescription>
							Customize the system prompts for each council stage. Leave empty to use defaults.
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
		<div class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
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
</div>

<style>
	.container-fluid {
		width: 100%;
		max-width: 100%;
		padding: 0 1rem;
	}

	.provider-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		transition: all 0.2s;
	}

	.provider-card:hover {
		border-color: #667eea;
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
	}

	.provider-card.default {
		background: linear-gradient(135deg, #f0fdf4 0%, #dbeafe 100%);
		border-color: #93c5fd;
	}

	.provider-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.provider-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.provider-type {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background: #667eea;
		color: white;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.provider-name {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.default-badge {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: #22c55e;
		color: white;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.provider-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.detail-label {
		font-size: 0.75rem;
		color: #6b7280;
		min-width: 3rem;
	}

	.detail-value {
		font-size: 0.75rem;
		padding: 0.125rem 0.375rem;
		background: #f3f4f6;
		border-radius: 0.25rem;
		color: #e11d48;
	}

	.provider-actions {
		display: flex;
		gap: 0.25rem;
		margin-top: auto;
	}

	.provider-select {
		width: 100%;
		padding: 0.5rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		background: white;
	}
</style>
