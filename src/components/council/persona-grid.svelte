<script lang="ts">
	import type { PersonaWithProvider } from '../../models';
	import { Plus, Minus } from 'lucide-svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		personas: PersonaWithProvider[];
		selectedIds: string[];
		presidentId: string | null;
		editable?: boolean;
		onSelect: (personaId: string) => void;
		onRemove: (personaId: string) => void;
	}

	let { personas, selectedIds = [], presidentId = null, editable = true, onSelect, onRemove }: Props = $props();

	const getSelectionCount = (personaId: string) => {
		return selectedIds.filter((id) => id === personaId).length;
	};

	const MAX_INSTANCES = 3;
	const MAX_TOTAL_MEMBERS = 10;

	const canAddMore = (personaId: string) => {
		const count = getSelectionCount(personaId);
		const totalSelected = selectedIds.length;
		return count < MAX_INSTANCES && totalSelected < MAX_TOTAL_MEMBERS;
	};
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each personas as persona}
		{@const count = getSelectionCount(persona.id)}
		{@const isSelected = count > 0}
		{@const canAdd = canAddMore(persona.id)}

		<Card
			class="group relative overflow-hidden transition-all hover:shadow-md {isSelected
				? 'border-primary bg-primary/5'
				: 'border-border hover:border-primary/50'}"
		>
			<CardContent class="p-5">
				<div class="flex gap-3">
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
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

							{#if editable}
								{#if isSelected}
									<div class="flex items-center gap-1.5 shrink-0">
										<Button
											variant="outline"
											size="icon"
											class="h-7 w-7 border-primary/50 bg-primary/10 hover:bg-primary/20"
											disabled={!canAdd || !editable}
											onclick={() => onSelect(persona.id)}
										>
											<Plus class="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-7 w-7 text-destructive hover:bg-destructive/10"
											onclick={() => onRemove(persona.id)}
											disabled={!editable}
										>
											<Minus class="h-3.5 w-3.5" />
										</Button>
									</div>
								{:else}
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 shrink-0 rounded-full border hover:bg-primary/10"
										disabled={!editable}
										onclick={() => onSelect(persona.id)}
									>
										<Plus class="h-4 w-4" />
									</Button>
								{/if}
							{/if}
						</div>

						<p class="mb-3 line-clamp-2 text-xs text-muted-foreground">
							{persona.description}
						</p>

						<div class="mb-2 text-xs">
							<span class="font-medium">{persona.provider.name}</span>
							<span class="text-muted-foreground/70"> - </span>
							<span class="font-mono text-muted-foreground/70">{persona.provider.model}</span>
						</div>

						{#if isSelected}
							<Badge variant="default" class="w-fit shrink-0">
								{count}x selected
							</Badge>
						{/if}
					</div>
				</div>
			</CardContent>
		</Card>
	{/each}
</div>
