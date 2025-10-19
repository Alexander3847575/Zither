<script lang="ts">
	let { 
		visible = $bindable(false), 
		x = 0, 
		y = 0, 
		onConfirm, 
		onCancel 
	} = $props();
	
	let clusterName = $state('');
	let inputElement = $state<HTMLInputElement>();
	
	// Auto-focus input when menu appears
	$effect(() => {
		if (visible && inputElement) {
			inputElement.focus();
			inputElement.select();
		}
	});
	
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleConfirm();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			handleCancel();
		}
	}
	
	function handleConfirm() {
		if (clusterName.trim()) {
			onConfirm?.(clusterName.trim());
			clusterName = '';
			visible = false;
		}
	}
	
	function handleCancel() {
		clusterName = '';
		visible = false;
		onCancel?.();
	}
</script>

{#if visible}
	<div 
		class="context-menu"
		style="left: {x}px; top: {y}px;"
		role="dialog"
		aria-label="Create cluster"
		tabindex="-1"
	>
		<div class="context-menu-content">
			<label for="cluster-name">Cluster Name:</label>
			<input
				id="cluster-name"
				bind:this={inputElement}
				bind:value={clusterName}
				onkeydown={handleKeydown}
				onclick={(e) => e.stopPropagation()}
				placeholder="Enter cluster name..."
				aria-describedby="cluster-help"
			/>
			<div id="cluster-help" class="help-text">
				Press Enter to confirm or Escape to cancel
			</div>
			<div class="context-menu-actions">
				<button onclick={(e) => { e.stopPropagation(); handleConfirm(); }} disabled={!clusterName.trim()}>
					Create
				</button>
				<button onclick={(e) => { e.stopPropagation(); handleCancel(); }}>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.context-menu {
		position: fixed;
		z-index: 1000;
		background: white;
		border: 1px solid #ccc;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		padding: 0;
		min-width: 200px;
	}
	
	.context-menu-content {
		padding: 16px;
	}
	
	label {
		display: block;
		font-weight: 500;
		margin-bottom: 8px;
		color: #333;
	}
	
	input {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
		margin-bottom: 8px;
	}
	
	input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}
	
	.help-text {
		font-size: 12px;
		color: #666;
		margin-bottom: 12px;
	}
	
	.context-menu-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}
	
	button {
		padding: 6px 12px;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		font-size: 14px;
	}
	
	button:hover:not(:disabled) {
		background: #f5f5f5;
	}
	
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	button:first-child {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}
	
	button:first-child:hover:not(:disabled) {
		background: #2563eb;
	}
</style>
