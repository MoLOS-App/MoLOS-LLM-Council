<script lang="ts">
	import type { PersonaWithProvider } from '../../models';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tooltip from '$lib/components/ui/tooltip';

	interface Props {
		personas: PersonaWithProvider[];
		selectedIds: string[];
		presidentId: string | null;
		editable?: boolean;
		compact?: boolean;
		onSelect: (personaId: string) => void;
		onRemove: (personaId: string) => void;
	}

	let {
		personas,
		selectedIds = [],
		presidentId = null,
		editable = true,
		compact = false,
		onSelect,
		onRemove
	}: Props = $props();

	const getSelectionCount = (personaId: string) => {
		return selectedIds.filter((id) => id === personaId).length;
	};

	const MAX_TOTAL_MEMBERS = 10;

	function handleCardClick(personaId: string) {
		if (!editable) return;

		const count = getSelectionCount(personaId);
		const totalSelected = selectedIds.length;

		if (count > 0) {
			onRemove(personaId);
		} else if (totalSelected < MAX_TOTAL_MEMBERS) {
			onSelect(personaId);
		}
	}

	function getTooltipContent(persona: PersonaWithProvider): string {
		const parts: string[] = [];
		if (persona.description) {
			parts.push(persona.description);
		}
		if (persona.personalityPrompt) {
			const promptPreview = persona.personalityPrompt.slice(0, 150);
			parts.push(`\n"${promptPreview}${persona.personalityPrompt.length > 150 ? '...' : ''}"`);
		}
		return parts.join('\n') || 'No description available';
	}
</script>

{#if compact}
	<!-- Compact horizontal mode - 2 rows max, horizontally scrollable -->
	<div class="flex flex-wrap gap-2">
		{#each personas as persona}
			{@const count = getSelectionCount(persona.id)}
			{@const isSelected = count > 0}
			{@const totalSelected = selectedIds.length}
			{@const canSelect = !isSelected && totalSelected < MAX_TOTAL_MEMBERS}

			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<button
							class="relative flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all {isSelected
								? 'border-primary bg-primary/10 font-bold'
								: canSelect && editable
									? 'border-border hover:border-primary/50 hover:bg-muted/50'
									: 'border-border opacity-50'}"
							onclick={() => handleCardClick(persona.id)}
							disabled={!editable}
						>
							<span class="text-xl">{persona.avatar}</span>
							<span class="text-sm">{persona.name}</span>
							{#if persona.id === presidentId}
								<span class="text-xs">👑</span>
							{/if}
						</button>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							class="z-50 max-w-xs rounded-lg border bg-popover px-3 py-2 text-sm text-foreground shadow-lg"
							sideOffset={5}
						>
							{#if persona.description}
								<p class="mt-1">{persona.description}</p>
							{/if}
							{#if persona.personalityPrompt}
								<p class="mt-1 line-clamp-3 italic">
									"{persona.personalityPrompt.slice(0, 120)}{persona.personalityPrompt.length > 120
										? '...'
										: ''}"
								</p>
							{/if}
							<Tooltip.Arrow />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</Tooltip.Provider>
		{/each}
	</div>

	{#if editable && selectedIds.length >= MAX_TOTAL_MEMBERS}
		<p class="text-muted-foreground mt-2 text-xs">
			Maximum {MAX_TOTAL_MEMBERS} members. Click to remove.
		</p>
	{/if}
{:else}
	<!-- Full grid mode -->
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each personas as persona}
			{@const count = getSelectionCount(persona.id)}
			{@const isSelected = count > 0}
			{@const totalSelected = selectedIds.length}
			{@const canSelect = !isSelected && totalSelected < MAX_TOTAL_MEMBERS}

			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="group relative overflow-hidden rounded-lg border-2 transition-all {isSelected
								? 'border-primary bg-primary/5'
								: canSelect && editable
									? 'cursor-pointer border-border hover:border-primary/50 hover:bg-muted/30'
									: 'border-border opacity-50'}"
							onclick={() => handleCardClick(persona.id)}
							role="button"
							tabindex={editable ? 0 : -1}
						>
							<div class="flex items-center gap-3 p-3">
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl"
								>
									{persona.avatar}
								</div>

								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="truncate text-sm font-medium">{persona.name}</span>
										{#if persona.id === presidentId}
											<span class="text-xs">👑</span>
										{/if}
									</div>
									<p class="text-muted-foreground truncate text-xs">
										{persona.provider.model}
									</p>
								</div>

								{#if isSelected}
									<div
										class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary"
									>
										<span class="h-2 w-2 rounded-full bg-primary-foreground"></span>
									</div>
								{:else if editable && canSelect}
									<div
										class="text-muted-foreground/50 border-muted-foreground/30 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-sm"
									>
										+
									</div>
								{/if}
							</div>
						</div>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							class="z-50 max-w-xs rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg"
							sideOffset={5}
						>
							<p class="font-medium">{persona.name}</p>
							{#if persona.description}
								<p class="text-muted-foreground mt-1 text-xs">{persona.description}</p>
							{/if}
							{#if persona.personalityPrompt}
								<p class="text-muted-foreground mt-1 line-clamp-3 text-xs italic">
									"{persona.personalityPrompt.slice(0, 120)}{persona.personalityPrompt.length > 120
										? '...'
										: ''}"
								</p>
							{/if}
							<Tooltip.Arrow />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</Tooltip.Provider>
		{/each}
	</div>

	{#if editable && selectedIds.length >= MAX_TOTAL_MEMBERS}
		<p class="text-muted-foreground mt-3 text-center text-sm">
			Maximum {MAX_TOTAL_MEMBERS} council members. Click to remove.
		</p>
	{/if}
{/if}
