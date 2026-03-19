<script lang="ts">
	import { ChevronDown, ChevronUp, Clock, Users, MessageSquare } from 'lucide-svelte';

	interface Props {
		conversation: {
			id: string;
			query: string;
			selectedPersonaIds: string[];
			decisionSummary: string | null;
			tags: string[];
			createdAt: number;
			updatedAt: number;
		};
		messages: any[];
		expanded: boolean;
		onToggle: () => void;
		onClick: () => void;
	}

	let { conversation, messages, expanded, onToggle, onClick }: Props = $props();

	const date = $derived(
		new Date(conversation.createdAt * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	);

	const time = $derived(
		new Date(conversation.createdAt * 1000).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		})
	);
</script>

<div class="timeline-item">
	<div class="timeline-marker"></div>
	<div class="conversation-card">
		<div class="card-header" onclick={onClick}>
			<div class="meta-info">
				<div class="time-info">
					<Clock size={14} />
					<span class="date">{date}</span>
					<span class="time">{time}</span>
				</div>
				<div class="persona-count">
					<Users size={14} />
					{conversation.selectedPersonaIds.length} members
				</div>
			</div>
			<button
				class="expand-btn"
				onclick={(e) => {
					e.stopPropagation();
					onToggle();
				}}
			>
				{#if expanded}
					<ChevronUp size={18} />
				{:else}
					<ChevronDown size={18} />
				{/if}
			</button>
		</div>
		{#if expanded}
			<div class="card-body">
				<div class="query-section">
					<h4>Query</h4>
					<p>{conversation.query}</p>
				</div>
				{#if conversation.decisionSummary}
					<div class="summary-section">
						<h4>Decision Summary</h4>
						<p>{conversation.decisionSummary}</p>
					</div>
				{/if}
				<div class="tags-section">
					{#each conversation.tags as tag}
						<span class="tag">{tag}</span>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.timeline-item {
		position: relative;
		margin-bottom: 1.5rem;
		padding-left: 2.5rem;
	}

	.timeline-marker {
		position: absolute;
		left: 0;
		top: 1.5rem;
		width: 1rem;
		height: 1rem;
		background: #667eea;
		border-radius: 50%;
		border: 3px solid white;
		box-shadow: 0 0 0 3px #667eea;
	}

	.timeline-item::before {
		content: '';
		position: absolute;
		left: 0.35rem;
		top: 2.5rem;
		bottom: -1.5rem;
		width: 2px;
		background: #e5e7eb;
	}

	.timeline-item:last-child::before {
		display: none;
	}

	.conversation-card {
		background: white;
		border-radius: 0.75rem;
		overflow: hidden;
		border: 2px solid #e5e7eb;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		background: #f9fafb;
		cursor: pointer;
		transition: background 0.2s;
	}

	.card-header:hover {
		background: #f3f4f6;
	}

	.meta-info {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		flex: 1;
	}

	.time-info,
	.persona-count {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.expand-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: #9ca3af;
		transition: color 0.2s;
	}

	.expand-btn:hover {
		color: #667eea;
	}

	.card-body {
		padding: 1.25rem;
		border-top: 1px solid #e5e7eb;
	}

	.query-section,
	.summary-section {
		margin-bottom: 1rem;
	}

	.query-section h4,
	.summary-section h4 {
		font-size: 0.75rem;
		font-weight: 600;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem 0;
	}

	.query-section p,
	.summary-section p {
		font-size: 0.875rem;
		color: #374151;
		margin: 0;
		line-height: 1.5;
	}

	.tags-section {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tag {
		padding: 0.25rem 0.75rem;
		background: #ede9fe;
		color: #6d28d9;
		font-size: 0.75rem;
		border-radius: 0.25rem;
		font-weight: 500;
	}
</style>
