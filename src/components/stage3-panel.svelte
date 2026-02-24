<script lang="ts">
	import ResponseCard from './response-card.svelte';
	import { Sparkles, Loader2 } from 'lucide-svelte';

	interface Props {
		content: string;
		synthesizerModel?: string;
		isActive: boolean;
		isComplete: boolean;
	}

	let { content, synthesizerModel, isActive, isComplete }: Props = $props();

	function getModelName(modelId: string | undefined): string {
		if (!modelId) return 'Synthesizer';
		const parts = modelId.split('/');
		if (parts.length >= 2) {
			return parts[1].split(':')[0];
		}
		return modelId;
	}
</script>

<div class="space-y-4">
	<div class="flex items-center gap-2">
		<Sparkles class="h-5 w-5 text-amber-500" />
		<h3 class="font-semibold">Stage 3: Final Synthesis</h3>
		{#if isActive}
			<Loader2 class="h-4 w-4 animate-spin text-primary" />
		{/if}
	</div>

	<p class="text-muted-foreground text-sm">
		A synthesizer model combines insights from all responses into a final answer.
	</p>

	{#if content || isActive}
		<ResponseCard
			modelId={synthesizerModel}
			modelName={getModelName(synthesizerModel)}
			{content}
			stage="stage_3"
			isStreaming={isActive}
			isSynthesis={true}
		/>
	{:else if isComplete}
		<div class="text-muted-foreground rounded-lg border border-dashed p-4 text-center">
			Synthesis complete but no content was generated
		</div>
	{:else}
		<div class="text-muted-foreground rounded-lg border border-dashed p-4 text-center">
			Synthesis will begin after Stage 2 completes
		</div>
	{/if}
</div>
