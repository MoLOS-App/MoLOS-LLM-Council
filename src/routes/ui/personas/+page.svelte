<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Plus, Edit, Trash2, Lock, ArrowLeft, Key, Loader2 } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import type { PersonaWithProvider } from '../../../models/index.js';

	interface PageData {
		personas: PersonaWithProvider[];
	}

	let { data }: { data: PageData } = $props();

	let providers = $state<any[]>([]);
	let showSystemProviderModal = $state(false);
	let selectedSystemPersona = $state<PersonaWithProvider | null>(null);
	let selectedProviderId = $state('');
	let isUpdatingProvider = $state(false);

	let systemPersonas = $derived(data.personas.filter((p) => p.isSystem));
	let userPersonas = $derived(data.personas.filter((p) => !p.isSystem));

	async function loadProviders() {
		const response = await fetch('/api/MoLOS-LLM-Council/providers');
		if (response.ok) {
			const data = await response.json();
			providers = data.providers || [];
		}
	}

	onMount(async () => {
		await loadProviders();
	});

	function handleCreate() {
		goto('/ui/MoLOS-LLM-Council/personas/create');
	}

	function handleEdit(id: string) {
		goto(`/ui/MoLOS-LLM-Council/personas/${id}/edit`);
	}

	function handleChangeSystemProvider(persona: PersonaWithProvider) {
		selectedSystemPersona = persona;
		selectedProviderId = persona.providerId || '';
		showSystemProviderModal = true;
	}

	async function handleUpdateSystemProvider() {
		if (!selectedSystemPersona || isUpdatingProvider) return;

		isUpdatingProvider = true;
		try {
			const response = await fetch(`/api/MoLOS-LLM-Council/personas/${selectedSystemPersona.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					providerId: selectedProviderId
				})
			});

			if (response.ok) {
				window.location.reload();
			} else {
				alert('Failed to update provider');
			}
		} catch (err) {
			alert('Failed to update provider');
			console.error(err);
		} finally {
			isUpdatingProvider = false;
		}
	}

	function handleCloseModal() {
		showSystemProviderModal = false;
		selectedSystemPersona = null;
		selectedProviderId = '';
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

<div class="container mx-auto max-w-6xl p-4 md:p-6">
	<div class="mb-6">
		<Button variant="ghost" size="sm" onclick={() => goto('/ui/MoLOS-LLM-Council')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Council
		</Button>
	</div>

	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Personas</h1>
			<p class="text-sm text-muted-foreground">Manage your AI personas for the LLM Council</p>
		</div>
		<Button onclick={handleCreate}>
			<Plus class="mr-2 h-4 w-4" />
			Create Persona
		</Button>
	</div>

	{#if systemPersonas.length > 0}
		<Card class="mb-6 bg-muted/30">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Lock class="h-5 w-5 text-muted-foreground" />
					System Personas
				</CardTitle>
				<CardDescription>Built-in personas that cannot be modified</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each systemPersonas as persona}
						<Card class="border-primary/20 bg-muted/50">
							<CardContent class="p-4">
								<div class="flex gap-3">
									<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-background text-2xl">
										{persona.avatar}
									</div>
									<div class="flex min-w-0 flex-1 flex-col">
										<div class="mb-1 flex items-center justify-between gap-2">
											<h3 class="truncate text-sm font-semibold">{persona.name}</h3>
											{#if persona.isPresident}
												<Badge variant="secondary" class="text-xs">👑 Chairman</Badge>
											{/if}
										</div>
										<p class="line-clamp-2 text-xs text-muted-foreground">
											{persona.description}
										</p>
										<div class="mt-2 text-xs">
											{#if persona.provider}
												<span class="font-medium">{persona.provider.name}</span>
												<span class="text-muted-foreground/70"> - </span>
												<span class="font-mono text-muted-foreground/70">{persona.provider.model}</span>
											{:else}
												<span class="text-destructive">No provider configured</span>
											{/if}
										</div>
									</div>
								</div>
								<div class="mt-2 flex gap-2">
									<Button
										variant="outline"
										size="sm"
										class="flex-1"
										onclick={() => handleChangeSystemProvider(persona)}
									>
										<Key class="mr-1 h-3 w-3" />
										Change Provider
									</Button>
								</div>
							</CardContent>
						</Card>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Provider Modal -->
	{#if showSystemProviderModal && selectedSystemPersona}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<Card class="w-full max-w-md">
				<CardHeader>
					<CardTitle>Change Provider for {selectedSystemPersona.name}</CardTitle>
					<CardDescription>Select a new AI provider for this system persona</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if providers.length === 0}
						<p class="text-sm text-muted-foreground">No providers available. Create a provider first.</p>
					{:else}
						<div class="space-y-2">
							<label for="provider-select" class="text-sm font-medium">Provider</label>
							<select
								id="provider-select"
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								bind:value={selectedProviderId}
							>
								{#each providers as provider}
									<option value={provider.id}>
										{provider.name} ({provider.model})
									</option>
								{/each}
							</select>
						</div>
					{/if}
					<div class="flex gap-2 pt-2">
						<Button variant="outline" onclick={handleCloseModal} disabled={isUpdatingProvider}>
							Cancel
						</Button>
						<Button
							onclick={handleUpdateSystemProvider}
							disabled={isUpdatingProvider || !selectedProviderId}
						>
							{#if isUpdatingProvider}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							Update Provider
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>My Personas</CardTitle>
			<CardDescription>Custom personas you've created</CardDescription>
		</CardHeader>
		<CardContent>
			{#if userPersonas.length === 0}
				<div class="flex flex-col items-center justify-center p-12 text-center">
					<div class="mb-4 rounded-full bg-muted p-4">
						<Plus class="h-8 w-8 text-muted-foreground" />
					</div>
					<h3 class="mb-2 text-lg font-semibold">No custom personas yet</h3>
					<p class="mb-4 text-sm text-muted-foreground">
						Create your first persona to customize the LLM Council experience
					</p>
					<Button variant="outline" onclick={handleCreate}>
						<Plus class="mr-2 h-4 w-4" />
						Create Your First Persona
					</Button>
				</div>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each userPersonas as persona}
						<Card class="group transition-all hover:shadow-md hover:border-primary/50">
							<CardContent class="p-4">
								<div class="flex gap-3">
									<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
										{persona.avatar}
									</div>
									<div class="flex min-w-0 flex-1 flex-col">
										<div class="mb-1 flex items-start justify-between gap-2">
											<div class="flex min-w-0 flex-col gap-1">
												<div class="flex items-center gap-2">
													<h3 class="truncate text-sm font-semibold">{persona.name}</h3>
													{#if persona.isPresident}
														<Badge variant="secondary" class="text-xs">👑 Chairman</Badge>
													{/if}
												</div>
												<p class="line-clamp-2 text-xs text-muted-foreground">
													{persona.description}
												</p>
											</div>
										</div>
										<div class="mt-auto">
											<div class="mb-2 text-xs">
												<span class="font-medium">{persona.provider.name}</span>
												<span class="text-muted-foreground/70"> - </span>
												<span class="font-mono text-muted-foreground/70">{persona.provider.model}</span>
											</div>
											<div class="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													class="flex-1"
													onclick={() => handleEdit(persona.id)}
												>
													<Edit class="mr-1 h-3 w-3" />
													Edit
												</Button>
												<Button
													variant="ghost"
													size="sm"
													class="text-destructive hover:bg-destructive/10"
													onclick={() => handleDelete(persona.id)}
												>
													<Trash2 class="h-3 w-3" />
												</Button>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
