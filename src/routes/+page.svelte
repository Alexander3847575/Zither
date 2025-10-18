<script>
	import { Dock } from '$lib';

	let message = $state('Click a dock item!');
	let position = $state('bottom');

	/**
	 * Handle dock item clicks
	 * @param {string} id
	 * @param {string} label
	 */
	function handleDockClick(id, label) {
		// Handle dropdown items
		switch (id) {
			// Zoom actions
			case 'zoom-in':
				message = 'Zoomed in!';
				break;
			case 'zoom-out':
				message = 'Zoomed out!';
				break;
			case 'zoom-fit':
				message = 'Fit to screen!';
				break;
			case 'zoom-reset':
				message = 'Zoom reset to 100%!';
				break;
			
			// New Pane actions
			case 'new-text':
				message = 'Text pane created!';
				break;
			case 'new-image':
				message = 'Image pane created!';
				break;
			case 'new-terminal':
				message = 'Terminal pane created!';
				break;
			case 'new-browser':
				message = 'Browser pane created!';
				break;
			
			// World Map actions
			case 'map-satellite':
				message = 'Switched to satellite view!';
				break;
			case 'map-terrain':
				message = 'Switched to terrain view!';
				break;
			case 'map-street':
				message = 'Switched to street view!';
				break;
			case 'map-political':
				message = 'Switched to political view!';
				break;
			
			// Settings actions
			case 'preferences':
				message = 'Preferences opened!';
				break;
			case 'shortcuts':
				message = 'Keyboard shortcuts displayed!';
				break;
			case 'plugins':
				message = 'Plugin manager opened!';
				break;
			case 'about':
				message = 'About dialog opened!';
				break;
			
			default:
				message = `${label} clicked!`;
		}
	}
</script>

<div class="container">
	<h1>Dock Component Test</h1>
	
	<div class="controls">
		<h2>Position Controls</h2>
		<p class="drag-instructions">💡 <strong>Try dragging:</strong> Double-click the dock and drag to reposition it!</p>
		<div class="position-buttons">
			<button 
				class="control-btn" 
				class:active={position === 'bottom'}
				onclick={() => position = 'bottom'}
			>
				Bottom
			</button>
			<button 
				class="control-btn" 
				class:active={position === 'top'}
				onclick={() => position = 'top'}
			>
				Top
			</button>
			<button 
				class="control-btn" 
				class:active={position === 'left'}
				onclick={() => position = 'left'}
			>
				Left
			</button>
			<button 
				class="control-btn" 
				class:active={position === 'right'}
				onclick={() => position = 'right'}
			>
				Right
			</button>
		</div>
	</div>

	<div class="message-area">
		<h2>Status</h2>
		<p class="message">{message}</p>
	</div>

	<div class="dock-container dock-container--{position}">
		<Dock bind:position onItemClick={handleDockClick} />
	</div>
</div>

<style>
	.container {
		min-height: 100vh;
		padding: 20px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		font-family: system-ui, -apple-system, sans-serif;
		position: relative;
	}

	h1 {
		text-align: center;
		margin-bottom: 2rem;
		font-size: 2.5rem;
		text-shadow: 0 2px 4px rgba(0,0,0,0.3);
	}

	h2 {
		font-size: 1.2rem;
		margin-bottom: 1rem;
		opacity: 0.9;
	}

	.controls {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.drag-instructions {
		margin: 0 0 1rem 0;
		padding: 10px;
		background: rgba(0, 255, 150, 0.1);
		border: 1px solid rgba(0, 255, 150, 0.3);
		border-radius: 6px;
		font-size: 0.9rem;
		color: #e0ffe0;
	}

	.position-buttons {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.control-btn {
		padding: 8px 16px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 6px;
		color: white;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.control-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: translateY(-1px);
	}

	.control-btn.active {
		background: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.message-area {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.message {
		font-size: 1.1rem;
		font-weight: 500;
		margin: 0;
		padding: 10px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 6px;
		border-left: 4px solid #4ade80;
	}

	.dock-container {
		position: fixed;
	}

	.dock-container--bottom {
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
	}

	.dock-container--top {
		top: 20px;
		left: 50%;
		transform: translateX(-50%);
	}

	.dock-container--left {
		left: 20px;
		top: 50%;
		transform: translateY(-50%);
	}

	.dock-container--right {
		right: 20px;
		top: 50%;
		transform: translateY(-50%);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.container {
			padding: 10px;
		}
		
		h1 {
			font-size: 2rem;
		}
		
		.position-buttons {
			justify-content: center;
		}
		
		.dock-container--bottom,
		.dock-container--top {
			left: 10px;
			right: 10px;
			transform: none;
		}
		
		.dock-container--left,
		.dock-container--right {
			top: auto;
			bottom: 10px;
			transform: none;
		}
		
		.dock-container--left {
			left: 10px;
			right: auto;
		}
		
		.dock-container--right {
			right: 10px;
			left: auto;
		}
	}
</style>
