<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft, Save, Loader2, Crown, Sparkles } from 'lucide-svelte';
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

	const AVATARS = ['🎭', '👨‍💻', '👩‍💻', '🧙', '🧛', '🎨', '🎼', '🎪', '🧑‍🎓', '👴', '🦄', '🚀', '💡', '🎯', '🔬'];

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

	function handleDelete() {
		if (confirm('Are you sure you want to delete this persona?')) {
			fetch(`/api/MoLOS-LLM-Council/personas/${data.persona.id}`, { method: 'DELETE' }).then(
				(response) => {
					if (response.ok) {
						goto('/ui/MoLOS-LLM-Council/personas');
					} else {
						alert('Failed to delete persona');
					}
				}
			);
		}
	}
</script>

<div class="min-h-screen bg-background">
	<div class="border-b">
		<div class="container mx-auto max-w-7xl px-4 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button variant="ghost" size="sm" onclick={handleCancel}>
						<ArrowLeft class="mr-2 h-4 w-4" />
						Back to Personas
					</Button>
					<div>
						<h1 class="text-lg font-bold">Edit Persona</h1>
						<p class="text-sm text-muted-foreground">Configure your AI council member</p>
					</div>
				</div>
				<div class="flex gap-2">
					<Button variant="destructive" onclick={handleDelete} disabled={isSaving}>
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
	</div>

	<main class="container mx-auto max-w-7xl px-4 py-6">
		{#if error}
			<div class="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
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
							<div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-2xl ">
								{avatar}
							</div>
						</div>
						<div class="flex flex-wrap justify-center flex-row gap-2">
							{#each AVATARS as emoji}
								<button
									class="aspect-square rounded-lg w-12 h-12 text-center border-2 border-border bg-background text-2xl transition-all hover:border-primary hover:bg-primary/10 {avatar === emoji
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
								<Label for="isPresident" class="text-sm font-medium">
									Can be Council Chairman
								</Label>
								<p class="text-xs text-muted-foreground">
									Allow this persona to lead council discussions
								</p>
							</div>
							<Switch id="isPresident" bind:checked={isPresident} />
						</div>

						<div class="flex items-center justify-between space-y-0">
							<div class="flex-1">
								<Label for="isDefault" class="text-sm font-medium">
									Set as Default
								</Label>
								<p class="text-xs text-muted-foreground">
									Include this persona by default
								</p>
							</div>
							<Switch id="isDefault" bind:checked={isDefault} />
						</div>

						{#if isPresident}
							<div class="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
								<Crown class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
								<p class="text-xs text-muted-foreground">
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
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
									{
										data.providers.find((p) => p.id === providerId)?.name ||
											'Unknown Provider'
									}
								</p>
								<p class="mt-1 text-xs text-muted-foreground font-mono">
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
							<p class="text-xs text-muted-foreground">
								A short, memorable name for this persona
							</p>
						</div>

						<div class="space-y-2">
							<Label for="description" class="text-sm font-medium">Description</Label>
							<Input
								id="description"
								bind:value={description}
								placeholder="Brief description of this persona's role"
							/>
							<p class="text-xs text-muted-foreground">
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
							<ul class="list-inside list-disc space-y-1 text-xs text-muted-foreground">
								<li>Define specific expertise areas and knowledge base</li>
								<li>Describe the tone and communication style</li>
								<li>Include specific perspectives or biases</li>
								<li>Mention how they should interact with other personas</li>
								<li>Set expectations for response length and detail</li>
							</ul>
						</div>

						<div class="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
							<div class="text-2xl">{avatar}</div>
							<div class="flex-1">
								<p class="text-sm font-medium">{name || 'Persona Name'}</p>
								<p class="text-xs text-muted-foreground">
									{personalityPrompt.slice(0, 100) || 'No personality defined yet...'}...
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	</main>
</div>
