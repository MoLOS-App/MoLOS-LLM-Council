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

<div class="space-y-3">
		{#if isActive}
	<div class="flex items-center gap-2">
		<Sparkles class="w-4 h-4 text-amber-500" />
		<span class="font-medium">Final Synthesis</span>
			<Loader2 class="w-4 h-4 animate-spin text-primary" />
	</div>
		{/if}

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
		<div class="p-3 text-xs text-center border border-dashed rounded-lg text-muted-foreground">
			Synthesis complete but no content generated
		</div>
	{:else}
		<div class="p-3 text-xs text-center border border-dashed rounded-lg text-muted-foreground">
			Synthesis begins after Stage 2
		</div>
	{/if}
</div>
