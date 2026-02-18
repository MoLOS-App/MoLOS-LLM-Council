<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Search, Loader2 } from 'lucide-svelte';

	interface Props {
		availableModels: Array<{ id: string; name: string }>;
		selectedModels: string[];
		onSelectedChange: (models: string[]) => void;
		synthesizerModel?: string;
		onSynthesizerChange?: (model: string) => void;
		maxModels?: number;
		disabled?: boolean;
	}

	let {
		availableModels,
		selectedModels = $bindable(),
		onSelectedChange,
		synthesizerModel,
		onSynthesizerChange,
		maxModels = 5,
		disabled = false
	}: Props = $props();

	let searchQuery = $state('');

	const filteredModels = $derived(() => {
		if (!searchQuery) return availableModels;
		const query = searchQuery.toLowerCase();
		return availableModels.filter(
			(m) => m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)
		);
	});

	const canAddMore = $derived(selectedModels.length < maxModels);

	function toggleModel(modelId: string) {
		if (disabled) return;

		if (selectedModels.includes(modelId)) {
			const newSelection = selectedModels.filter((id) => id !== modelId);
			onSelectedChange(newSelection);
		} else if (canAddMore) {
			onSelectedChange([...selectedModels, modelId]);
		}
	}

	function getModelName(modelId: string): string {
		const model = availableModels.find((m) => m.id === modelId);
		return model?.name || modelId;
	}
</script>

<div class="space-y-4">
	<!-- Search -->
	<div class="relative">
		<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<Input
			type="text"
			placeholder="Search models..."
			bind:value={searchQuery}
			class="pl-9"
			disabled={disabled}
		/>
	</div>

	<!-- Selected Models -->
	{#if selectedModels.length > 0}
		<div class="space-y-2">
			<p class="text-sm font-medium">Selected ({selectedModels.length}/{maxModels})</p>
			<div class="flex flex-wrap gap-2">
				{#each selectedModels as modelId}
					<button
						type="button"
						class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary hover:bg-primary/20"
						onclick={() => toggleModel(modelId)}
						disabled={disabled}
					>
						<span class="max-w-[150px] truncate">{getModelName(modelId)}</span>
						<span class="text-xs opacity-70">&times;</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Model List -->
	<div class="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
		{#each filteredModels() as model (model.id)}
			{@const isSelected = selectedModels.includes(model.id)}
			<button
				type="button"
				class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted {isSelected
					? 'bg-primary/10'
					: ''} {!isSelected && !canAddMore ? 'opacity-50' : ''}"
				onclick={() => toggleModel(model.id)}
				disabled={disabled || (!isSelected && !canAddMore)}
			>
				<Checkbox checked={isSelected} disabled={disabled} />
				<div class="flex-1 overflow-hidden">
					<p class="truncate font-medium">{model.name}</p>
					<p class="truncate text-xs text-muted-foreground">{model.id}</p>
				</div>
			</button>
		{:else}
			<p class="p-2 text-center text-sm text-muted-foreground">No models found</p>
		{/each}
	</div>

	<!-- Synthesizer Selection -->
	{#if synthesizerModel !== undefined && onSynthesizerChange}
		<div class="space-y-2">
			<p class="text-sm font-medium">Synthesizer Model</p>
			<select
				class="w-full rounded-md border bg-background px-3 py-2 text-sm"
				value={synthesizerModel}
				onchange={(e) => onSynthesizerChange((e.target as HTMLSelectElement).value)}
				disabled={disabled}
			>
				{#each availableModels as model}
					<option value={model.id}>{model.name}</option>
				{/each}
			</select>
		</div>
	{/if}
</div>
