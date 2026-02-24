<script lang="ts">
	import type { PersonaWithProvider } from '../../models';
	import { Crown, CheckCircle2, Plus, Minus } from 'lucide-svelte';

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

	function handlePersonaSelect(personaId: string) {
		if (!editable) return;

		const count = getSelectionCount(personaId);
		if (count < 3) {
			onSelect(personaId);
		}
	}
</script>

<div class="persona-grid">
	{#each personas as persona}
		{@const count = getSelectionCount(persona.id)}
		{@const isSelected = count > 0}

		<div class="persona-card {isSelected ? 'selected' : ''}">
			<div class="persona-avatar">{persona.avatar}</div>
			<div class="persona-info">
				<div class="persona-header">
					<span class="persona-name">{persona.name}</span>
					{#if persona.id === presidentId}
						<span class="president-badge">👑 Chairman</span>
					{/if}
				</div>
				<p class="persona-description">{persona.description}</p>
				<div class="persona-provider">
					<span class="provider-name">{persona.provider.name}</span>
					<span class="model-name">{persona.provider.model}</span>
				</div>
			</div>

			{#if isSelected}
				<div class="selection-controls">
					<div class="count-badge">{count}x</div>
					<button class="remove-btn" on:click|stopPropagation={() => onRemove(persona.id)} disabled={!editable}>
						<Minus size={16} />
					</button>
				</div>
			{:else}
				<button
					class="add-btn"
					on:click|stopPropagation={() => handlePersonaSelect(persona.id)}
					disabled={!editable}
				>
					<Plus size={20} />
				</button>
			{/if}
		</div>
	{/each}
</div>

<style>
	.persona-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.persona-card {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1.25rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;
		text-align: left;
	}

	.persona-card:hover:not(:disabled) {
		border-color: #667eea;
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
	}

	.persona-card.selected {
		border-color: #667eea;
		background: linear-gradient(135deg, #f5f7ff 0%, #f0f4ff 100%);
	}

	.persona-avatar {
		font-size: 2.5rem;
		flex-shrink: 0;
	}

	.persona-info {
		flex: 1;
		min-width: 0;
	}

	.persona-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.persona-name {
		font-weight: 600;
		color: #1f2937;
	}

	.president-badge {
		display: flex;
		align-items: center;
		background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.persona-description {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0 0 0.75rem 0;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.persona-provider {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.provider-name {
		font-weight: 500;
	}

	.model-name {
		font-family: monospace;
		opacity: 0.8;
	}

	.selection-controls {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.count-badge {
		background: #667eea;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.add-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 2px solid #e5e7eb;
		background: white;
		color: #667eea;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.add-btn:hover:not(:disabled) {
		background: #667eea;
		color: white;
		border-color: #667eea;
	}

	.remove-btn {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: none;
		background: #ef4444;
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.2s;
	}

	.remove-btn:hover:not(:disabled) {
		opacity: 0.8;
	}
</style>
