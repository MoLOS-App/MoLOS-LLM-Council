<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Scale, Loader2 } from 'lucide-svelte';
	import type { PersonaWithProvider } from '../../models';

	interface MessageRanking {
		personaId: string;
		rank: number;
		reason: string;
	}

	interface Props {
		rankings: Array<{ reviewerPersonaId: string; rankings: MessageRanking[] }>;
		personas: PersonaWithProvider[];
		isActive: boolean;
		isComplete: boolean;
	}

	let { rankings, personas, isActive, isComplete }: Props = $props();

	function getPersonaName(persona: PersonaWithProvider | undefined): string {
		return persona?.name || 'Unknown Persona';
	}

	function getPersonaProviderName(persona: PersonaWithProvider | undefined): string {
		return persona?.provider?.name || 'Unknown Provider';
	}

	// Calculate average ranking for each persona
	const averageRankings = $derived(() => {
		const rankMap = new Map<string, number[]>();

		for (const r of rankings) {
			if (!r.rankings) continue;
			for (const ranking of r.rankings) {
				if (!rankMap.has(ranking.personaId)) {
					rankMap.set(ranking.personaId, []);
				}
				rankMap.get(ranking.personaId)!.push(ranking.rank);
			}
		}

		return Array.from(rankMap.entries())
			.map(([personaId, ranks]) => {
				const persona = personas.find((p) => p.id === personaId);
				return {
					personaId,
					persona,
					personaName: getPersonaName(persona),
					providerName: getPersonaProviderName(persona),
					avgRank: ranks.reduce((a, b) => a + b, 0) / ranks.length,
					count: ranks.length
				};
			})
			.sort((a, b) => a.avgRank - b.avgRank);
	});
</script>

<div class="space-y-4">
	<div class="flex items-center gap-2">
		<Scale class="h-5 w-5 text-purple-500" />
		<h3 class="font-semibold">Stage 2: Peer Rankings</h3>
		{#if isActive}
			<Loader2 class="h-4 w-4 animate-spin text-primary" />
		{/if}
	</div>

	<p class="text-muted-foreground text-sm">
		Each model reviews and ranks all responses from Stage 1.
	</p>

	{#if rankings.length > 0}
		<!-- Average Rankings Summary -->
		<Card>
			<CardHeader class="pb-2">
				<CardTitle class="text-sm">Consensus Rankings</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-2">
					{#each averageRankings() as item, i (item.personaId)}
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<Badge variant={i === 0 ? 'default' : 'secondary'}>#{i + 1}</Badge>
								<span class="text-sm">{item.personaName}</span>
							</div>
							<span class="text-muted-foreground text-xs">
								Avg: {item.avgRank.toFixed(1)}
							</span>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>

		<!-- Individual Rankings -->
		<div class="space-y-2">
			{#each rankings as ranking (ranking.reviewerPersonaId)}
				{#if ranking.rankings}
					<Card>
						<CardHeader class="pb-2">
							<CardTitle class="text-sm">
								{getPersonaName(personas.find((p) => p.id === ranking.reviewerPersonaId))}'s
								Rankings
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div class="space-y-1">
								{#each ranking.rankings.sort((a, b) => a.rank - b.rank) as r (r.personaId)}
									<div class="flex items-start gap-2 text-sm">
										<Badge variant="outline" class="mt-0.5">#{r.rank}</Badge>
										<div>
											<span class="font-medium">
												{getPersonaName(personas.find((p) => p.id === r.personaId))}
											</span>
											{#if r.reason}
												<p class="text-muted-foreground text-xs">{r.reason}</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</CardContent>
					</Card>
				{/if}
			{/each}
		</div>
	{:else if isActive}
		<div class="flex items-center justify-center rounded-lg border border-dashed p-8">
			<div class="text-center">
				<Loader2 class="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
				<p class="text-muted-foreground text-sm">Personas are ranking responses...</p>
			</div>
		</div>
	{:else if !isComplete}
		<div class="text-muted-foreground rounded-lg border border-dashed p-4 text-center">
			Rankings will appear after Stage 1 completes
		</div>
	{/if}
</div>
