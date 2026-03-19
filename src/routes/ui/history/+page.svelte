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
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Plus, ArrowLeft, Inbox, Loader2, Menu } from 'lucide-svelte';
	import type { CouncilConversation, PersonaWithProvider } from '../../../models/index.js';

	let availablePersonas = $state<PersonaWithProvider[]>([]);
	let mounted = false;
	let showDeleteDialog = $state(false);
	let pendingDeleteId = $state<string | null>(null);
	let showMobileDrawer = $state(false);

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

<div class="flex h-full flex-col md:flex-row">
	<!-- Mobile Header -->
	<div class="border-b bg-background p-4 md:hidden">
		<div class="flex items-center justify-between">
			<Button variant="ghost" size="icon" onclick={() => (showMobileDrawer = true)} aria-label="Open menu">
				<Menu class="h-5 w-5" />
			</Button>
			<h1 class="text-lg font-semibold">History</h1>
		</div>
	</div>

	<!-- Mobile Drawer -->
	<Drawer.Root bind:open={showMobileDrawer} direction="left">
		<Drawer.Content class="h-full w-[85vw] max-w-xs border-r bg-background">
			<Drawer.Close
				class="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/10 transition-colors"
				aria-label="Close menu"
			>
				✕
			</Drawer.Close>
			{#if $councilUIState.loading && $conversationsStore.length === 0}
				<div class="flex h-full items-center justify-center p-4">
					<Loader2 class="text-muted-foreground h-6 w-6 animate-spin" />
				</div>
			{:else if $conversationsStore.length === 0}
				<div class="flex h-full flex-col items-center justify-center p-4 text-center">
					<div class="mb-4 rounded-full bg-muted p-4">
						<Inbox class="text-muted-foreground h-8 w-8" />
					</div>
					<h3 class="mb-2 text-sm font-semibold">No history yet</h3>
					<p class="text-muted-foreground mb-4 text-xs">
						Start a council consultation to see your history here
					</p>
				</div>
			{:else}
				<Sidebar
					conversations={$conversationsStore}
					currentConversationId={$currentConversationStore?.id}
					onSelect={(id) => {
						handleSelect(id);
						showMobileDrawer = false;
					}}
					onNew={() => {
						handleNew();
						showMobileDrawer = false;
					}}
					onDelete={handleDeleteRequest}
				/>
			{/if}
		</Drawer.Content>
	</Drawer.Root>

	<!-- Desktop Sidebar -->
	{#if $councilUIState.loading && $conversationsStore.length === 0}
		<aside class="hidden w-64 shrink-0 border-r bg-muted/20 p-4 md:block">
			<div class="flex h-full items-center justify-center">
				<Loader2 class="text-muted-foreground h-6 w-6 animate-spin" />
			</div>
		</aside>
	{:else if $conversationsStore.length === 0}
		<aside class="hidden w-64 shrink-0 border-r bg-muted/20 p-4 md:block">
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
		<aside class="hidden w-64 shrink-0 border-r md:block">
			<Sidebar
				conversations={$conversationsStore}
				currentConversationId={$currentConversationStore?.id}
				onSelect={handleSelect}
				onNew={handleNew}
				onDelete={handleDeleteRequest}
			/>
		</aside>
	{/if}

	<!-- Main Content -->
	<main class="flex-1 overflow-auto p-4 md:p-6">
		{#if $councilUIState.loading}
			<div class="flex h-full items-center justify-center">
				<Loader2 class="text-muted-foreground h-8 w-8 animate-spin" />
			</div>
		{:else if $currentConversationStore}
			<div class="mb-4 md:mb-6">
				<Button variant="ghost" size="sm" onclick={handleNew}>
					<ArrowLeft class="mr-2 h-4 w-4" />
					New Council
				</Button>
			</div>

			<h2 class="mb-4 text-lg font-semibold md:text-xl">
				{$currentConversationStore?.query?.slice(0, 100) || 'Council'}
				{#if ($currentConversationStore?.query?.length || 0) > 100}
					...
				{/if}
			</h2>

			<!-- Display stages based on conversation state -->
			<div class="space-y-6 md:space-y-8">
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
			<div class="flex h-full min-h-[60vh] flex-col items-center justify-center text-center px-4">
				<div class="mb-4 rounded-full bg-muted p-6">
					<Inbox class="text-muted-foreground h-10 w-10 md:h-12 md:w-12" />
				</div>
				<h3 class="mb-2 text-base font-semibold md:text-lg">Nothing yet</h3>
				<p class="text-muted-foreground mb-4 text-xs md:text-sm">
					Select a conversation from the history or start a new council
				</p>
				<Button onclick={handleNew} size="default">
					<Plus class="mr-2 h-4 w-4" />
					Start New Council
				</Button>
			</div>
		{/if}
	</main>

	<!-- Delete Confirmation Dialog -->
	<Dialog.Root bind:open={showDeleteDialog}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Delete Conversation?</Dialog.Title>
				<Dialog.Description>
					Are you sure you want to delete this conversation? This action cannot be undone.
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showDeleteDialog = false)}>Cancel</Button>
				<Button variant="destructive" onclick={confirmDelete}>Delete</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
