<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { ArrowLeft, Save, Loader2, Crown, Sparkles, Trash2 } from 'lucide-svelte';
	import type { PersonaWithProvider, AIProvider } from '../../../../../models/index.js';

	interface PageData {
		persona: PersonaWithProvider;
		providers: AIProvider[];
	}

	let { data }: { data: PageData } = $props();

	const initialPersona = data.persona;
	let name = $state(initialPersona.name);
	let description = $state(initialPersona.description || '');
	let avatar = $state(initialPersona.avatar);
	let personalityPrompt = $state(initialPersona.personalityPrompt);
	let providerId = $state(initialPersona.providerId);
	let isPresident = $state(initialPersona.isPresident);
	let isDefault = $state(initialPersona.isDefault);
	let isSaving = $state(false);
	let error = $state('');
	let showDeleteDialog = $state(false);

	const AVATARS = [
		'🎭',
		'👨‍💻',
		'👩‍💻',
		'🧙',
		'🧛',
		'🎨',
		'🎼',
		'🎪',
		'🧑‍🎓',
		'👴',
		'🦄',
		'🚀',
		'💡',
		'🎯',
		'🔬'
	];

	const isValid = $derived(
		name.trim().length > 0 &&
			avatar.trim().length > 0 &&
			personalityPrompt.trim().length > 0 &&
			providerId.trim().length > 0
	);

	async function handleSave() {
		if (!isValid || isSaving) return;

		isSaving = true;
		error = '';

		try {
			const response = await fetch(`/api/MoLOS-LLM-Council/personas/${data.persona.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || undefined,
					avatar: avatar.trim(),
					personalityPrompt: personalityPrompt.trim(),
					providerId,
					isPresident,
					isDefault
				})
			});

			if (response.ok) {
				goto('/ui/MoLOS-LLM-Council/personas');
			} else {
				const result = await response.json();
				error = result.message || 'Failed to update persona';
			}
		} catch (err) {
			error = 'Failed to update persona. Please try again.';
			console.error(err);
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		goto('/ui/MoLOS-LLM-Council/personas');
	}

	function handleDeleteRequest() {
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		try {
			const response = await fetch(`/api/MoLOS-LLM-Council/personas/${data.persona.id}`, {
				method: 'DELETE'
			});
			if (response.ok) {
				goto('/ui/MoLOS-LLM-Council/personas');
			} else {
				toast.error('Failed to delete persona');
			}
		} catch (err) {
			toast.error('Failed to delete persona');
			console.error(err);
		} finally {
			showDeleteDialog = false;
		}
	}
</script>

<div class="flex h-full flex-col">

	<!-- Main Content - Full Width, Scrollable -->
	<div class="flex-1 overflow-auto p-4 pb-24">
		{#if error}
			<div
				class="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
			>
				<p class="font-medium">{error}</p>
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Left Column: Avatar and Quick Settings -->
			<div class="space-y-6 lg:col-span-1">
				<!-- Avatar Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Sparkles class="h-5 w-5 text-primary" />
							Avatar
						</CardTitle>
						<CardDescription>Choose a visual representation</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="mb-4 flex justify-center">
							<div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-2xl">
								{avatar}
							</div>
						</div>
						<div class="flex flex-row flex-wrap justify-center gap-2">
							{#each AVATARS as emoji}
								<button
									class="aspect-square h-12 w-12 rounded-lg border-2 border-border bg-background text-center text-2xl transition-all hover:border-primary hover:bg-primary/10 {avatar ===
									emoji
										? 'border-primary bg-primary/10 ring-2 ring-primary'
										: ''}"
									onclick={() => (avatar = emoji)}
								>
									{emoji}
								</button>
							{/each}
						</div>
					</CardContent>
				</Card>

				<!-- Quick Settings Card -->
				<Card>
					<CardHeader>
						<CardTitle>Quick Settings</CardTitle>
						<CardDescription>Persona configuration</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="flex items-center justify-between space-y-0">
							<div class="flex-1">
								<Label for="isPresident" class="text-sm font-medium">Can be Council Chairman</Label>
								<p class="text-muted-foreground text-xs">
									Allow this persona to lead council discussions
								</p>
							</div>
							<Switch id="isPresident" bind:checked={isPresident} />
						</div>

						<div class="flex items-center justify-between space-y-0">
							<div class="flex-1">
								<Label for="isDefault" class="text-sm font-medium">Set as Default</Label>
								<p class="text-muted-foreground text-xs">Include this persona by default</p>
							</div>
							<Switch id="isDefault" bind:checked={isDefault} />
						</div>

						{#if isPresident}
							<div class="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
								<Crown class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
								<p class="text-muted-foreground text-xs">
									This persona can be selected as the Council Chairman for synthesis.
								</p>
							</div>
						{/if}

						{#if isDefault}
							<Badge variant="secondary" class="w-fit">Default Persona</Badge>
						{/if}
					</CardContent>
				</Card>

				<!-- Provider Card -->
				<Card>
					<CardHeader>
						<CardTitle>AI Provider</CardTitle>
						<CardDescription>Select the AI model for this persona</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="space-y-2">
							<Label for="provider" class="text-sm font-medium">Provider *</Label>
							<select
								id="provider"
								class="border-input w-full rounded-md border bg-background px-3 py-2 text-sm"
								bind:value={providerId}
							>
								{#each data.providers as provider}
									<option value={provider.id}>
										{provider.name} ({provider.model})
									</option>
								{/each}
							</select>
						</div>
						{#if providerId}
							<div class="mt-3 rounded-lg bg-muted p-3">
								<p class="text-xs font-medium">
									{data.providers.find((p) => p.id === providerId)?.name || 'Unknown Provider'}
								</p>
								<p class="text-muted-foreground mt-1 font-mono text-xs">
									{data.providers.find((p) => p.id === providerId)?.model || ''}
								</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>

			<!-- Right Column: Main Content -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Basic Info Card -->
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>Persona name and description</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<Label for="name" class="text-sm font-medium">Name *</Label>
							<Input id="name" bind:value={name} placeholder="e.g., Creative Writer" />
							<p class="text-muted-foreground text-xs">A short, memorable name for this persona</p>
						</div>

						<div class="space-y-2">
							<Label for="description" class="text-sm font-medium">Description</Label>
							<Input
								id="description"
								bind:value={description}
								placeholder="Brief description of this persona's role"
							/>
							<p class="text-muted-foreground text-xs">
								Optional description shown in the persona card
							</p>
						</div>
					</CardContent>
				</Card>

				<!-- Personality Prompt Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Sparkles class="h-5 w-5 text-primary" />
							Personality Prompt
						</CardTitle>
						<CardDescription>
							Define how this persona thinks, speaks, and approaches problems
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<Label for="personalityPrompt" class="text-sm font-medium">
								Personality Prompt *
							</Label>
							<Textarea
								id="personalityPrompt"
								bind:value={personalityPrompt}
								rows={12}
								placeholder="Describe persona's personality, tone, expertise area, and communication style..."
								class="resize-none"
							/>
						</div>

						<div class="rounded-lg bg-muted p-4">
							<p class="mb-2 text-sm font-semibold">Tips for a good persona:</p>
							<ul class="text-muted-foreground list-inside list-disc space-y-1 text-xs">
								<li>Define specific expertise areas and knowledge base</li>
								<li>Describe the tone and communication style</li>
								<li>Include specific perspectives or biases</li>
								<li>Mention how they should interact with other personas</li>
								<li>Set expectations for response length and detail</li>
							</ul>
						</div>

						<div
							class="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3"
						>
							<div class="text-2xl">{avatar}</div>
							<div class="flex-1">
								<p class="text-sm font-medium">{name || 'Persona Name'}</p>
								<p class="text-muted-foreground text-xs">
									{personalityPrompt.slice(0, 100) || 'No personality defined yet...'}...
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	</div>

	<!-- Fixed Bottom Bar -->
	<div class="absolute right-0 bottom-0 left-0 border-t bg-background p-4">
		<div class="flex items-center justify-between">
			<Button variant="outline" onclick={handleCancel}>Cancel</Button>
			<div class="flex items-center gap-2">
				<Button variant="destructive" onclick={handleDeleteRequest} disabled={isSaving}>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete
				</Button>
				<Button onclick={handleSave} disabled={!isValid || isSaving}>
					{#if isSaving}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<Save class="mr-2 h-4 w-4" />
					{/if}
					Save Changes
				</Button>
			</div>
		</div>
	</div>

	<!-- Delete Confirmation Dialog -->
	<Dialog.Root bind:open={showDeleteDialog}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Delete Persona?</Dialog.Title>
				<Dialog.Description>
					Are you sure you want to delete this persona? This action cannot be undone.
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showDeleteDialog = false)}>Cancel</Button>
				<Button variant="destructive" onclick={confirmDelete}>Delete</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
