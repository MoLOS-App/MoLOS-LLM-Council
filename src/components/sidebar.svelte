<script lang="ts">
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Button } from '$lib/components/ui/button';
	import { MessageSquare, Plus, Trash2, Clock } from 'lucide-svelte';
	import type { Conversation } from '../models';

	interface Props {
		conversations: Conversation[];
		currentConversationId?: string;
		onSelect: (id: string) => void;
		onNew: () => void;
		onDelete: (id: string) => void;
	}

	let { conversations, currentConversationId, onSelect, onNew, onDelete }: Props = $props();

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp * 1000);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		return date.toLocaleDateString();
	}

	function truncate(str: string, len: number): string {
		if (str.length <= len) return str;
		return str.substring(0, len) + '...';
	}
</script>

<div class="flex h-full flex-col">
	<div class="flex items-center justify-between border-b p-4">
		<h2 class="font-semibold">History</h2>
		<Button variant="ghost" size="icon" onclick={onNew} title="New Council">
			<Plus class="h-4 w-4" />
		</Button>
	</div>

	<ScrollArea class="flex-1">
		<div class="space-y-1 p-2">
			{#each conversations as conversation (conversation.id)}
				<button
					type="button"
					class="group flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors hover:bg-muted {conversation.id ===
					currentConversationId
						? 'bg-muted'
						: ''}"
					onclick={() => onSelect(conversation.id)}
				>
					<MessageSquare class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">
							{truncate(conversation.title, 30)}
						</p>
						<div class="flex items-center gap-1 text-xs text-muted-foreground">
							<Clock class="h-3 w-3" />
							{formatDate(conversation.updatedAt)}
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						class="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
						onclick={(e) => {
							e.stopPropagation();
							onDelete(conversation.id);
						}}
					>
						<Trash2 class="h-3 w-3 text-destructive" />
					</Button>
				</button>
			{:else}
				<div class="p-4 text-center text-sm text-muted-foreground">
					No conversations yet. Start a new council!
				</div>
			{/each}
		</div>
	</ScrollArea>
</div>
