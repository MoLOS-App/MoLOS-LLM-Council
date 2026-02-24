<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { User, Bot, Trophy, Sparkles, Loader2 } from 'lucide-svelte';
	import { marked } from 'marked';

	interface Props {
		modelId?: string;
		modelName?: string;
		avatar?: string;
		content: string;
		stage: 'stage_1' | 'stage_2' | 'stage_3';
		rank?: number;
		isStreaming?: boolean;
		isSynthesis?: boolean;
		compact?: boolean;
	}

	let {
		modelId,
		modelName = 'Unknown Model',
		avatar,
		content,
		stage,
		rank,
		isStreaming = false,
		isSynthesis = false,
		compact = false
	}: Props = $props();

	function getModelDisplayName(id: string | undefined): string {
		if (!id) return 'Unknown';
		const parts = id.split('/');
		if (parts.length >= 2) {
			return parts[1].split(':')[0];
		}
		return id;
	}

	const displayName = $derived(modelName || getModelDisplayName(modelId));

	// Configure marked for safe rendering
	marked.setOptions({
		gfm: true,
		breaks: true
	});

	function renderMarkdown(text: string): string {
		if (!text) return '';
		try {
			return marked.parse(text) as string;
		} catch {
			return text;
		}
	}
</script>

{#if compact}
	<!-- Compact mode for horizontal scrolling -->
	<div
		class="flex h-full w-[340px] shrink-0 flex-col overflow-hidden rounded-lg border {isSynthesis
			? 'border-primary ring-2 ring-primary/20'
			: ''}"
	>
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
			<div class="flex min-w-0 items-center gap-2">
				{#if isSynthesis}
					<Sparkles class="h-4 w-4 shrink-0 text-primary" />
				{:else if avatar}
					<span class="shrink-0 text-lg">{avatar}</span>
				{:else}
					<Bot class="text-muted-foreground h-4 w-4 shrink-0" />
				{/if}
				<span class="truncate text-sm font-medium">{displayName}</span>
			</div>
			{#if rank}
				<Badge variant={rank === 1 ? 'default' : 'secondary'} class="shrink-0 text-xs">
					#{rank}
				</Badge>
			{/if}
		</div>
		<div class="flex-1 overflow-y-auto p-3">
			{#if !content && isStreaming}
				<div class="text-muted-foreground flex items-center gap-2">
					<Loader2 class="h-4 w-4 animate-spin" />
					<span class="text-sm">Thinking...</span>
				</div>
			{:else}
				<div
					class="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 break-words"
				>
					{#if content}
						{@html renderMarkdown(content)}
					{:else}
						<p class="text-muted-foreground text-sm">Waiting for response...</p>
					{/if}
				</div>
				{#if isStreaming}
					<span class="mt-2 inline-block h-4 w-1 animate-pulse bg-primary"></span>
				{/if}
			{/if}
		</div>
	</div>
{:else}
	<!-- Full card mode -->
	<Card
		class="relative overflow-hidden {isSynthesis ? 'border-primary ring-2 ring-primary/20' : ''}"
	>
		<CardHeader class="pb-2">
			<div class="flex items-center justify-between">
				<CardTitle class="flex items-center gap-2 text-sm">
					{#if isSynthesis}
						<Sparkles class="h-4 w-4 text-primary" />
						Final Synthesis
					{:else if stage === 'stage_1'}
						{#if avatar}
							<span class="text-lg">{avatar}</span>
						{:else}
							<Bot class="h-4 w-4" />
						{/if}
						{displayName}
					{:else}
						<User class="h-4 w-4" />
						{displayName} (Ranking)
					{/if}
				</CardTitle>
				{#if rank}
					<Badge variant={rank === 1 ? 'default' : 'secondary'} class="flex items-center gap-1">
						{#if rank === 1}
							<Trophy class="h-3 w-3" />
						{/if}
						#{rank}
					</Badge>
				{/if}
			</div>
		</CardHeader>
		<CardContent>
			<div class="prose-sm prose dark:prose-invert max-w-none">
				{#if !content && isStreaming}
					<div class="text-muted-foreground flex items-center gap-2">
						<Loader2 class="h-4 w-4 animate-spin" />
						<span class="text-sm">Thinking...</span>
					</div>
				{:else}
					{#if content}
						{@html renderMarkdown(content)}
					{:else}
						<p class="text-muted-foreground">Waiting for response...</p>
					{/if}
					{#if isStreaming}
						<span class="mt-2 inline-block h-4 w-1 animate-pulse bg-primary"></span>
					{/if}
				{/if}
			</div>
		</CardContent>
	</Card>
{/if}
