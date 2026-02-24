<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { ArrowLeft, Save, Loader2 } from 'lucide-svelte';
	import type { PersonaWithProvider, AIProvider } from '../../../../../modules/MoLOS-LLM-Council/src/models/index.js';

	interface PageData {
		persona: PersonaWithProvider;
		providers: AIProvider[];
	}

	let { data }: { data: PageData } = $props();

	let name = $state(data.persona.name);
	let description = $state(data.persona.description || '');
	let avatar = $state(data.persona.avatar);
	let personalityPrompt = $state(data.persona.personalityPrompt);
	let providerId = $state(data.persona.providerId);
	let isPresident = $state(data.persona.isPresident);
	let isDefault = $state(data.persona.isDefault);
	let isSaving = $state(false);
	let error = $state('');

	const AVATARS = ['🎭', '👨‍💻', '👩‍💻', '🧙', '🧛', '🎨', '🎼', '🎪', '🧑‍🎓', '👴', '🦄'];

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
</script>

<div class="container mx-auto max-w-2xl p-4 md:p-6">
	<div class="mb-6">
		<Button variant="ghost" size="sm" onclick={handleCancel}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Personas
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Edit Persona</h1>

	<Card>
		<CardHeader>
			<CardTitle>Persona Details</CardTitle>
			<CardDescription>
				Update persona configuration for your LLM Council.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<div class="space-y-2">
				<Label for="name">Name *</Label>
				<Input id="name" bind:value={name} placeholder="e.g., Creative Writer" />
			</div>

			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Input id="description" bind:value={description} placeholder="Brief description of this persona" />
			</div>

			<div class="space-y-2">
				<Label>Avatar *</Label>
				<div class="avatar-grid">
					{#each AVATARS as emoji}
						<button
							class="avatar-btn {avatar === emoji ? 'selected' : ''}"
							onclick={() => (avatar = emoji)}
						>
							{emoji}
						</button>
					{/each}
				</div>
			</div>

			<div class="space-y-2">
				<Label for="provider">AI Provider *</Label>
				<select id="provider" class="provider-select" bind:value={providerId}>
					{#each data.providers as provider}
						<option value={provider.id}>{provider.name} ({provider.model})</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<Label for="personalityPrompt">Personality Prompt *</Label>
				<Textarea
					id="personalityPrompt"
					bind:value={personalityPrompt}
					rows={6}
					placeholder="Describe persona's personality, tone, and expertise area..."
				/>
			</div>

			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<Switch id="isPresident" bind:checked={isPresident} />
					<Label for="isPresident">Can be Council Chairman</Label>
				</div>

				<div class="flex items-center gap-2">
					<Switch id="isDefault" bind:checked={isDefault} />
					<Label for="isDefault">Set as Default</Label>
				</div>
			</div>

			<div class="flex justify-end gap-2 pt-4">
				<Button variant="outline" onclick={handleCancel} disabled={isSaving}>
					Cancel
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
		</CardContent>
	</Card>
</div>

<style>
	.avatar-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
		gap: 0.5rem;
	}

	.avatar-btn {
		font-size: 2rem;
		padding: 0.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		background: white;
		cursor: pointer;
		transition: all 0.2s;
	}

	.avatar-btn:hover {
		border-color: #667eea;
		background: #f5f7ff;
	}

	.avatar-btn.selected {
		border-color: #667eea;
		background: linear-gradient(135deg, #667eea 0%, #5568d3 100%);
	}

	.provider-select {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 1rem;
		background: white;
	}

	.error-message {
		background: #fee2e2;
		color: #dc2626;
		padding: 0.75rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}
</style>
