<script lang="ts">
	import ResponseCard from './response-card.svelte';
	import { Loader2, Users } from 'lucide-svelte';

	interface Props {
		responses: Map<string, string>;
		personas: any[];
		isActive: boolean;
		isComplete: boolean;
	}

	let { responses, personas, isActive, isComplete }: Props = $props();

	function getModelName(modelId: string): string {
		const parts = modelId.split('/');
		if (parts.length >= 2) {
			return parts[1].split(':')[0];
		}
		return modelId;
	}

	const responseList = $derived(() => {
		return Array.from(responses.entries()).map(([modelId, content]) => ({
			modelId,
			modelName: getModelName(modelId),
			content
		}));
	});
</script>

<div class="space-y-4">
	<div class="flex items-center gap-2">
		<Users class="h-5 w-5 text-blue-500" />
		<h3 class="font-semibold">Stage 1: Initial Responses</h3>
		{#if isActive}
			<Loader2 class="h-4 w-4 animate-spin text-primary" />
		{/if}
	</div>

	<p class="text-sm text-muted-foreground">
		Each model provides its independent analysis of the question.
	</p>

	<div class="grid gap-4 {responseList().length > 2 ? 'md:grid-cols-2' : ''}">
		{#each responseList() as response (response.modelId)}
			<ResponseCard
				modelId={response.modelId}
				modelName={response.modelName}
				content={response.content}
				stage="stage_1"
				isStreaming={isActive && !response.content}
			/>
		{/each}
	</div>

	{#if !isComplete && !isActive}
		<div class="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
			Waiting to start...
		</div>
	{/if}
</div>
