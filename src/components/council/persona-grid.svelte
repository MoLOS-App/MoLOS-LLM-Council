<script lang="ts">
	import type { PersonaWithProvider } from '../../models';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		personas: PersonaWithProvider[];
		selectedIds: string[];
		presidentId: string | null;
		editable?: boolean;
		onSelect: (personaId: string) => void;
		onRemove: (personaId: string) => void;
	}

	let {
		personas,
		selectedIds = [],
		presidentId = null,
		editable = true,
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
			// Already selected - remove one instance
			onRemove(personaId);
		} else if (totalSelected < MAX_TOTAL_MEMBERS) {
			// Not selected - add it
			onSelect(personaId);
		}
	}
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each personas as persona}
		{@const count = getSelectionCount(persona.id)}
		{@const isSelected = count > 0}
		{@const totalSelected = selectedIds.length}
		{@const canSelect = !isSelected && totalSelected < MAX_TOTAL_MEMBERS}

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<Card
			class="group relative overflow-hidden transition-all hover:shadow-md {isSelected
				? 'border-primary bg-primary/5 ring-2 ring-primary/30'
				: canSelect && editable
					? 'cursor-pointer border-border hover:border-primary/50'
					: 'border-border opacity-60'}"
			onclick={() => handleCardClick(persona.id)}
		>
			<CardContent class="p-5">
				<div class="flex gap-3">
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl"
					>
						{persona.avatar}
					</div>

					<div class="flex min-w-0 flex-1 flex-col">
						<div class="mb-2 flex items-start justify-between gap-2">
							<div class="flex min-w-0 items-center gap-2">
								<h3 class="truncate text-sm font-semibold">{persona.name}</h3>
								{#if persona.id === presidentId}
									<Badge variant="secondary" class="shrink-0 text-xs whitespace-nowrap">
										👑 Chairman
									</Badge>
								{/if}
							</div>

							{#if isSelected}
								<div
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
								>
									{count}
								</div>
							{:else if editable && canSelect}
								<div
									class="border-muted-foreground/30 text-muted-foreground/50 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-lg"
								>
									+
								</div>
							{/if}
						</div>

						<p class="text-muted-foreground mb-3 line-clamp-2 text-xs">
							{persona.description}
						</p>

						<div class="mb-2 text-xs">
							<span class="font-medium">{persona.provider.name}</span>
							<span class="text-muted-foreground/70"> - </span>
							<span class="text-muted-foreground/70 font-mono">{persona.provider.model}</span>
						</div>

						{#if isSelected}
							<Badge variant="default" class="w-fit shrink-0">
								{#if count > 1}
									{count}x selected
								{:else}
									Selected
								{/if}
							</Badge>
						{/if}
					</div>
				</div>
			</CardContent>
		</Card>
	{/each}
</div>

{#if editable && selectedIds.length >= MAX_TOTAL_MEMBERS}
	<p class="text-muted-foreground mt-4 text-center text-sm">
		Maximum {MAX_TOTAL_MEMBERS} council members reached. Click a selected member to remove.
	</p>
{/if}
