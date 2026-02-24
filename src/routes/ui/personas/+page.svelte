<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import {
		Plus,
		Edit,
		Trash2,
		Lock,
		ArrowLeft,
		Key,
		Loader2,
		Users,
		Shield,
		Star,
		Search,
		Settings
	} from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
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
	let showDeleteDialog = $state(false);
	let pendingDeleteId = $state<string | null>(null);
	let searchQuery = $state('');

	let systemPersonas = $derived(data.personas.filter((p) => p.isSystem));
	let userPersonas = $derived(data.personas.filter((p) => !p.isSystem));

	// Filtered personas based on search
	let filteredSystemPersonas = $derived(
		systemPersonas.filter(
			(p) =>
				p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
		)
	);
	let filteredUserPersonas = $derived(
		userPersonas.filter(
			(p) =>
				p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	// Stats
	let totalPersonas = $derived(data.personas.length);
	let chairmanCount = $derived(data.personas.filter((p) => p.isPresident).length);
	let defaultCount = $derived(data.personas.filter((p) => p.isDefault).length);

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
				toast.success('Provider updated successfully');
				window.location.reload();
			} else {
				toast.error('Failed to update provider');
			}
		} catch (err) {
			toast.error('Failed to update provider');
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

	function handleDeleteRequest(id: string) {
		pendingDeleteId = id;
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		if (!pendingDeleteId) return;

		try {
			const response = await fetch(`/api/MoLOS-LLM-Council/personas/${pendingDeleteId}`, {
				method: 'DELETE'
			});
			if (response.ok) {
				toast.success('Persona deleted');
				window.location.reload();
			} else {
				toast.error('Failed to delete persona');
			}
		} catch (err) {
			toast.error('Failed to delete persona');
			console.error(err);
		} finally {
			showDeleteDialog = false;
			pendingDeleteId = null;
		}
	}

	function getPersonaToDelete() {
		return userPersonas.find((p) => p.id === pendingDeleteId);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Main Content - Full Width, Scrollable -->
	<div class="flex-1 overflow-auto p-4">
		<!-- Stats Row -->
		<div class="mb-6 flex flex-wrap items-center gap-6">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
					<Users class="h-4 w-4 text-primary" />
				</div>
				<div>
					<span class="text-lg font-bold">{totalPersonas}</span>
					<span class="text-muted-foreground ml-1 text-sm">Total</span>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
					<Shield class="h-4 w-4 text-purple-500" />
				</div>
				<div>
					<span class="text-lg font-bold">{systemPersonas.length}</span>
					<span class="text-muted-foreground ml-1 text-sm">System</span>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
					<Star class="h-4 w-4 text-amber-500" />
				</div>
				<div>
					<span class="text-lg font-bold">{chairmanCount}</span>
					<span class="text-muted-foreground ml-1 text-sm">Chairmen</span>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
					<Plus class="h-4 w-4 text-green-500" />
				</div>
				<div>
					<span class="text-lg font-bold">{userPersonas.length}</span>
					<span class="text-muted-foreground ml-1 text-sm">Custom</span>
				</div>
			</div>
		</div>

		<!-- Search Bar -->
		<div class="mb-6">
			<div class="relative">
				<Search class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
				<Input
					type="text"
					placeholder="Search personas by name or description..."
					bind:value={searchQuery}
					class="pl-10"
				/>
			</div>
		</div>

		{#if searchQuery && filteredSystemPersonas.length === 0 && filteredUserPersonas.length === 0}
			<Card class="p-8">
				<div class="flex flex-col items-center justify-center text-center">
					<Search class="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
					<h3 class="mb-2 text-lg font-semibold">No personas found</h3>
					<p class="text-muted-foreground mb-4 text-sm">
						No personas match "{searchQuery}". Try a different search term.
					</p>
					<Button variant="outline" onclick={() => (searchQuery = '')}>Clear Search</Button>
				</div>
			</Card>
		{:else}
			<!-- System Personas Section -->
			{#if filteredSystemPersonas.length > 0}
				<div class="mb-8">
					<div class="mb-4 flex items-center gap-2">
						<Lock class="text-muted-foreground h-4 w-4" />
						<h2 class="text-lg font-semibold">System Personas</h2>
						<Badge variant="secondary" class="text-xs">{filteredSystemPersonas.length}</Badge>
					</div>
					<p class="text-muted-foreground mb-4 text-sm">
						Built-in personas with predefined personalities. You can change their provider but not
						edit them.
					</p>
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each filteredSystemPersonas as persona (persona.id)}
							<Card
								class="group relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent transition-all hover:border-purple-500/40 hover:shadow-lg"
							>
								<!-- System badge -->
								<div class="absolute top-2 right-2">
									<Badge
										variant="outline"
										class="border-purple-500/30 bg-purple-500/10 text-xs text-purple-600"
									>
										<Lock class="mr-1 h-3 w-3" />
										System
									</Badge>
								</div>
								<CardContent class="p-4 pt-8">
									<div class="flex gap-3">
										<div
											class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-3xl"
										>
											{persona.avatar}
										</div>
										<div class="min-w-0 flex-1">
											<div class="mb-1 flex items-center gap-2">
												<h3 class="truncate font-semibold">{persona.name}</h3>
												{#if persona.isPresident}
													<Badge variant="secondary" class="text-xs">
														<Star class="mr-1 h-3 w-3" />
														Chairman
													</Badge>
												{/if}
											</div>
											<p class="text-muted-foreground line-clamp-2 text-xs">
												{persona.description || 'No description'}
											</p>
										</div>
									</div>

									<!-- Provider info -->
									<div class="mt-3 rounded-lg bg-background/50 p-2">
										{#if persona.provider}
											<div class="flex items-center justify-between text-xs">
												<span class="font-medium">{persona.provider.name}</span>
												<span class="text-muted-foreground font-mono">{persona.provider.model}</span
												>
											</div>
										{:else}
											<div class="flex items-center gap-1 text-xs text-destructive">
												<Key class="h-3 w-3" />
												No provider configured
											</div>
										{/if}
									</div>

									<!-- Actions -->
									<div class="mt-3">
										<Button
											variant="outline"
											size="sm"
											class="w-full"
											onclick={() => handleChangeSystemProvider(persona)}
										>
											<Key class="mr-2 h-3 w-3" />
											Change Provider
										</Button>
									</div>
								</CardContent>
							</Card>
						{/each}
					</div>
				</div>
			{/if}

			<!-- User Personas Section -->
			<div>
				<div class="mb-4 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Users class="text-muted-foreground h-4 w-4" />
						<h2 class="text-lg font-semibold">My Personas</h2>
						<Badge variant="secondary" class="text-xs">{filteredUserPersonas.length}</Badge>
					</div>
					{#if filteredUserPersonas.length > 0}
						<Button variant="outline" size="sm" onclick={handleCreate}>
							<Plus class="mr-2 h-4 w-4" />
							Add New
						</Button>
					{/if}
				</div>

				{#if userPersonas.length === 0}
					<!-- Empty state -->
					<Card class="border-dashed">
						<CardContent class="flex flex-col items-center justify-center p-12 text-center">
							<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
								<Users class="text-muted-foreground h-8 w-8" />
							</div>
							<h3 class="mb-2 text-lg font-semibold">No custom personas yet</h3>
							<p class="text-muted-foreground mb-6 max-w-sm text-sm">
								Create your first persona to customize the LLM Council experience. Personas define
								how AI responds in council discussions.
							</p>
							<Button onclick={handleCreate}>
								<Plus class="mr-2 h-4 w-4" />
								Create Your First Persona
							</Button>
						</CardContent>
					</Card>
				{:else if filteredUserPersonas.length === 0 && searchQuery}
					<Card class="p-6">
						<div class="text-center">
							<p class="text-muted-foreground text-sm">No custom personas match your search.</p>
						</div>
					</Card>
				{:else}
					<p class="text-muted-foreground mb-4 text-sm">
						Custom personas you've created. Edit or delete them anytime.
					</p>
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each filteredUserPersonas as persona (persona.id)}
							<Card
								class="group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg"
							>
								<!-- Badges -->
								<div class="absolute top-2 right-2 flex gap-1">
									{#if persona.isDefault}
										<Badge variant="default" class="text-xs">Default</Badge>
									{/if}
									{#if persona.isPresident}
										<Badge variant="secondary" class="text-xs">
											<Star class="mr-1 h-3 w-3" />
											Chairman
										</Badge>
									{/if}
								</div>

								<CardContent class="p-4 pt-10">
									<div class="flex gap-3">
										<div
											class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-3xl transition-all group-hover:bg-primary/10"
										>
											{persona.avatar}
										</div>
										<div class="min-w-0 flex-1">
											<h3 class="truncate font-semibold">{persona.name}</h3>
											<p class="text-muted-foreground line-clamp-2 text-xs">
												{persona.description || 'No description'}
											</p>
										</div>
									</div>

									<!-- Provider info -->
									<div class="mt-3 rounded-lg bg-muted/50 p-2">
										{#if persona.provider}
											<div class="flex items-center justify-between text-xs">
												<span class="font-medium">{persona.provider.name}</span>
												<span class="text-muted-foreground font-mono">{persona.provider.model}</span
												>
											</div>
										{:else}
											<div class="flex items-center gap-1 text-xs text-destructive">
												<Key class="h-3 w-3" />
												No provider configured
											</div>
										{/if}
									</div>

									<!-- Actions -->
									<div class="mt-3 flex gap-2">
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
											class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
											onclick={() => handleDeleteRequest(persona.id)}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
								</CardContent>
							</Card>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Provider Selection Dialog -->
	<Dialog.Root bind:open={showSystemProviderModal}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					<Key class="h-5 w-5" />
					Change Provider
				</Dialog.Title>
				<Dialog.Description>
					{#if selectedSystemPersona}
						Select a new AI provider for <strong>{selectedSystemPersona.name}</strong>
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			{#if providers.length === 0}
				<div class="rounded-lg bg-muted p-4 text-center">
					<p class="text-muted-foreground text-sm">No providers available.</p>
					<Button
						variant="outline"
						size="sm"
						class="mt-2"
						onclick={() => goto('/ui/MoLOS-LLM-Council/settings')}
					>
						Create Provider
					</Button>
				</div>
			{:else}
				<div class="space-y-3 py-4">
					{#each providers as provider}
						<button
							class="w-full rounded-lg border p-3 text-left transition-all hover:border-primary hover:bg-muted/50 {selectedProviderId ===
							provider.id
								? 'border-primary bg-primary/5 ring-1 ring-primary'
								: ''}"
							onclick={() => (selectedProviderId = provider.id)}
						>
							<div class="flex items-center justify-between">
								<div>
									<p class="font-medium">{provider.name}</p>
									<p class="text-muted-foreground font-mono text-xs">{provider.model}</p>
								</div>
								{#if selectedProviderId === provider.id}
									<div class="h-5 w-5 rounded-full bg-primary"></div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}

			<Dialog.Footer>
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
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Delete Confirmation Dialog -->
	<Dialog.Root bind:open={showDeleteDialog}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Delete Persona?</Dialog.Title>
				<Dialog.Description>
					{#if getPersonaToDelete()}
						Are you sure you want to delete <strong>{getPersonaToDelete()?.name}</strong>? This
						action cannot be undone.
					{:else}
						Are you sure you want to delete this persona? This action cannot be undone.
					{/if}
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showDeleteDialog = false)}>Cancel</Button>
				<Button variant="destructive" onclick={confirmDelete}>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
