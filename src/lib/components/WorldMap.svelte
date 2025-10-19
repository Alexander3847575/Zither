<script lang="ts">
	import { onMount } from 'svelte';
	import { storageManager } from '$lib/framework/storageManager';
	
	// Import types from storageManager
	interface ChunkData {
		coords: [number, number];
		uuid: string;
		panes: PaneData[];
		dimensions?: [number, number];
		isLoaded?: boolean;
		lastAccessed?: Date;
	}

	interface PaneData {
		uuid: string;
		paneType: string;
		data: Object;
		chunkCoords: [number, number];
		paneCoords: [number, number];
		paneSize: [number, number];
		semanticTags: string;
		color: [number, number, number, number];
	}

	let { visible = $bindable(false), onChunkClick, currentViewportPos } = $props();
	
	let allChunks: ChunkData[] = $state([]);
	let loading = $state(false);
	let error: string | null = $state(null);
	let isHovered = $state(false);
	let hideTimeout: NodeJS.Timeout | null = $state(null);

	// Calculate bounds of explored world (only stored chunks)
	let bounds = $derived(() => {
		if (allChunks.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 1, height: 1 };
		
		const coords = allChunks.map(chunk => chunk.coords);
		const minX = Math.min(...coords.map(c => c[0]));
		const maxX = Math.max(...coords.map(c => c[0]));
		const minY = Math.min(...coords.map(c => c[1]));
		const maxY = Math.max(...coords.map(c => c[1]));
		
		return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
	});

	// Fixed minimap dimensions - smaller for corner widget
	const minimapWidth = 280;
	const minimapHeight = 200;

	// Dynamic scale calculation to fit content inside fixed minimap
	let dynamicScale = $derived(() => {
		const b = bounds();
		if (b.width === 1 && b.height === 1) return 50; // Default for single chunk
		
		const scaleX = minimapWidth / b.width;
		const scaleY = minimapHeight / b.height;
		return Math.min(scaleX, scaleY) * 0.9; // 0.9 for padding
	});

	// Position calculation functions using dynamic scale
	let getChunkPosition = $derived(() => (chunkCoords: [number, number]) => ({
		x: (chunkCoords[0] - bounds().minX) * dynamicScale(),
		y: (chunkCoords[1] - bounds().minY) * dynamicScale()
	}));

	let getPanePosition = $derived(() => (pane: PaneData, chunkCoords: [number, number]) => {
		const chunkPos = getChunkPosition()(chunkCoords);
		return {
			x: chunkPos.x + (pane.paneCoords[0] * dynamicScale() / 16), // Scale pane within chunk
			y: chunkPos.y + (pane.paneCoords[1] * dynamicScale() / 16),
			width: (pane.paneSize[0] * dynamicScale() / 16),
			height: (pane.paneSize[1] * dynamicScale() / 16)
		};
	});

	onMount(() => {
		loadAllChunks().catch(console.error);
		
		// Listen for storage changes
		const handleStorageChange = () => {
			loadAllChunks();
		};
		
		// Listen for custom storage events
		window.addEventListener('storage-changed', handleStorageChange);
		
		// Also listen for browser storage events (if using localStorage)
		window.addEventListener('storage', (e) => {
			if (e.key === 'zither-chunks') {
				loadAllChunks();
			}
		});
		
		return () => {
			window.removeEventListener('storage-changed', handleStorageChange);
			window.removeEventListener('storage', handleStorageChange);
		};
	});

	// Transient behavior - auto-hide after delay unless hovered
	$effect(() => {
		if (!visible) return;
		
		// Clear any existing timeout
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}
		
		// Set timeout to hide after 3 seconds if not hovered
		hideTimeout = setTimeout(() => {
			if (!isHovered) {
				visible = false;
			}
		}, 3000);
		
		return () => {
			if (hideTimeout) {
				clearTimeout(hideTimeout);
				hideTimeout = null;
			}
		};
	});

	// Reset timeout when hover state changes
	$effect(() => {
		if (isHovered && hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		} else if (!isHovered && visible) {
			hideTimeout = setTimeout(() => {
				visible = false;
			}, 3000);
		}
	});

	async function loadAllChunks() {
		loading = true;
		error = null;
		try {
			allChunks = storageManager.getAllChunksArray();
			console.log('Loaded chunks for world map:', allChunks.length);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
			error = `Failed to load chunks: ${errorMessage}`;
			console.error('Failed to load chunks for world map:', err);
		} finally {
			loading = false;
		}
	}

	function handleChunkClick(chunkCoords: [number, number]) {
		console.log('Chunk clicked:', chunkCoords);
		if (onChunkClick) {
			onChunkClick(chunkCoords);
		}
		// Keep the world map open - don't close automatically
	}

