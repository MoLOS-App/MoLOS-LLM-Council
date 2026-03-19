<script lang="ts">
	import { Circle, CheckCircle2, CircleCheck } from 'lucide-svelte';
	import { PersonaConversationStage } from '../../models';

	interface Props {
		currentStage: PersonaConversationStage;
	}

	let { currentStage }: Props = $props();

	const stages = [
		{
			id: PersonaConversationStage.INITIAL_RESPONSES,
			label: 'Initial Responses',
			description: 'Gather perspectives'
		},
		{
			id: PersonaConversationStage.PEER_REVIEW,
			label: 'Peer Review',
			description: 'Rank and evaluate'
		},
		{ id: PersonaConversationStage.SYNTHESIS, label: 'Synthesis', description: 'Combine insights' },
		{ id: PersonaConversationStage.COMPLETED, label: 'Complete', description: 'Decision ready' }
	];

	function isComplete(stageId: PersonaConversationStage, index: number): boolean {
		const currentIndex = stages.findIndex((s) => s.id === currentStage);
		return currentIndex > index;
	}
</script>

<div class="stage-progress">
	{#each stages as stage, index}
		<div
			class="stage-item {currentStage === stage.id ? 'active' : ''} {isComplete(stage.id, index)
				? 'complete'
				: ''}"
		>
			<div class="stage-indicator">
				{#if isComplete(stage.id, index)}
					<CheckCircle2 size={24} />
				{:else if currentStage === stage.id}
					<CircleCheck size={24} />
				{:else}
					<Circle size={24} />
				{/if}
			</div>
			<div class="stage-content">
				<div class="stage-label">{stage.label}</div>
				<div class="stage-description">{stage.description}</div>
			</div>
			{#if index < stages.length - 1}
				<div class="stage-connector {isComplete(stage.id, index) ? 'complete' : ''}"></div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.stage-progress {
		display: flex;
		align-items: flex-start;
		gap: 0;
		padding: 1.5rem;
		background: white;
		border-radius: 0.75rem;
		margin-bottom: 2rem;
	}

	.stage-item {
		display: flex;
		flex-direction: column;
		flex: 1;
		position: relative;
	}

	.stage-indicator {
		color: #d1d5db;
		transition: color 0.3s;
	}

	.stage-item.active .stage-indicator {
		color: #667eea;
	}

	.stage-item.complete .stage-indicator {
		color: #10b981;
	}

	.stage-content {
		padding-top: 0.75rem;
	}

	.stage-label {
		font-weight: 600;
		color: #9ca3af;
		font-size: 0.875rem;
	}

	.stage-item.active .stage-label,
	.stage-item.complete .stage-label {
		color: #1f2937;
	}

	.stage-description {
		font-size: 0.75rem;
		color: #d1d5db;
		margin-top: 0.25rem;
	}

	.stage-item.active .stage-description {
		color: #667eea;
	}

	.stage-connector {
		position: absolute;
		top: 1rem;
		right: -50%;
		width: 50%;
		height: 2px;
		background: #e5e7eb;
	}

	.stage-connector.complete {
		background: #10b981;
	}
</style>
