<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Send,
		Loader2,
		Users,
		Scale,
		Sparkles,
		MessageSquare,
		Crown,
		CheckCircle2,
		AlertCircle,
		Lightbulb,
		ChevronDown,
		ChevronUp
	} from 'lucide-svelte';
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
	let isConfigCollapsed = $state(false);

	const availablePresidents = $derived(availablePersonas.filter((p) => p.isPresident));

	// Watch for errors and show toast
	$effect(() => {
		const error = $councilUIState.error;
		if (error) {
			toast.error(error);
			// Clear error after showing toast to prevent duplicate toasts
			councilUIState.update((s) => ({ ...s, error: null }));
		}
	});

	// Auto-switch tabs when stages complete
	$effect(() => {
		const stage = $councilUIState.currentStage;
		const isStreaming = $councilUIState.isStreaming;
		const hasStage1 = $stage1ResponsesStore.size > 0;
		const hasStage2 = $stage2RankingsStore.length > 0;
		const hasStage3 = $stage3SynthesisStore.length > 0;

		if (!isStreaming) {
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

	const getStageStatus = (stage: string) => {
		if (currentStage === stage) return 'active';
		if (
			(stage === 'stage1' && $stage1ResponsesStore.size > 0) ||
			(stage === 'stage2' && $stage2RankingsStore.length > 0) ||
			(stage === 'stage3' && $stage3SynthesisStore)
		) {
			return 'complete';
		}
		return 'pending';
	};

	async function handleSubmit() {
		if (!isFormValid || $councilUIState.isStreaming) return;

		// Auto-collapse config when starting
		isConfigCollapsed = true;
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

	function getSelectedPresident() {
		return availablePresidents.find((p) => p.id === presidentPersonaId);
	}

	function toggleConfig() {
		isConfigCollapsed = !isConfigCollapsed;
	}

	function clearQuery() {
		query = '';
	}
</script>

<div class="flex h-full flex-col">
	<!-- Main Content - Full Width, Scrollable -->
	<div class="flex-1 overflow-auto">
		<!-- Query Input Section - Full Width, Prominent -->
		<div class="border-b bg-gradient-to-br from-primary/5 to-transparent p-4">
			<div class="flex items-start gap-3">
				<MessageSquare class="mt-1 h-5 w-5 shrink-0 text-primary" />
				<div class="flex-1">
					<Textarea
						placeholder="Enter your question or topic for the council to discuss..."
						bind:value={query}
						rows={10}
						disabled={$councilUIState.isStreaming}
						class="resize-none border-0 bg-transparent p-0 text-lg shadow-none focus-visible:ring-0"
					/>
					<div class="text-muted-foreground mt-1 flex items-center justify-between text-xs">
						<span>{query.length} characters</span>
						{#if query.length > 0}
							<button
								class="transition-colors hover:text-foreground"
								onclick={clearQuery}
								disabled={$councilUIState.isStreaming}
							>
								Clear
							</button>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Collapsible Configuration Section -->
		<div class="border-b">
			<!-- Header - Always visible -->
			<button
				class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
				onclick={toggleConfig}
				disabled={$councilUIState.isStreaming}
			>
				<div class="flex items-center gap-3">
					<Users class="h-4 w-4 text-primary" />
					<span class="font-medium">Council Configuration</span>
					<Badge variant={selectedPersonaIds.length > 0 ? 'default' : 'secondary'} class="text-xs">
						{selectedPersonaIds.length} members
					</Badge>
					{#if presidentPersonaId && getSelectedPresident()}
						<Badge variant="outline" class="text-xs">
							{getSelectedPresident()?.avatar}
							{getSelectedPresident()?.name}
						</Badge>
					{/if}
				</div>
				{#if isConfigCollapsed}
					<ChevronDown class="text-muted-foreground h-4 w-4" />
				{:else}
					<ChevronUp class="text-muted-foreground h-4 w-4" />
				{/if}
			</button>

			<!-- Collapsible Content -->
			{#if !isConfigCollapsed}
				<div class="space-y-4 border-t p-4 pt-4">
					<!-- Chairman and Members in one row -->
					<div class="flex flex-wrap items-start gap-4">
						<!-- Chairman Selection -->
						<div class="flex shrink-0 items-center gap-2">
							<Crown class="h-4 w-4 text-amber-500" />
							<span class="text-sm font-medium">Chairman:</span>
							{#if availablePresidents.length === 0}
								<Button
									variant="outline"
									size="sm"
									class="h-7 text-xs"
									onclick={() => goto('/ui/MoLOS-LLM-Council/personas')}
								>
									Create one
								</Button>
							{:else}
								<select
									id="chairman-select"
									bind:value={presidentPersonaId}
									disabled={$councilUIState.isStreaming}
									class="border-input h-8 rounded-md border bg-background px-2 py-1 text-sm"
								>
									{#each availablePresidents as president}
										<option value={president.id}>
											{president.avatar}
											{president.name}
										</option>
									{/each}
								</select>
							{/if}
						</div>

						<!-- Selected count -->
						<div class="flex shrink-0 items-center gap-2">
							<Users class="h-4 w-4 text-primary" />
							<span class="text-sm font-medium">Members:</span>
							<Badge variant={selectedPersonaIds.length > 0 ? 'default' : 'secondary'}>
								{selectedPersonaIds.length}/10
							</Badge>
						</div>
					</div>

					<!-- Persona Grid - Compact mode -->
					{#if availablePersonas.length === 0}
						<div class="flex items-center justify-center py-4 text-center">
							<p class="text-muted-foreground text-sm">No personas available</p>
							<Button
								variant="link"
								size="sm"
								class="ml-2 h-auto p-0"
								onclick={() => goto('/ui/MoLOS-LLM-Council/personas')}
							>
								Create Personas
							</Button>
						</div>
					{:else}
						<div class="max-h-48 overflow-y-auto">
							<PersonaGrid
								personas={availablePersonas}
								selectedIds={selectedPersonaIds}
								presidentId={presidentPersonaId}
								editable={!$councilUIState.isStreaming}
								compact={true}
								onSelect={handlePersonaSelect}
								onRemove={handlePersonaRemove}
							/>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Content Area -->
		<div class="p-4">
			<!-- Error/Validation Messages -->
			{#if $councilUIState.error}
				<div class="mb-4 flex items-center justify-center gap-2 text-sm text-destructive">
					<AlertCircle class="h-4 w-4" />
					{$councilUIState.error}
				</div>
			{/if}

			<!-- Start Button - Always visible -->
			<Button
				size="lg"
				class="mb-6 h-14 w-full text-lg font-semibold"
				onclick={handleSubmit}
				disabled={!isFormValid || $councilUIState.isStreaming}
			>
				{#if $councilUIState.isStreaming}
					<Loader2 class="mr-2 h-5 w-5 animate-spin" />
					Processing Council...
				{:else}
					<Send class="mr-2 h-5 w-5" />
					Start Council
				{/if}
			</Button>

			{#if !isFormValid && query.length > 0 && !$councilUIState.isStreaming}
				<div class="text-muted-foreground mb-4 flex items-center justify-center gap-2 text-sm">
					<Lightbulb class="h-4 w-4" />
					{#if selectedPersonaIds.length === 0}
						Select at least one council member
					{:else if !presidentPersonaId}
						Select a chairman
					{/if}
				</div>
			{/if}

			<!-- Results Section -->
			{#if $councilUIState.isStreaming || $stage1ResponsesStore.size > 0 || $stage3SynthesisStore}
				<!-- Stage Progress Bar -->
				<div class="mb-4 flex items-center justify-center gap-6">
					<button
						class="flex items-center gap-1.5 text-sm transition-colors {activeTab === 'stage1'
							? 'font-medium text-primary'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (activeTab = 'stage1')}
					>
						{#if getStageStatus('stage1') === 'complete'}
							<CheckCircle2 class="h-4 w-4 text-green-500" />
						{:else if getStageStatus('stage1') === 'active'}
							<Loader2 class="h-4 w-4 animate-spin text-primary" />
						{:else}
							<div class="h-4 w-4 rounded-full border-2 border-current"></div>
						{/if}
						<span>Responses</span>
					</button>

					<div class="h-4 w-px bg-border"></div>

					<button
						class="flex items-center gap-1.5 text-sm transition-colors {activeTab === 'stage2'
							? 'font-medium text-primary'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (activeTab = 'stage2')}
					>
						{#if getStageStatus('stage2') === 'complete'}
							<CheckCircle2 class="h-4 w-4 text-green-500" />
						{:else if getStageStatus('stage2') === 'active'}
							<Loader2 class="h-4 w-4 animate-spin text-primary" />
						{:else}
							<div class="h-4 w-4 rounded-full border-2 border-current"></div>
						{/if}
						<span>Rankings</span>
					</button>

					<div class="h-4 w-px bg-border"></div>

					<button
						class="flex items-center gap-1.5 text-sm transition-colors {activeTab === 'stage3'
							? 'font-medium text-primary'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (activeTab = 'stage3')}
					>
						{#if getStageStatus('stage3') === 'complete'}
							<CheckCircle2 class="h-4 w-4 text-green-500" />
						{:else if getStageStatus('stage3') === 'active'}
							<Loader2 class="h-4 w-4 animate-spin text-primary" />
						{:else}
							<div class="h-4 w-4 rounded-full border-2 border-current"></div>
						{/if}
						<span>Synthesis</span>
					</button>
				</div>

				<!-- Stage Content -->
				<div class="rounded-lg border bg-card">
					<div class="p-4">
						{#if activeTab === 'stage1'}
							<Stage1Panel
								responses={$stage1ResponsesStore}
								personas={availablePersonas}
								isActive={currentStage === 'initial_responses'}
								isComplete={currentStage !== 'initial_responses'}
							/>
						{:else if activeTab === 'stage2'}
							<Stage2Panel
								rankings={$stage2RankingsStore}
								personas={availablePersonas}
								isActive={currentStage === 'peer_review'}
								isComplete={['synthesis', 'completed'].includes(currentStage)}
							/>
						{:else if activeTab === 'stage3'}
							<Stage3Panel
								content={$stage3SynthesisStore}
								synthesizerModel={undefined}
								isActive={currentStage === 'synthesis'}
								isComplete={currentStage === 'completed'}
							/>
						{/if}
					</div>
				</div>
			{:else}
				<!-- Tips Card (shown when no results) -->
				<Card class="border-dashed">
					<CardContent class="flex flex-col items-center justify-center py-8 text-center">
						<div class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
							<Lightbulb class="text-muted-foreground h-6 w-6" />
						</div>
						<h3 class="mb-1 font-semibold">Ready to consult</h3>
						<p class="text-muted-foreground max-w-sm text-sm">
							Enter your question, configure members, and start the council.
						</p>
					</CardContent>
				</Card>
			{/if}
		</div>
	</div>
</div>
