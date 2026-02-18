<script lang="ts">
	import { Loader2 } from 'lucide-svelte';
	import { councilUIState, loadSettings } from '../../stores/council.store';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		loadSettings().catch(console.error);
	});
</script>

<div class="flex h-full flex-col">
	{#if $councilUIState.loading && !$councilUIState.error}
		<div class="flex flex-1 items-center justify-center">
			<Loader2 class="h-8 w-8 animate-spin text-primary" />
		</div>
	{:else if $councilUIState.error}
		<div class="flex flex-1 items-center justify-center p-4">
			<div
				class="max-w-md rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive"
			>
				<h2 class="mb-2 font-bold">Error Loading Council Data</h2>
				<p class="text-sm">{$councilUIState.error}</p>
			</div>
		</div>
	{:else}
		<div class="flex-1 overflow-auto">
			{@render children()}
		</div>
	{/if}
</div>
