<script lang="ts">
	import ResponseCard from './response-card.svelte';
	import { Loader2, Users } from 'lucide-svelte';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import type { PersonaWithProvider } from '../../models';

	interface Props {
		responses: Map<string, string>;
		personas: PersonaWithProvider[];
		isActive: boolean;
		isComplete: boolean;
	}

	let { responses, personas, isActive, isComplete }: Props = $props();

	let selectedTab = $state<string>('');

	function getPersonaName(persona: PersonaWithProvider | undefined): string {
		return persona?.name || 'Unknown Persona';
	}

	const responseList = $derived(() => {
		return Array.from(responses.entries())
			.map(([personaId, content]) => {
				const persona = personas.find((p) => p.id === personaId);
				return {
					personaId,
					persona,
					personaName: getPersonaName(persona),
					content
				};
			})
			.filter((r) => r.persona);
	});

	// Auto-select first tab when responses arrive
	$effect(() => {
		const list = responseList();
		if (list.length > 0 && !selectedTab) {
			selectedTab = list[0].personaId;
		}
	});

	// Get the currently selected response
	const selectedResponse = $derived(responseList().find((r) => r.personaId === selectedTab));
</script>

<div class="space-y-3">
	<div class="flex items-center gap-2">
		<Users class="w-4 h-4 text-blue-500" />
		<span class="font-medium">Initial Responses</span>
		{#if isActive}
			<Loader2 class="w-4 h-4 animate-spin text-primary" />
		{/if}
		<span class="text-xs text-muted-foreground">({responseList().length})</span>
	</div>

	{#if responseList().length > 0}
		<Tabs bind:value={selectedTab} class="w-full">
			<TabsList class="flex-wrap justify-start h-auto gap-1 p-0 bg-transparent">
				{#each responseList() as response (response.personaId)}
					<TabsTrigger
						value={response.personaId}
						class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
					>
						{#if response.persona?.avatar}
							<span>{response.persona.avatar}</span>
						{/if}
						<span class="text-sm">{response.personaName}</span>
						{#if isActive && !response.content}
							<Loader2 class="w-3 h-3 animate-spin" />
						{/if}
					</TabsTrigger>
				{/each}
			</TabsList>

			{#each responseList() as response (response.personaId)}
				<TabsContent value={response.personaId} class="mt-3">
					<ResponseCard
						modelId={response.persona?.provider?.model || response.personaId}
						modelName={response.personaName}
						avatar={response.persona?.avatar}
						content={response.content}
						stage="stage_1"
						isStreaming={isActive && !response.content}
					/>
				</TabsContent>
			{/each}
		</Tabs>
	{:else if isActive}
		<div class="flex items-center justify-center p-6 border border-dashed rounded-lg">
			<div class="text-center">
				<Loader2 class="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
				<p class="text-sm text-muted-foreground">Gathering responses...</p>
			</div>
		</div>
	{:else if !isComplete}
		<div class="p-4 text-sm text-center border border-dashed rounded-lg text-muted-foreground">
			Waiting to start...
		</div>
	{/if}
</div>
