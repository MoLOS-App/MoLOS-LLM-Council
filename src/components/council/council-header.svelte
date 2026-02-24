<script lang="ts">
	import { BrainCircuit } from 'lucide-svelte';
</script>

<div class="council-header">
	<div class="header-content">
		<div class="icon-wrapper">
			<BrainCircuit size={48} />
		</div>
		<div class="text-content">
			<h1>AI Council</h1>
			<p>Gather wisdom from multiple AI perspectives</p>
		</div>
	</div>
</div>

<style>
	.council-header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 3rem 2rem;
		border-radius: 1rem;
		margin-bottom: 2rem;
		color: white;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.icon-wrapper {
		background: rgba(255, 255, 255, 0.2);
		padding: 1rem;
		border-radius: 1rem;
		backdrop-filter: blur(10px);
	}

	.text-content h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.text-content p {
		font-size: 1.1rem;
		opacity: 0.9;
		margin: 0;
	}
</style>
