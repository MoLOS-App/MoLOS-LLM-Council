<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Plus, Edit, Trash2, Lock, ArrowLeft } from 'lucide-svelte';
	import { loadPersonas } from '../../../stores/personas.store.js';
	import type { PersonaWithProvider } from '../../../models/index.js';

	interface PageData {
		personas: PersonaWithProvider[];
	}

	let { data }: { data: PageData } = $props();

	let systemPersonas = $derived(data.personas.filter((p) => p.isSystem));
	let userPersonas = $derived(data.personas.filter((p) => !p.isSystem));

	function handleCreate() {
		goto('/ui/MoLOS-LLM-Council/personas/create');
	}

	async function handleDelete(id: string) {
		if (confirm('Are you sure you want to delete this persona?')) {
			try {
				const response = await fetch(`/api/MoLOS-LLM-Council/personas/${id}`, {
					method: 'DELETE'
				});
				if (response.ok) {
					window.location.reload();
				}
			} catch (err) {
				alert('Failed to delete persona');
				console.error(err);
			}
		}
	}
</script>

<div class="container mx-auto max-w-5xl p-4 md:p-6">
	<div class="mb-6">
		<Button variant="ghost" size="sm" onclick={() => goto('/ui/MoLOS-LLM-Council')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Council
		</Button>
	</div>

	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Personas</h1>
		<Button onclick={handleCreate}>
			<Plus class="mr-2 h-4 w-4" />
			Create Persona
		</Button>
	</div>

	{#if systemPersonas.length > 0}
		<Card class="mb-6">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Lock class="h-5 w-5" />
					System Personas
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="persona-list">
					{#each systemPersonas as persona}
						<div class="persona-item system-persona">
							<div class="persona-avatar large">{persona.avatar}</div>
							<div class="persona-details">
								<h3 class="persona-name">{persona.name}</h3>
								<p class="persona-description">{persona.description}</p>
								<p class="persona-provider">
									{persona.provider.name} - {persona.provider.model}
								</p>
							</div>
							<div class="persona-actions">
								<span class="system-badge">🔒 System</span>
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>My Personas</CardTitle>
		</CardHeader>
		<CardContent>
			{#if userPersonas.length === 0}
				<div class="empty-state">
					<p class="text-muted-foreground">No custom personas yet.</p>
					<Button variant="outline" onclick={handleCreate}>
						<Plus class="mr-2 h-4 w-4" />
						Create Your First Persona
					</Button>
				</div>
			{:else}
				<div class="persona-list">
					{#each userPersonas as persona}
						<div class="persona-item">
							<div class="persona-avatar">{persona.avatar}</div>
							<div class="persona-details">
								<h3 class="persona-name">{persona.name}</h3>
								<p class="persona-description">{persona.description}</p>
								<p class="persona-provider">
									{persona.provider.name} - {persona.provider.model}
								</p>
							</div>
							<div class="persona-actions">
								<Button variant="ghost" size="sm" onclick={() => handleEdit(persona.id)}>
									<Edit class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="destructive"
									onclick={() => handleDelete(persona.id)}
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>

<style>
	.persona-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.persona-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.75rem;
		background: white;
	}

	.persona-item.system-persona {
		background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
		border-color: #f59e0b;
	}

	.persona-avatar {
		font-size: 2.5rem;
		flex-shrink: 0;
	}

	.persona-avatar.large {
		font-size: 3rem;
	}

	.persona-details {
		flex: 1;
		min-width: 0;
	}

	.persona-name {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.persona-description {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0 0 0.5rem 0;
		line-height: 1.4;
	}

	.persona-provider {
		font-size: 0.75rem;
		color: #9ca3af;
		font-family: monospace;
	}

	.persona-actions {
		display: flex;
		gap: 0.5rem;
	}

	.system-badge {
		background: #f59e0b;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 0;
		text-align: center;
	}
</style>
