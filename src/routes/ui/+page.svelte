<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { Send, Loader2, Users, Scale, Sparkles, Settings } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	import {
		councilUIState,
		stage1ResponsesStore,
		stage2RankingsStore,
		stage3SynthesisStore,
		currentConversationStore,
		startCouncil
	} from '../../stores/council.store.js';
	import type { PersonaWithProvider } from '../../models/index.js';
	import PersonaGrid from '../../components/council/persona-grid.svelte';
	import { Stage1Panel, Stage2Panel, Stage3Panel } from '../../components/index.js';

	let query = $state('');
	let selectedPersonaIds = $state<string[]>([]);
	let presidentPersonaId = $state<string | null>(null);
	let availablePersonas = $state<PersonaWithProvider[]>([]);
	let activeTab = $state('stage1');
	let personasLoaded = false;

	const availablePresidents = $derived(availablePersonas.filter((p) => p.isPresident));

	// Watch for errors and show toast
	$effect(() => {
		const error = $councilUIState.error;
		if (error) {
			toast.error(error);
		}
	});

	// Auto-switch tabs when stages complete
	$effect(() => {
		const stage = $councilUIState.currentStage;
		const isStreaming = $councilUIState.isStreaming;
		const hasStage1 = $stage1ResponsesStore.size > 0;
		const hasStage2 = $stage2RankingsStore.length > 0;
		const hasStage3 = $stage3SynthesisStore.length > 0;

		// Only auto-switch when not streaming (processing complete)
		if (!isStreaming) {
			// When all stages are complete, show the synthesis (stage 3)
			if (stage === 'completed' && hasStage3) {
				activeTab = 'stage3';
			} else if (stage === 'synthesis' && hasStage3) {
				activeTab = 'stage3';
			} else if (stage === 'peer_review' && hasStage2) {
				activeTab = 'stage2';
			}
		}
	});

	onMount(async () => {
		// Only load personas once
		if (personasLoaded) return;
		personasLoaded = true;

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
	<!-- Query Input Card -->
	<Card>
		<CardHeader>
			<CardTitle>Start Council Session</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<Textarea
				placeholder="Enter your question or topic for council to discuss..."
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
					<Button
						variant="outline"
						size="sm"
						onclick={() => goto('/ui/MoLOS-LLM-Council/personas')}
					>
						Manage Personas
					</Button>
				</div>

				<!-- Chairman Selection -->
				<div class="space-y-2">
					<label for="chairman-select" class="text-sm font-medium"> Council Chairman </label>
					{#if availablePresidents.length === 0}
						<p class="text-muted-foreground text-sm">
							No chairman personas available. Create or edit a persona with "Can be Council
							Chairman" enabled.
						</p>
					{:else}
						<select
							id="chairman-select"
							bind:value={presidentPersonaId}
							disabled={$councilUIState.isStreaming}
							class="border-input w-full rounded-md border bg-background px-3 py-2 text-sm"
						>
							{#each availablePresidents as president}
								<option value={president.id}>
									{#if !president.provider || !president.provider.apiToken}
										⚠️
									{/if}
									{president.name}
								</option>
							{/each}
						</select>
						{#if presidentPersonaId && availablePresidents.find((p) => p.id === presidentPersonaId) && (!availablePresidents.find((p) => p.id === presidentPersonaId).provider || !availablePresidents.find((p) => p.id === presidentPersonaId).provider.apiToken)}
							<p class="text-sm text-destructive">
								⚠️ Selected chairman has no configured provider. Go to Settings to add a provider.
							</p>
						{/if}
					{/if}
				</div>

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
					{#if currentStage === 'initial_responses'}
						<Loader2 class="h-3 w-3 animate-spin" />
					{/if}
				</TabsTrigger>
				<TabsTrigger value="stage2" class="flex items-center gap-2">
					<Scale class="h-4 w-4" />
					<span class="hidden sm:inline">Stage 2</span>
					{#if currentStage === 'peer_review'}
						<Loader2 class="h-3 w-3 animate-spin" />
					{/if}
				</TabsTrigger>
				<TabsTrigger value="stage3" class="flex items-center gap-2">
					<Sparkles class="h-4 w-4" />
					<span class="hidden sm:inline">Stage 3</span>
					{#if currentStage === 'synthesis'}
						<Loader2 class="h-3 w-3 animate-spin" />
					{/if}
				</TabsTrigger>
			</TabsList>

			<TabsContent value="stage1" class="mt-4">
				<Stage1Panel
					responses={$stage1ResponsesStore}
					personas={availablePersonas}
					isActive={currentStage === 'initial_responses'}
					isComplete={currentStage !== 'initial_responses'}
				/>
			</TabsContent>

			<TabsContent value="stage2" class="mt-4">
				<Stage2Panel
					rankings={$stage2RankingsStore}
					personas={availablePersonas}
					isActive={currentStage === 'peer_review'}
					isComplete={['synthesis', 'completed'].includes(currentStage)}
				/>
			</TabsContent>

			<TabsContent value="stage3" class="mt-4">
				<Stage3Panel
					content={$stage3SynthesisStore}
					synthesizerModel={undefined}
					isActive={currentStage === 'synthesis'}
					isComplete={currentStage === 'completed'}
				/>
			</TabsContent>
		</Tabs>
	{/if}
</div>
