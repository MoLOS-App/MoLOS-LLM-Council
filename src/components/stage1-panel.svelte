<script lang="ts">
	import ResponseCard from './response-card.svelte';
	import { Loader2, Users } from 'lucide-svelte';
	import type { PersonaWithProvider } from '../../models';

	interface Props {
		responses: Map<string, string>;
		personas: PersonaWithProvider[];
		isActive: boolean;
		isComplete: boolean;
	}

	let { responses, personas, isActive, isComplete }: Props = $props();

	function getPersonaName(persona: PersonaWithProvider | undefined): string {
		return persona?.name || 'Unknown Persona';
	}

	function getPersonaProviderName(persona: PersonaWithProvider | undefined): string {
		return persona?.provider?.name || 'Unknown Provider';
	}

	const responseList = $derived(() => {
		return Array.from(responses.entries())
			.map(([personaId, content]) => {
				const persona = personas.find((p) => p.id === personaId);
				return {
					personaId,
					persona,
					personaName: getPersonaName(persona),
					providerName: getPersonaProviderName(persona),
					content
				};
			})
			.filter((r) => r.persona); // Only show personas that still exist
	});
</script>

<div class="space-y-4">
	<div class="flex items-center gap-2">
		<Users class="h-5 w-5 text-blue-500" />
		<h3 class="font-semibold">Stage 1: Initial Responses</h3>
		{#if isActive}
			<Loader2 class="h-4 w-4 animate-spin text-primary" />
		{/if}
	</div>

	<p class="text-muted-foreground text-sm">
		Each model provides its independent analysis of the question.
	</p>

	<div class="grid gap-4 {responseList().length > 2 ? 'md:grid-cols-2' : ''}">
		{#each responseList() as response (response.personaId)}
			<ResponseCard
				modelId={response.persona?.provider?.model || response.personaId}
				modelName={`${response.personaName} (${response.providerName})`}
				content={response.content}
				stage="stage_1"
				isStreaming={isActive && !response.content}
			/>
		{/each}
	</div>

	{#if !isComplete && !isActive}
		<div class="text-muted-foreground rounded-lg border border-dashed p-4 text-center">
			Waiting to start...
		</div>
	{/if}
</div>
