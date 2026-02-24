<script lang="ts">
	import { Crown } from 'lucide-svelte';
	import type { PersonaWithProvider } from '../../models';

	interface Props {
		personas: PersonaWithProvider[];
		selectedPresidentId: string | null;
		onChange: (id: string | null) => void;
	}

	let { personas, selectedPresidentId, onChange }: Props = $props();
</script>

<div class="president-selector">
	<label class="selector-label">
		<Crown size={16} />
		Council President
	</label>
	<select
		class="president-select"
		bind:value={selectedPresidentId}
		onchange={(e) => onChange(e.target.value)}
	>
		<option value="">Select president...</option>
		{#each personas as persona}
			<option value={persona.id}>{persona.avatar} {persona.name}</option>
		{/each}
	</select>
</div>

<style>
	.president-selector {
		margin-bottom: 1.5rem;
	}

	.selector-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.president-select {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 1rem;
		background: white;
		cursor: pointer;
		transition: border-color 0.2s;
	}

	.president-select:focus {
		outline: none;
		border-color: #667eea;
	}
</style>
