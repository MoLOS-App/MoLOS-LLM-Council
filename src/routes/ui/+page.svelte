<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import {
		Send,
		Loader2,
		Users,
		Scale,
		Sparkles,
		Settings
	} from 'lucide-svelte';

	import {
		councilUIState,
		stage1ResponsesStore,
		stage2RankingsStore,
		stage3SynthesisStore,
		currentConversationStore,
		startCouncil
	} from '../../stores/council.store.js';
	import { Stage1Panel, Stage2Panel, Stage3Panel, PersonaGrid } from '../../components/index.js';
	import type { PersonaWithProvider } from '../../models/index.js';

	let query = $state('');
	let selectedPersonaIds = $state<string[]>([]);
	let presidentPersonaId = $state<string | null>(null);
	let availablePersonas = $state<PersonaWithProvider[]>([]);
	let activeTab = $state('stage1');

	onMount(async () => {
		const personasResponse = await fetch('/api/MoLOS-LLM-Council/personas');
		if (personasResponse.ok) {
			const data = await personasResponse.json();
			availablePersonas = data.personas || [];
		}

		if (selectedPersonaIds.length === 0) {
			const systemPersonas = availablePersonas.filter((p) => p.isSystem);
			const defaultMember = systemPersonas.find((p) => p.name.includes('Member'));
			const defaultChairman = systemPersonas.find((p) => p.name.includes('Chairman'));

			if (defaultMember) {
				selectedPersonaIds = [defaultMember.id, defaultMember.id, defaultMember.id];
			}
			if (defaultChairman) {
				presidentPersonaId = defaultChairman.id;
			}
		}
	});

	const isFormValid = $derived(
		query.trim().length > 0 &&
			selectedPersonaIds.length > 0 &&
			selectedPersonaIds.length <= 10 &&
			presidentPersonaId !== null
	);

	const currentStage = $derived($councilUIState.currentStage);

	async function handleSubmit() {
		if (!isFormValid || $councilUIState.isStreaming) return;

		activeTab = 'stage1';

		await startCouncil(query.trim(), selectedPersonaIds, presidentPersonaId ?? undefined);
	}

	function handlePersonaSelect(personaId: string) {
		if ($councilUIState.isStreaming) return;

		const count = selectedPersonaIds.filter((id) => id === personaId).length;
		if (count < 3 && selectedPersonaIds.length < 10) {
			selectedPersonaIds = [...selectedPersonaIds, personaId];
		}
	}

	function handlePersonaRemove(personaId: string) {
		if ($councilUIState.isStreaming) return;

		const index = selectedPersonaIds.lastIndexOf(personaId);
		if (index !== -1) {
			selectedPersonaIds = selectedPersonaIds.filter((_, i) => i !== index);
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

	<div>
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

			<!-- Persona Selection Section -->
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium">
						Select Council Members ({selectedPersonaIds.length}/10)
					</p>
					<Button variant="outline" size="sm" onclick={() => goto('/ui/MoLOS-LLM-Council/personas')}>
						Manage Personas
					</Button>
				</div>

				{#if presidentPersonaId !== null}
					<div class="president-display">
						<span class="text-sm text-muted-foreground">Council Chairman:</span>
						<Badge variant="outline">
							👑 {availablePersonas.find((p) => p.id === presidentPersonaId)?.name || 'Not selected'}
						</Badge>
					</div>
				{/if}

				<PersonaGrid
					personas={availablePersonas}
					selectedIds={selectedPersonaIds}
					presidentId={presidentPersonaId}
					editable={!$councilUIState.isStreaming}
					onSelect={handlePersonaSelect}
					onRemove={handlePersonaRemove}
				/>
			</div>

			<!-- Submit -->
			<div class="flex items-center justify-between">
				{#if $councilUIState.error}
					<p class="text-sm text-destructive">{$councilUIState.error}</p>
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
					personas={[]}
					isActive={currentStage === 'stage_1'}
					isComplete={['stage_2', 'stage_3', 'complete'].includes(currentStage)}
				/>
			</TabsContent>

			<TabsContent value="stage2" class="mt-4">
				<Stage2Panel
					rankings={$stage2RankingsStore}
					personas={[]}
					isActive={currentStage === 'stage_2'}
					isComplete={['stage_3', 'complete'].includes(currentStage)}
				/>
			</TabsContent>

			<TabsContent value="stage3" class="mt-4">
				<Stage3Panel
					content={$stage3SynthesisStore}
					synthesizerModel={undefined}
					isActive={currentStage === 'stage_3'}
					isComplete={currentStage === 'complete'}
				/>
			</TabsContent>
		</Tabs>
	{/if}
	</div>

	<!-- Settings Link -->
	<div class="mt-8 flex justify-center">
		<Button variant="ghost" onclick={() => goto('/ui/MoLOS-LLM-Council/settings')}>
			<Settings class="mr-2 h-4 w-4" />
			Council Settings
		</Button>
		</div>
	</div>

	<style>
	.president-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
</style>
