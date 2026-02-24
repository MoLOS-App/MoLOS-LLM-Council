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
	import { ArrowLeft, Save, Loader2, Crown, Sparkles, AlertTriangle, User } from 'lucide-svelte';
	import type { AIProvider } from '../../../models/index.js';

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
		'🔬',
		'🤖',
		'🧠',
		'📚',
		'💼',
		'🌟'
	];

	let name = $state('');
	let description = $state('');
	let avatar = $state('🎭');
	let personalityPrompt = $state('');
	let providerId = $state('');
	let isPresident = $state(false);
	let isDefault = $state(false);
	let providers = $state<AIProvider[]>([]);
	let isSaving = $state(false);
	let error = $state('');

	// Form completeness tracking
	const formSteps = $derived([
		{ key: 'name', complete: name.trim().length > 0, label: 'Name' },
		{ key: 'avatar', complete: avatar.trim().length > 0, label: 'Avatar' },
		{ key: 'provider', complete: providerId.trim().length > 0, label: 'Provider' },
		{ key: 'personality', complete: personalityPrompt.trim().length > 0, label: 'Personality' }
	]);

	const completedSteps = $derived(formSteps.filter((s) => s.complete).length);
	const progressPercent = $derived((completedSteps / formSteps.length) * 100);

	const isValid = $derived(formSteps.every((s) => s.complete));

	onMount(async () => {
		try {
			const response = await fetch('/api/MoLOS-LLM-Council/providers');
			if (response.ok) {
				const data = await response.json();
				providers = data.providers || [];
				if (providers.length > 0) {
					providerId = providers[0].id;
				}
			}
		} catch (err) {
			console.error('Failed to load providers:', err);
			error = 'Failed to load providers. Please create a provider first.';
		}
	});

	async function handleSave() {
		if (!isValid || isSaving) return;

		isSaving = true;
		error = '';

		try {
			const response = await fetch('/api/MoLOS-LLM-Council/personas', {
				method: 'POST',
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
				toast.success('Persona created successfully!');
				goto('/ui/MoLOS-LLM-Council/personas');
			} else {
				const data = await response.json();
				error = data.message || 'Failed to create persona';
				toast.error(error);
			}
		} catch (err) {
			error = 'Failed to create persona. Please try again.';
			toast.error(error);
			console.error(err);
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		goto('/ui/MoLOS-LLM-Council/personas');
	}

	function getSelectedProvider() {
		return providers.find((p) => p.id === providerId);
	}
</script>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<div class="border-b">
		<div class="container mx-auto max-w-7xl px-4 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button variant="ghost" size="sm" onclick={handleCancel}>
						<ArrowLeft class="mr-2 h-4 w-4" />
						Back to Personas
					</Button>
				</div>
				<div class="flex items-center gap-4">
					<!-- Progress indicator -->
					<div class="hidden items-center gap-2 sm:flex">
						<div class="text-muted-foreground text-sm">
							{completedSteps}/{formSteps.length} complete
						</div>
						<div class="h-2 w-24 overflow-hidden rounded-full bg-muted">
							<div
								class="h-full bg-primary transition-all duration-300"
								style="width: {progressPercent}%"
							></div>
						</div>
					</div>
					<Button onclick={handleSave} disabled={!isValid || isSaving}>
						{#if isSaving}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<Save class="mr-2 h-4 w-4" />
						{/if}
						Create Persona
					</Button>
				</div>
			</div>
		</div>
	</div>

	<main class="container mx-auto max-w-7xl px-4 py-6">
		{#if error}
			<div
				class="mb-6 flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
			>
				<AlertTriangle class="h-5 w-5 shrink-0" />
				<p class="font-medium">{error}</p>
			</div>
		{/if}

		{#if providers.length === 0}
			<Card class="border-warning/50 bg-warning/5 mb-6">
				<CardContent class="flex items-center gap-4 p-4">
					<AlertTriangle class="text-warning h-8 w-8 shrink-0" />
					<div>
						<CardTitle class="text-warning mb-1">No AI Providers Configured</CardTitle>
						<p class="text-muted-foreground text-sm">
							You need to configure at least one AI provider before creating personas.
							<a
								href="/ui/MoLOS-LLM-Council/settings"
								class="text-primary underline underline-offset-4"
							>
								Go to Settings
							</a>
						</p>
					</div>
				</CardContent>
			</Card>
		{/if}

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Left Column: Avatar, Preview & Quick Settings -->
			<div class="space-y-6">
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
							<div
								class="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-4xl transition-all"
							>
								{avatar}
							</div>
						</div>
						<div class="flex flex-wrap justify-center gap-2">
							{#each AVATARS as emoji}
								<button
									class="flex aspect-square h-12 w-12 items-center justify-center rounded-lg border-2 border-border bg-background text-2xl transition-all hover:border-primary hover:bg-primary/10 {AVATARS.includes(
										avatar
									) && avatar === emoji
										? 'border-primary bg-primary/10 ring-2 ring-primary'
										: ''}"
									onclick={() => (avatar = emoji)}
								>
									{emoji}
								</button>
							{/each}
						</div>

						<!-- Custom Avatar Input -->
						<div class="mt-4 border-t pt-4">
							<Label for="customAvatar" class="text-sm font-medium">Custom Avatar</Label>
							<p class="text-muted-foreground mb-2 text-xs">
								Enter an emoji or 1-2 characters for a custom avatar
							</p>
							<div class="flex gap-2">
								<Input
									id="customAvatar"
									type="text"
									maxlength={4}
									placeholder="✨ or AB"
									class="flex-1"
									oninput={(e) => {
										const value = (e.target as HTMLInputElement).value;
										if (value) avatar = value;
									}}
									value={!AVATARS.includes(avatar) ? avatar : ''}
								/>
							</div>
							{#if !AVATARS.includes(avatar) && avatar}
								<p class="mt-2 text-xs text-primary">Using custom avatar: {avatar}</p>
							{/if}
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
								disabled={providers.length === 0}
							>
								{#if providers.length === 0}
									<option value="">No providers available</option>
								{:else}
									{#each providers as provider}
										<option value={provider.id}>
											{provider.name} ({provider.model})
										</option>
									{/each}
								{/if}
							</select>
						</div>
						{#if getSelectedProvider()}
							<div class="mt-3 rounded-lg bg-muted p-3">
								<p class="text-xs font-medium">{getSelectedProvider()?.name}</p>
								<p class="text-muted-foreground mt-1 font-mono text-xs">
									{getSelectedProvider()?.model}
								</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>

			<!-- Right Column: Main Content -->
			<div class="space-y-6">
				<!-- Basic Info Card -->
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>Persona name and description</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<Label for="name" class="text-sm font-medium">Name *</Label>
							<Input
								id="name"
								bind:value={name}
								placeholder="e.g., Creative Writer, Code Reviewer, Devil's Advocate"
							/>
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
							<div class="text-muted-foreground flex justify-between text-xs">
								<span>Be specific and detailed for better results</span>
								<span>{personalityPrompt.length} characters</span>
							</div>
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

						<!-- Example Prompts -->
						<details class="group">
							<summary class="cursor-pointer text-sm font-medium text-primary hover:underline">
								Need inspiration? Click to see example prompts
							</summary>
							<div class="mt-3 space-y-3">
								<button
									class="w-full rounded-lg border p-3 text-left text-xs transition-all hover:border-primary hover:bg-muted/50"
									onclick={() =>
										(personalityPrompt = `You are a meticulous Code Reviewer with 15 years of software engineering experience. Your role is to analyze code submissions for:

1. **Code Quality**: Clean code principles, SOLID patterns, maintainability
2. **Security**: Potential vulnerabilities, injection risks, authentication issues
3. **Performance**: Algorithmic complexity, memory usage, optimization opportunities
4. **Best Practices**: Language-specific idioms, framework conventions

**Communication Style**: 
- Be constructive and specific, not dismissive
- Provide code examples when suggesting improvements
- Acknowledge good practices alongside issues
- Use a professional but approachable tone

When reviewing, always start with positive observations, then move to suggestions organized by priority (critical, important, nice-to-have).`)}
								>
									<div class="mb-1 font-semibold">🧑‍💻 Code Reviewer</div>
									<p class="text-muted-foreground">
										Meticulous analysis of code quality, security, and best practices
									</p>
								</button>

								<button
									class="w-full rounded-lg border p-3 text-left text-xs transition-all hover:border-primary hover:bg-muted/50"
									onclick={() =>
										(personalityPrompt = `You are a Creative Ideator who thrives on unconventional thinking and lateral problem-solving. Your superpower is generating diverse, unexpected ideas that others might miss.

**Your Approach**:
- Start with "What if..." questions
- Draw connections between unrelated domains
- Challenge assumptions the user might not realize they have
- Offer 3-5 distinct angles on any problem

**Communication Style**:
- Enthusiastic and imaginative
- Use metaphors and analogies liberally
- Build on ideas progressively (yes, and...)
- Balance wild ideas with practical considerations

**What You Avoid**:
- Being overly critical of ideas (save that for other personas)
- Staying in familiar territory
- Dismissing "crazy" ideas too quickly`)}
								>
									<div class="mb-1 font-semibold">💡 Creative Ideator</div>
									<p class="text-muted-foreground">
										Unconventional thinking and lateral problem-solving
									</p>
								</button>

								<button
									class="w-full rounded-lg border p-3 text-left text-xs transition-all hover:border-primary hover:bg-muted/50"
									onclick={() =>
										(personalityPrompt = `You are the Devil's Advocate, a critical thinker whose job is to stress-test ideas, find weaknesses, and challenge assumptions. You are NOT being negative—you're being thorough.

**Your Mission**:
- Identify potential failure modes and edge cases
- Question underlying assumptions
- Consider unintended consequences
- Represent perspectives that might be overlooked

**Communication Style**:
- Respectful but direct
- Frame challenges as questions when possible
- Always explain WHY something might be problematic
- Acknowledge when an idea is solid

**Important**: 
- You're not trying to destroy ideas, you're trying to make them stronger
- After raising concerns, suggest how they might be addressed
- Distinguish between critical flaws and minor issues`)}
								>
									<div class="mb-1 font-semibold">🎭 Devil's Advocate</div>
									<p class="text-muted-foreground">Critical analysis and stress-testing of ideas</p>
								</button>
							</div>
						</details>

						<!-- Preview of personality -->
						{#if personalityPrompt.length > 0}
							<div
								class="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3"
							>
								<div class="text-2xl">{avatar}</div>
								<div class="flex-1">
									<p class="text-sm font-medium">{name || 'Persona Name'}</p>
									<p class="text-muted-foreground line-clamp-2 text-xs">
										{personalityPrompt.slice(0, 120)}...
									</p>
								</div>
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- Form Progress (Mobile) -->
			</div>
		</div>
	</main>
</div>
