<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import {
		Loader2,
		Save,
		Key,
		CheckCircle,
		XCircle,
		ArrowLeft
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';

	import {
		settingsStore,
		councilUIState,
		loadSettings,
		updateSettings,
		validateApiKey
	} from '../../../stores/council.store';

	let apiKey = $state('');
	let showApiKey = $state(false);
	let isValidating = $state(false);
	let validationStatus = $state<'idle' | 'success' | 'error'>('idle');
	let customStage1Prompt = $state('');
	let customStage2Prompt = $state('');
	let customStage3Prompt = $state('');
	let streamingEnabled = $state(true);
	let isSaving = $state(false);

	onMount(async () => {
		const settings = await loadSettings();

		// Don't populate API key (it's masked)
		customStage1Prompt = settings.customStage1Prompt || '';
		customStage2Prompt = settings.customStage2Prompt || '';
		customStage3Prompt = settings.customStage3Prompt || '';
		streamingEnabled = settings.streamingEnabled;
	});

	async function handleValidateApiKey() {
		if (!apiKey.trim()) return;

		isValidating = true;
		validationStatus = 'idle';

		try {
			await validateApiKey(apiKey.trim());
			validationStatus = 'success';
			apiKey = ''; // Clear input after success
		} catch (err) {
			validationStatus = 'error';
			console.error('API key validation failed:', err);
		} finally {
			isValidating = false;
		}
	}

	async function handleSave() {
		isSaving = true;

		try {
			await updateSettings({
				customStage1Prompt: customStage1Prompt.trim() || undefined,
				customStage2Prompt: customStage2Prompt.trim() || undefined,
				customStage3Prompt: customStage3Prompt.trim() || undefined,
				streamingEnabled
			});
		} catch (err) {
			console.error('Failed to save settings:', err);
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="container mx-auto max-w-2xl p-4 md:p-6">
	<div class="mb-6">
		<Button variant="ghost" size="sm" onclick={() => goto('/ui/MoLOS-LLM-Council')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Council
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Council Settings</h1>

	<!-- API Key Section -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Key class="h-5 w-5" />
				OpenRouter API Key
			</CardTitle>
			<CardDescription>
				Your API key is stored locally and never sent to our servers.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if $settingsStore?.hasApiKey}
				<div class="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
					<CheckCircle class="h-4 w-4 text-green-500" />
					<span>API key configured: {$settingsStore.openrouterApiKey}</span>
				</div>
			{/if}

			<div class="space-y-2">
				<Label for="apiKey">
					{$settingsStore?.hasApiKey ? 'Update API Key' : 'Enter API Key'}
				</Label>
				<div class="flex gap-2">
					<Input
						id="apiKey"
						type={showApiKey ? 'text' : 'password'}
						placeholder="sk-or-..."
						bind:value={apiKey}
						class="flex-1"
					/>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (showApiKey = !showApiKey)}
					>
						{showApiKey ? 'Hide' : 'Show'}
					</Button>
					<Button
						onclick={handleValidateApiKey}
						disabled={!apiKey.trim() || isValidating}
					>
						{#if isValidating}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else}
							Save
						{/if}
					</Button>
				</div>
				{#if validationStatus === 'success'}
					<p class="text-sm text-green-500">API key saved successfully!</p>
				{:else if validationStatus === 'error'}
					<p class="text-sm text-destructive">Failed to validate API key. Please check and try again.</p>
				{/if}
			</div>

			<p class="text-xs text-muted-foreground">
				Get your API key from
				<a
					href="https://openrouter.ai/keys"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary underline"
				>
					openrouter.ai/keys
				</a>
			</p>
		</CardContent>
	</Card>

	<!-- Streaming Settings -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle>Streaming</CardTitle>
			<CardDescription>
				Control how responses are displayed.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="flex items-center justify-between">
				<div>
					<Label for="streaming">Enable Streaming</Label>
					<p class="text-sm text-muted-foreground">
						Show responses as they are generated (recommended)
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

	<!-- Custom Prompts -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle>Custom Prompts</CardTitle>
			<CardDescription>
				Customize the system prompts for each stage. Leave empty to use defaults.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="stage1Prompt">Stage 1: Initial Response Prompt</Label>
				<Textarea
					id="stage1Prompt"
					placeholder="Leave empty for default prompt..."
					rows={4}
					bind:value={customStage1Prompt}
				/>
			</div>

			<div class="space-y-2">
				<Label for="stage2Prompt">Stage 2: Peer Review Prompt</Label>
				<Textarea
					id="stage2Prompt"
					placeholder="Leave empty for default prompt..."
					rows={4}
					bind:value={customStage2Prompt}
				/>
			</div>

			<div class="space-y-2">
				<Label for="stage3Prompt">Stage 3: Synthesis Prompt</Label>
				<Textarea
					id="stage3Prompt"
					placeholder="Leave empty for default prompt..."
					rows={4}
					bind:value={customStage3Prompt}
				/>
			</div>
		</CardContent>
	</Card>

	<!-- Save Button -->
	<div class="flex justify-end">
		<Button onclick={handleSave} disabled={isSaving}>
			{#if isSaving}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
			{:else}
				<Save class="mr-2 h-4 w-4" />
			{/if}
			Save Settings
		</Button>
	</div>
</div>
