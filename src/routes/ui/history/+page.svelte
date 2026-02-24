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
	import { Plus, ArrowLeft, Inbox } from 'lucide-svelte';
	import type { CouncilConversation } from '../../../models/index.js';

	onMount(() => {
		loadConversations().catch(console.error);
	});

	async function handleSelect(id: string) {
		await loadConversation(id);
	}

	function handleNew() {
		currentConversationStore.set(null);
		messagesStore.set([]);
		stage1ResponsesStore.set(new Map());
		stage2RankingsStore.set([]);
		stage3SynthesisStore.set('');
		goto('/ui/MoLOS-LLM-Council');
	}

	async function handleDelete(id: string) {
		if (confirm('Are you sure you want to delete this conversation?')) {
			await deleteConversation(id);
		}
	}

	function getPersonaIdsFromConversation(): string[] {
		return ($currentConversationStore as CouncilConversation | null)?.selectedPersonaIds || [];
	}
</script>

<div class="flex h-full">
	<!-- Sidebar -->
	{#if $conversationsStore.length === 0}
		<aside class="w-64 shrink-0 border-r bg-muted/20 p-4">
			<div class="flex h-full flex-col items-center justify-center text-center">
				<div class="mb-4 rounded-full bg-muted p-4">
					<Inbox class="h-8 w-8 text-muted-foreground" />
				</div>
				<h3 class="mb-2 text-sm font-semibold">No history yet</h3>
				<p class="mb-4 text-xs text-muted-foreground">
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
		{#if $currentConversationStore}
			<div class="mb-6">
				<Button variant="ghost" size="sm" onclick={handleNew}>
					<ArrowLeft class="mr-2 h-4 w-4" />
					New Council
				</Button>
			</div>

			<h2 class="mb-4 text-xl font-semibold">{$currentConversationStore?.title || 'Council'}</h2>

			<!-- Display stages based on conversation state -->
			<div class="space-y-8">
				{#if $stage1ResponsesStore.size > 0}
					<Stage1Panel
						responses={$stage1ResponsesStore}
						personas={[]}
						isActive={false}
						isComplete={true}
					/>
				{/if}

				{#if $stage2RankingsStore.length > 0}
					<Stage2Panel
						rankings={$stage2RankingsStore}
						personas={[]}
						isActive={false}
						isComplete={true}
					/>
				{/if}

				{#if $stage3SynthesisStore}
					<Stage3Panel
						content={$stage3SynthesisStore}
						presidentPersonaId={null}
						personas={[]}
						isActive={false}
						isComplete={true}
					/>
				{/if}
			</div>
		{:else}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<div class="mb-4 rounded-full bg-muted p-6">
					<Inbox class="h-12 w-12 text-muted-foreground" />
				</div>
				<h3 class="mb-2 text-lg font-semibold">Nothing yet</h3>
				<p class="mb-4 text-sm text-muted-foreground">
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
