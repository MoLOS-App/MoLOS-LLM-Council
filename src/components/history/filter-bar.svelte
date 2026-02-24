<script lang="ts">
	import { Search, Filter, Download } from 'lucide-svelte';

	interface Props {
		searchQuery: string;
		onSearchChange: (query: string) => void;
		onFilterClick: () => void;
		onExportClick: () => void;
	}

	let { searchQuery, onSearchChange, onFilterClick, onExportClick }: Props = $props();
</script>

<div class="filter-bar">
	<div class="search-wrapper">
		<Search class="search-icon" size={18} />
		<input
			type="text"
			class="search-input"
			placeholder="Search conversations..."
			bind:value={searchQuery}
			oninput={(e) => onSearchChange(e.target.value)}
		/>
	</div>
	<div class="actions">
		<button class="action-btn" onclick={onFilterClick}>
			<Filter size={18} />
			Filter
		</button>
		<button class="action-btn" onclick={onExportClick}>
			<Download size={18} />
			Export
		</button>
	</div>
</div>

<style>
	.filter-bar {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.search-wrapper {
		flex: 1;
		min-width: 250px;
		position: relative;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: #9ca3af;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 1rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #667eea;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover {
		border-color: #667eea;
		background: #f5f7ff;
	}
</style>
