<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { User, Bot, Trophy, Sparkles } from 'lucide-svelte';

	interface Props {
		modelId?: string;
		modelName?: string;
		content: string;
		stage: 'stage_1' | 'stage_2' | 'stage_3';
		rank?: number;
		isStreaming?: boolean;
		isSynthesis?: boolean;
	}

	let {
		modelId,
		modelName = 'Unknown Model',
		content,
		stage,
		rank,
		isStreaming = false,
		isSynthesis = false
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
</script>

<Card class="relative overflow-hidden {isSynthesis ? 'border-primary ring-2 ring-primary/20' : ''}">
	<CardHeader class="pb-2">
		<div class="flex items-center justify-between">
			<CardTitle class="flex items-center gap-2 text-sm">
				{#if isSynthesis}
					<Sparkles class="h-4 w-4 text-primary" />
					Final Synthesis
				{:else if stage === 'stage_1'}
					<Bot class="h-4 w-4" />
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
		<div class="prose prose-sm dark:prose-invert max-w-none">
			{#if !content && isStreaming}
				<div class="flex items-center gap-2 text-muted-foreground">
					<div class="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
					<span class="text-sm">Thinking...</span>
				</div>
			{:else}
				<p class="whitespace-pre-wrap text-sm">{content || 'Waiting for response...'}</p>
				{#if isStreaming}
					<span class="inline-block h-4 w-1 animate-pulse bg-primary"></span>
				{/if}
			{/if}
		</div>
	</CardContent>
</Card>
