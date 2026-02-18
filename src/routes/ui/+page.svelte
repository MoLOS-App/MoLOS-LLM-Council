<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import {
		Send,
		Loader2,
		Settings,
		Users,
		Scale,
		Sparkles,
		AlertCircle
	} from 'lucide-svelte';

	import {
		councilUIState,
		settingsStore,
		stage1ResponsesStore,
		stage2RankingsStore,
		stage3SynthesisStore,
		currentConversationStore,
		startCouncil,
		loadSettings
	} from '../../stores/council.store';
	import { Stage1Panel, Stage2Panel, Stage3Panel } from '../../components';

	let query = $state('');
	let selectedModels = $state<string[]>([]);
	let synthesizerModel = $state<string>('');
	let activeTab = $state('stage1');

	const POPULAR_MODELS = [
		{ id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
		{ id: 'openai/gpt-4o', name: 'GPT-4o' },
		{ id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
		{ id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
		{ id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' }
	];

	onMount(async () => {
		const settings = await loadSettings();
		selectedModels = settings.defaultModels?.slice(0, 3) || [];
		synthesizerModel = settings.defaultSynthesizer || 'anthropic/claude-3.5-sonnet';
	});

	const isFormValid = $derived(query.trim().length > 0 && selectedModels.length > 0);

	const currentStage = $derived($councilUIState.currentStage);

	async function handleSubmit() {
		if (!isFormValid || $councilUIState.isStreaming) return;

		activeTab = 'stage1';

		await startCouncil(query.trim(), selectedModels, synthesizerModel);
	}

	function toggleModel(modelId: string) {
		if ($councilUIState.isStreaming) return;

		if (selectedModels.includes(modelId)) {
			selectedModels = selectedModels.filter((id) => id !== modelId);
		} else if (selectedModels.length < 5) {
			selectedModels = [...selectedModels, modelId];
		}
	}
</script>

<div class="container mx-auto max-w-6xl p-4 md:p-6">
	<div class="mb-6">
		<h1 class="mb-2 text-2xl font-bold">LLM Council</h1>
		<p class="text-muted-foreground">
			Get diverse AI perspectives through a 3-stage consultation process
		</p>
	</div>

	{#if !$settingsStore?.hasApiKey}
		<Card class="mb-6 border-amber-500/50 bg-amber-500/10">
			<CardContent class="flex items-center gap-3 p-4">
				<AlertCircle class="h-5 w-5 text-amber-500" />
				<div>
					<p class="font-medium">API Key Required</p>
					<p class="text-sm text-muted-foreground">
						Please configure your OpenRouter API key in
						<a href="/ui/MoLOS-LLM-Council/settings" class="text-primary underline">
							Settings</a
						>
						to use the council.
					</p>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Input Section -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle class="text-lg">Ask the Council</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<Textarea
				placeholder="Enter your question or topic for the council to discuss..."
				bind:value={query}
				rows={4}
				disabled={$councilUIState.isStreaming}
			/>

			<!-- Model Selection -->
			<div class="space-y-2">
				<p class="text-sm font-medium">
					Select Models ({selectedModels.length}/5)
				</p>
				<div class="flex flex-wrap gap-2">
					{#each POPULAR_MODELS as model}
						{@const isSelected = selectedModels.includes(model.id)}
						<Button
							variant={isSelected ? 'default' : 'outline'}
							size="sm"
							onclick={() => toggleModel(model.id)}
							disabled={$councilUIState.isStreaming || (!isSelected && selectedModels.length >= 5)}
						>
							{model.name}
						</Button>
					{/each}
				</div>
			</div>

			<!-- Synthesizer -->
			<div class="flex items-center gap-2">
				<span class="text-sm">Synthesizer:</span>
				<select
					class="rounded-md border bg-background px-2 py-1 text-sm"
					bind:value={synthesizerModel}
					disabled={$councilUIState.isStreaming}
				>
					{#each POPULAR_MODELS as model}
						<option value={model.id}>{model.name}</option>
					{/each}
				</select>
			</div>

			<!-- Submit -->
			<div class="flex items-center justify-between">
				{#if $councilUIState.error}
					<p class="text-sm text-destructive">{$councilUIState.error}</p>
				{:else}
					<div></div>
				{/if}
				<Button onclick={handleSubmit} disabled={!isFormValid || $councilUIState.isStreaming}>
					{#if $councilUIState.isStreaming}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Processing...
					{:else}
						<Send class="mr-2 h-4 w-4" />
						Start Council
					{/if}
				</Button>
			</div>
		</CardContent>
	</Card>

	<!-- Results Section -->
	{#if $councilUIState.isStreaming || $stage1ResponsesStore.size > 0 || $stage3SynthesisStore}
		<Tabs bind:value={activeTab} class="w-full">
			<TabsList class="grid w-full grid-cols-3">
				<TabsTrigger value="stage1" class="flex items-center gap-2">
					<Users class="h-4 w-4" />
					<span class="hidden sm:inline">Stage 1</span>
					{#if currentStage === 'stage_1'}
						<Loader2 class="h-3 w-3 animate-spin" />
					{/if}
				</TabsTrigger>
				<TabsTrigger value="stage2" class="flex items-center gap-2">
					<Scale class="h-4 w-4" />
					<span class="hidden sm:inline">Stage 2</span>
					{#if currentStage === 'stage_2'}
						<Loader2 class="h-3 w-3 animate-spin" />
					{/if}
				</TabsTrigger>
				<TabsTrigger value="stage3" class="flex items-center gap-2">
					<Sparkles class="h-4 w-4" />
					<span class="hidden sm:inline">Stage 3</span>
					{#if currentStage === 'stage_3'}
						<Loader2 class="h-3 w-3 animate-spin" />
					{/if}
				</TabsTrigger>
			</TabsList>

			<TabsContent value="stage1" class="mt-4">
				<Stage1Panel
					responses={$stage1ResponsesStore}
					models={selectedModels}
					isActive={currentStage === 'stage_1'}
					isComplete={['stage_2', 'stage_3', 'complete'].includes(currentStage)}
				/>
			</TabsContent>

			<TabsContent value="stage2" class="mt-4">
				<Stage2Panel
					rankings={$stage2RankingsStore}
					models={selectedModels}
					isActive={currentStage === 'stage_2'}
					isComplete={['stage_3', 'complete'].includes(currentStage)}
				/>
			</TabsContent>

			<TabsContent value="stage3" class="mt-4">
				<Stage3Panel
					content={$stage3SynthesisStore}
					synthesizerModel={synthesizerModel}
					isActive={currentStage === 'stage_3'}
					isComplete={currentStage === 'complete'}
				/>
			</TabsContent>
		</Tabs>
	{/if}

	<!-- Settings Link -->
	<div class="mt-8 flex justify-center">
		<Button variant="ghost" onclick={() => goto('/ui/MoLOS-LLM-Council/settings')}>
			<Settings class="mr-2 h-4 w-4" />
			Council Settings
		</Button>
	</div>
</div>
