<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Scale, Loader2 } from 'lucide-svelte';
	import type { ModelRanking } from '../models';

	interface Props {
		rankings: Array<{ reviewerModelId: string; rankings: ModelRanking[] }>;
		models: string[];
		isActive: boolean;
		isComplete: boolean;
	}

	let { rankings, models, isActive, isComplete }: Props = $props();

	function getModelName(modelId: string): string {
		const parts = modelId.split('/');
		if (parts.length >= 2) {
			return parts[1].split(':')[0];
		}
		return modelId;
	}

	// Calculate average ranking for each model
	const averageRankings = $derived(() => {
		const rankMap = new Map<string, number[]>();

		for (const r of rankings) {
			for (const ranking of r.rankings) {
				if (!rankMap.has(ranking.modelId)) {
					rankMap.set(ranking.modelId, []);
				}
				rankMap.get(ranking.modelId)!.push(ranking.rank);
			}
		}

		return Array.from(rankMap.entries())
			.map(([modelId, ranks]) => ({
				modelId,
				modelName: getModelName(modelId),
				avgRank: ranks.reduce((a, b) => a + b, 0) / ranks.length,
				count: ranks.length
			}))
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

	<p class="text-sm text-muted-foreground">
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
					{#each averageRankings() as item, i (item.modelId)}
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<Badge variant={i === 0 ? 'default' : 'secondary'}>#{i + 1}</Badge>
								<span class="text-sm">{item.modelName}</span>
							</div>
							<span class="text-xs text-muted-foreground">
								Avg: {item.avgRank.toFixed(1)}
							</span>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>

		<!-- Individual Rankings -->
		<div class="space-y-2">
			{#each rankings as ranking (ranking.reviewerModelId)}
				<Card>
					<CardHeader class="pb-2">
						<CardTitle class="text-sm">
							{getModelName(ranking.reviewerModelId)}'s Rankings
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div class="space-y-1">
							{#each ranking.rankings.sort((a, b) => a.rank - b.rank) as r (r.modelId)}
								<div class="flex items-start gap-2 text-sm">
									<Badge variant="outline" class="mt-0.5">#{r.rank}</Badge>
									<div>
										<span class="font-medium">{getModelName(r.modelId)}</span>
										{#if r.reasoning}
											<p class="text-xs text-muted-foreground">{r.reasoning}</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{:else if isActive}
		<div class="flex items-center justify-center rounded-lg border border-dashed p-8">
			<div class="text-center">
				<Loader2 class="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
				<p class="text-sm text-muted-foreground">Models are ranking responses...</p>
			</div>
		</div>
	{:else if !isComplete}
		<div class="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
			Rankings will appear after Stage 1 completes
		</div>
	{/if}
</div>
