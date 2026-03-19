<script lang="ts">
	import { Scale, Loader2, Trophy } from 'lucide-svelte';
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
		return persona?.name || 'Unknown';
	}

	function getPersonaAvatar(persona: PersonaWithProvider | undefined): string {
		return persona?.avatar || '🤖';
	}

	// Calculate comprehensive ranking data
	const rankingData = $derived(() => {
		const rankMap = new Map<
			string,
			{
				ranks: number[];
				rankCounts: Map<number, number>;
			}
		>();

		for (const r of rankings) {
			if (!r.rankings) continue;
			for (const ranking of r.rankings) {
				if (!rankMap.has(ranking.personaId)) {
					rankMap.set(ranking.personaId, {
						ranks: [],
						rankCounts: new Map()
					});
				}
				const data = rankMap.get(ranking.personaId)!;
				data.ranks.push(ranking.rank);
				data.rankCounts.set(ranking.rank, (data.rankCounts.get(ranking.rank) || 0) + 1);
			}
		}

		const maxRank = Math.max(...Array.from(rankMap.values()).flatMap((d) => d.ranks), 1);

		return Array.from(rankMap.entries())
			.map(([personaId, data]) => {
				const persona = personas.find((p) => p.id === personaId);
				const avgRank = data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length;
				const voteCount = data.ranks.length;

				return {
					personaId,
					persona,
					personaName: getPersonaName(persona),
					avatar: getPersonaAvatar(persona),
					avgRank,
					voteCount,
					rankCounts: data.rankCounts,
					score: Math.max(0, 100 - (avgRank * 100) / maxRank)
				};
			})
			.sort((a, b) => a.avgRank - b.avgRank);
	});

	const allRanks = $derived(() => {
		const ranks = new Set<number>();
		for (const item of rankingData()) {
			for (const rank of item.rankCounts.keys()) {
				ranks.add(rank);
			}
		}
		return Array.from(ranks).sort((a, b) => a - b);
	});

	// Vibrant vote badge colors - distinct and accessible
	function getVoteBadgeColor(rank: number): string {
		const colors: Record<number, string> = {
			1: 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-500/30',
			2: 'bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-400/30',
			3: 'bg-gradient-to-br from-orange-400 to-amber-600 shadow-orange-500/30',
			4: 'bg-gradient-to-br from-violet-400 to-purple-500 shadow-violet-500/30',
			5: 'bg-gradient-to-br from-rose-400 to-pink-500 shadow-rose-500/30'
		};
		return colors[rank] || 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-500/30';
	}

	// Bar color based on position - using theme colors
	function getBarGradient(index: number): string {
		if (index === 0) return 'from-primary to-primary/70';
		if (index === 1) return 'from-primary/80 to-primary/50';
		if (index === 2) return 'from-primary/60 to-primary/40';
		return 'from-primary/40 to-primary/20';
	}

	// Text color for score label based on bar width
	function getScoreTextColor(score: number): string {
		return score > 50 ? 'text-white' : 'text-foreground';
	}
</script>

<div class="space-y-4">
	<div class="flex items-center gap-2">
		<Scale class="h-4 w-4 text-violet-500" />
		<span class="font-medium text-sm md:text-base">Peer Rankings</span>
		{#if isActive}
			<Loader2 class="h-4 w-4 animate-spin text-primary" />
		{/if}
		<span class="text-muted-foreground text-xs">({rankings.length} reviewers)</span>
	</div>

	{#if rankingData().length > 0}
		<!-- Bar Chart -->
		<div class="space-y-3 md:space-y-4">
			{#each rankingData() as item, i (item.personaId)}
				<div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
					<!-- Rank Badge -->
					<div class="flex w-full justify-between gap-2 md:w-7 md:shrink-0">
						{#if i === 0}
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/30"
							>
								<Trophy class="h-3.5 w-3.5 text-white" />
							</div>
						{:else if i === 1}
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-xs font-bold text-slate-700 shadow-md"
							>
								2
							</div>
						{:else if i === 2}
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-600 text-xs font-bold text-white shadow-md"
							>
								3
							</div>
						{:else}
							<span class="text-muted-foreground text-sm font-medium">#{i + 1}</span>
						{/if}

						<!-- Persona Info (mobile only) -->
						<div class="flex items-center gap-2 md:hidden">
							<span class="text-lg">{item.avatar}</span>
							<span class="truncate text-sm font-medium">{item.personaName}</span>
						</div>
					</div>

					<!-- Persona Info (desktop) -->
					<div class="hidden w-28 shrink-0 items-center gap-2 md:flex">
						<span class="text-lg">{item.avatar}</span>
						<span class="truncate text-sm font-medium">{item.personaName}</span>
					</div>

					<!-- Bar -->
					<div class="relative w-full flex-1">
						<div class="h-8 overflow-hidden rounded-lg bg-muted/50">
							<div
								class="h-full rounded-lg bg-gradient-to-r shadow-lg transition-all duration-500 {getBarGradient(
									i
								)}"
								style="width: {item.score}%"
							></div>
						</div>
						<!-- Score label -->
						<div class="absolute inset-0 flex items-center justify-end pr-3">
							<span class="text-xs font-bold drop-shadow-sm {getScoreTextColor(item.score)}">
								{item.avgRank.toFixed(1)}
							</span>
						</div>
					</div>

					<!-- Vote Distribution -->
					<div class="flex shrink-0 gap-1">
						{#each allRanks() as rank}
							{@const count = item.rankCounts.get(rank) || 0}
							{#if count > 0}
								<div
									class="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-md {getVoteBadgeColor(
										rank
									)}"
									title={`${count} vote${count > 1 ? 's' : ''} for rank #${rank}`}
								>
									{count}
								</div>
							{:else}
								<div
									class="border-muted-foreground/30 text-muted-foreground/50 flex h-6 w-6 items-center justify-center rounded-md border border-dashed text-[10px]"
								>
									·
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<!-- Legend -->
		<div class="flex flex-wrap items-center gap-3 text-xs md:gap-4">
			<span class="text-muted-foreground">Votes:</span>
			{#each allRanks() as rank}
				<div class="flex items-center gap-1.5">
					<div class="h-3.5 w-3.5 rounded {getVoteBadgeColor(rank)} shadow-sm"></div>
					<span class="font-medium">#${rank}</span>
				</div>
			{/each}
		</div>
	{:else if isActive}
		<div class="flex items-center justify-center rounded-lg border border-dashed p-4">
			<div class="text-center">
				<Loader2 class="mx-auto mb-1 h-5 w-5 animate-spin text-primary" />
				<p class="text-muted-foreground text-xs">Ranking responses...</p>
			</div>
		</div>
	{:else if !isComplete}
		<div class="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
			Rankings appear after Stage 1
		</div>
	{/if}
</div>