</script>

{#if visible}
	<div class="world-map-overlay">
		<div 
			class="world-map-container"
			role="dialog"
			aria-label="World Map"
			tabindex="0"
			onmouseenter={() => isHovered = true}
			onmouseleave={() => isHovered = false}
		>
			<div class="world-map-header">
				<h3>World Map</h3>
			</div>
			
			<div class="world-map-content">
				{#if loading}
					<p>Loading...</p>
				{:else if error}
					<div class="error-message">
						<p>{error}</p>
						<button onclick={() => loadAllChunks()}>Retry</button>
					</div>
				{:else if allChunks.length === 0}
					<p>No chunks found</p>
				{:else}
					<div 
						class="world-map-viewport" 
						style="width: {minimapWidth}px; height: {minimapHeight}px;"
					>
						{#each allChunks as chunk (chunk.uuid)}
							<div 
								class="chunk-representation"
								class:current-chunk={currentViewportPos && chunk.coords[0] === currentViewportPos[0] && chunk.coords[1] === currentViewportPos[1]}
								style="
									left: {getChunkPosition()(chunk.coords).x}px;
									top: {getChunkPosition()(chunk.coords).y}px;
									width: {dynamicScale()}px;
									height: {dynamicScale()}px;
								"
								onclick={() => handleChunkClick(chunk.coords)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										handleChunkClick(chunk.coords);
									}
								}}
								role="button"
								tabindex="0"
								aria-label="Navigate to chunk at {chunk.coords[0]}, {chunk.coords[1]}"
							>
								{#each chunk.panes as pane (pane.uuid)}
									<div 
										class="pane-representation"
										style="
											left: {getPanePosition()(pane, chunk.coords).x - getChunkPosition()(chunk.coords).x}px;
											top: {getPanePosition()(pane, chunk.coords).y - getChunkPosition()(chunk.coords).y}px;
											width: {getPanePosition()(pane, chunk.coords).width}px;
											height: {getPanePosition()(pane, chunk.coords).height}px;
											background-color: rgba({pane.color[0]}, {pane.color[1]}, {pane.color[2]}, {pane.color[3] / 255});
										"
									></div>
								{/each}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.world-map-overlay {
		position: fixed;
		bottom: 20px;
		right: 20px;
		z-index: 1000;
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
	}
	
	.world-map-container {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 12px;
		padding: 16px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		max-width: 400px;
		max-height: 300px;
		overflow: hidden;
		opacity: 0.3;
		transition: opacity 0.3s ease;
	}

	.world-map-container:hover {
		opacity: 0.95;
	}
	
	.world-map-header {
		margin-bottom: 12px;
		text-align: center;
	}
	
	.world-map-header h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #374151;
	}
	
	.world-map-content {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.world-map-viewport {
		position: relative;
		border: 1px solid rgba(0, 0, 0, 0.1);
		background: rgba(249, 250, 251, 0.8);
		border-radius: 8px;
		margin: 0 auto;
	}

	.chunk-representation {
		position: absolute;
		border: 1px solid #999;
		background: rgba(200, 200, 200, 0.1);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.chunk-representation:hover {
		background: rgba(200, 200, 200, 0.3);
		border-color: #666;
		transform: scale(1.05);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.chunk-representation:active {
		transform: scale(0.95);
	}

	.current-chunk {
		background: rgba(59, 130, 246, 0.3) !important;
		border-color: #3b82f6 !important;
		border-width: 2px !important;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
	}

	.current-chunk:hover {
		background: rgba(59, 130, 246, 0.4) !important;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2) !important;
	}

	.pane-representation {
		position: absolute;
		border: 1px solid rgba(0, 0, 0, 0.2);
		border-radius: 2px;
	}

	.error-message {
		text-align: center;
		color: #dc2626;
	}

	.error-message button {
		margin-top: 10px;
		padding: 8px 16px;
		background: #dc2626;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.error-message button:hover {
		background: #b91c1c;
	}

</style>
