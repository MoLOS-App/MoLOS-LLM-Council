<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		conversationsStore,
		currentConversationStore,
		messagesStore,
		councilUIState,
		stage1ResponsesStore,
		stage2RankingsStore,
		stage3SynthesisStore,
		loadConversations,
		loadConversation,
		deleteConversation
	} from '../../../stores/council.store';
	import { Sidebar, Stage1Panel, Stage2Panel, Stage3Panel } from '../../../components';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Plus, ArrowLeft, Inbox, Loader2 } from 'lucide-svelte';
	import type { CouncilConversation, PersonaWithProvider } from '../../../models/index.js';

	let availablePersonas = $state<PersonaWithProvider[]>([]);
	let mounted = false;
	let showDeleteDialog = $state(false);
	let pendingDeleteId = $state<string | null>(null);

	onMount(async () => {
		// Only initialize once
		if (mounted) return;
		mounted = true;

		// Load personas first for display names
		try {
			const personasResponse = await fetch('/api/MoLOS-LLM-Council/personas');
			if (personasResponse.ok) {
				const data = await personasResponse.json();
				availablePersonas = data.personas || [];
			}
		} catch (err) {
			console.error('Failed to load personas:', err);
		}

		// Then load conversations
		try {
			await loadConversations();
		} catch (err) {
			console.error('Failed to load conversations:', err);
		}
	});

	async function handleSelect(id: string) {
		try {
			await loadConversation(id);
		} catch (err) {
			console.error('Failed to load conversation:', err);
		}
	}

	function handleNew() {
		currentConversationStore.set(null);
		messagesStore.set([]);
		stage1ResponsesStore.set(new Map());
		stage2RankingsStore.set([]);
		stage3SynthesisStore.set('');
		goto('/ui/MoLOS-LLM-Council');
	}

	function handleDeleteRequest(id: string) {
		pendingDeleteId = id;
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		if (!pendingDeleteId) return;

		try {
			await deleteConversation(pendingDeleteId);
		} catch (err) {
			console.error('Failed to delete conversation:', err);
		} finally {
			showDeleteDialog = false;
			pendingDeleteId = null;
		}
	}
</script>

<div class="flex h-full">
	<!-- Sidebar -->
	{#if $councilUIState.loading && $conversationsStore.length === 0}
		<aside class="w-64 shrink-0 border-r bg-muted/20 p-4">
			<div class="flex h-full items-center justify-center">
				<Loader2 class="text-muted-foreground h-6 w-6 animate-spin" />
			</div>
		</aside>
	{:else if $conversationsStore.length === 0}
		<aside class="w-64 shrink-0 border-r bg-muted/20 p-4">
			<div class="flex h-full flex-col items-center justify-center text-center">
				<div class="mb-4 rounded-full bg-muted p-4">
					<Inbox class="text-muted-foreground h-8 w-8" />
				</div>
				<h3 class="mb-2 text-sm font-semibold">No history yet</h3>
				<p class="text-muted-foreground mb-4 text-xs">
					Start a council consultation to see your history here
				</p>
			</div>
		</aside>
	{:else}
		<aside class="w-64 shrink-0 border-r">
			<Sidebar
				conversations={$conversationsStore}
				currentConversationId={$currentConversationStore?.id}
				onSelect={handleSelect}
				onNew={handleNew}
				onDelete={handleDelete}
			/>
		</aside>
	{/if}

	<!-- Main Content -->
	<main class="flex-1 overflow-auto p-6">
		{#if $councilUIState.loading}
			<div class="flex h-full items-center justify-center">
				<Loader2 class="text-muted-foreground h-8 w-8 animate-spin" />
			</div>
		{:else if $currentConversationStore}
			<div class="mb-6">
				<Button variant="ghost" size="sm" onclick={handleNew}>
					<ArrowLeft class="mr-2 h-4 w-4" />
					New Council
				</Button>
			</div>

			<h2 class="mb-4 text-xl font-semibold">
				{$currentConversationStore?.query?.slice(0, 100) || 'Council'}
				{#if ($currentConversationStore?.query?.length || 0) > 100}
					...
				{/if}
			</h2>

			<!-- Display stages based on conversation state -->
			<div class="space-y-8">
				{#if $stage1ResponsesStore.size > 0}
					<Stage1Panel
						responses={$stage1ResponsesStore}
						personas={availablePersonas}
						isActive={false}
						isComplete={true}
					/>
				{/if}

				{#if $stage2RankingsStore.length > 0}
					<Stage2Panel
						rankings={$stage2RankingsStore}
						personas={availablePersonas}
						isActive={false}
						isComplete={true}
					/>
				{/if}

				{#if $stage3SynthesisStore}
					<Stage3Panel
						content={$stage3SynthesisStore}
						synthesizerModel={undefined}
						isActive={false}
						isComplete={true}
					/>
				{/if}
			</div>
		{:else}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<div class="mb-4 rounded-full bg-muted p-6">
					<Inbox class="text-muted-foreground h-12 w-12" />
				</div>
				<h3 class="mb-2 text-lg font-semibold">Nothing yet</h3>
				<p class="text-muted-foreground mb-4 text-sm">
					Select a conversation from the history or start a new council
				</p>
				<Button onclick={handleNew}>
					<Plus class="mr-2 h-4 w-4" />
					Start New Council
				</Button>
			</div>
		{/if}
	</main>
</div>
