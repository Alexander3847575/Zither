<!--
@component
A draggable dock component with built-in items for common application functions.
Includes: Zoom, New Pane, World Map, and Settings buttons with dropdown menus.

Features:
- Draggable repositioning (double-click and drag)
- Auto-closing dropdowns on mouse leave
- Transient appearance (30% opacity, full on hover)
- Smart snap zones (top, bottom, left, right)

Usage:
  ```html
  <Dock bind:position onItemClick={(id, label) => console.log(`${label} clicked`)} />
  ```
-->
<script>
	import Slider from './Slider.svelte';
	
	// SVG icon paths (served from static folder)
	const worldPlusIcon = '/icons/world-plus.svg';
	const fileUploadIcon = '/icons/file-upload.svg';
	const mapIcon = '/icons/map.svg';
	const sparklesIcon = '/icons/sparkles.svg';
	const paletteIcon = '/icons/palette.svg';
	const zoomInIcon = '/icons/zoom-in.svg';
	const browserPlusIcon = '/icons/browser-plus.svg';
	const layoutDashboardIcon = '/icons/layout-dashboard.svg';
	const settingsIcon = '/icons/settings.svg';

	/**
	 * @typedef {Object} DockItem
	 * @property {string} id - Unique identifier for the dock item
	 * @property {string} label - Display label for the item
	 * @property {string} [icon] - Optional icon class or path
	 * @property {() => void} [action] - Optional click handler
	 * @property {boolean} [hasSlider] - Whether this item shows a slider instead of dropdown
	 */

	/** @type {{ position?: 'bottom' | 'top' | 'left' | 'right', onItemClick?: (id: string, label: string) => void, onZoomChange?: (value: number) => void }} */
	let { position = $bindable('bottom'), onItemClick, onZoomChange } = $props();

	let activeDropdown = $state(null);
	let closeTimeout = $state(null);
	let zoomLevel = $state(1); // Zoom level from 0.1 to 3.0

	// Determine slider orientation based on dock position
	const sliderOrientation = $derived(() => {
		return (position === 'left' || position === 'right') ? 'horizontal' : 'vertical';
	});

	// Handle zoom level changes
	$effect(() => {
		if (onZoomChange) {
			onZoomChange(zoomLevel);
		}
	});

	// Built-in dock items with dropdown menus and sliders
	const items = [
		{
			id: 'zoom',
			label: 'Zoom',
			icon: zoomInIcon,
			hasSlider: true
		},
		{
			id: 'new-pane',
			label: 'New Pane',
			icon: browserPlusIcon,
			dropdown: [
				{ id: 'new-browser', label: 'Browser Pane', icon: worldPlusIcon },
				{ id: 'new-file', label: 'File Pane', icon: fileUploadIcon },
			]
		},
		{
			id: 'world-map',
			label: 'World Map',
			icon: layoutDashboardIcon,
			dropdown: [
				{ id: 'world-map', label: 'World Map', icon: mapIcon },
				{ id: 'auto-arrange', label: 'Auto Arrange', icon: sparklesIcon }
			]
		},
		{
			id: 'settings',
			label: 'Settings',
			icon: settingsIcon,
			dropdown: [
				{ id: 'theme', label: 'Theme', icon: paletteIcon }
			]
		}
	];

	/**
	 * Handle dock item click - toggles dropdown
	 * @param {string} id
	 */
	function toggleDropdown(id) {
		activeDropdown = activeDropdown === id ? null : id;
	}

	/**
	 * Handle dropdown item click
	 * @param {string} itemId
	 * @param {string} label
	 */
	function handleDropdownClick(itemId, label) {
		activeDropdown = null;
		if (onItemClick) {
			onItemClick(itemId, label);
		}
	}

	/**
	 * Close dropdown when clicking outside
	 */
	function closeDropdown() {
		activeDropdown = null;
	}

	/**
	 * Handle mouse leave from dock item container
	 * @param {string} itemId
	 */
	function handleMouseLeave(itemId) {
		// Only close if leaving the currently active dropdown's container
		if (activeDropdown === itemId) {
			closeTimeout = setTimeout(() => {
				activeDropdown = null;
				closeTimeout = null;
			}, 200);
		}
	}

	/**
	 * Handle mouse enter to cancel auto-close
	 * @param {string} itemId
	 */
	function handleMouseEnter(itemId) {
		// Cancel any pending close timeout
		if (closeTimeout) {
			clearTimeout(closeTimeout);
			closeTimeout = null;
		}
	}

	// Cleanup timeout on component destroy
	$effect(() => {
		return () => {
			if (closeTimeout) {
				clearTimeout(closeTimeout);
			}
		};
	});

	/**
	 * Draggable action for dock repositioning
	 * @type {import('svelte/action').Action<HTMLElement, { onPositionChange: (pos: string) => void, currentPosition: string }>}
	 */
	function draggableAction(node, options) {
		const { onPositionChange, currentPosition } = options;

		let dragState = {
			isDragging: false,
			clickCount: 0,
			clickTimer: null
		};

		/**
		 * Calculate snap zone based on mouse position
		 * @param {number} mouseX
		 * @param {number} mouseY
		 * @returns {string}
		 */
		function calculateSnapZone(mouseX, mouseY) {
			const { innerWidth: vw, innerHeight: vh } = window;
			const threshold = Math.max(120, Math.min(vw, vh) * 0.12);

			// Edge zones (exclusive, highest priority)
			if (mouseY <= threshold) return 'top';
			if (mouseY >= vh - threshold) return 'bottom';
			if (mouseX <= threshold) return 'left';
			if (mouseX >= vw - threshold) return 'right';

			// Center area - find closest edge
			const distances = {
				top: mouseY,
				bottom: vh - mouseY,
				left: mouseX,
				right: vw - mouseX
			};

			return Object.entries(distances)
				.reduce((closest, [pos, dist]) =>
					dist < closest.distance ? { position: pos, distance: dist } : closest,
					{ position: currentPosition || 'bottom', distance: Infinity }
				).position;
		}

		/**
		 * Handle mouse down for double-click detection
		 * @param {MouseEvent} e
		 */
		function handleMouseDown(e) {
			dragState.clickCount++;

			if (dragState.clickCount === 1) {
				dragState.clickTimer = setTimeout(() => {
					dragState.clickCount = 0;
				}, 300);
			} else if (dragState.clickCount === 2) {
				clearTimeout(dragState.clickTimer);
				dragState.clickCount = 0;
				startDrag(e);
			}
		}

		/**
		 * Start drag operation
		 * @param {MouseEvent} e
		 */
		function startDrag(e) {
			dragState.isDragging = true;
			e.preventDefault();

			// Close any open dropdowns when starting drag
			activeDropdown = null;

			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}

		/**
		 * Handle mouse move during drag
		 * @param {MouseEvent} e
		 */
		function handleMouseMove(e) {
			if (!dragState.isDragging) return;

			const newPosition = calculateSnapZone(e.clientX, e.clientY);
			if (onPositionChange) {
				onPositionChange(newPosition);
			}
		}

		/**
		 * Handle mouse up to end drag
		 * @param {MouseEvent} e
		 */
		function handleMouseUp(e) {
			if (!dragState.isDragging) return;

			dragState.isDragging = false;

			const finalPosition = calculateSnapZone(e.clientX, e.clientY);
			if (onPositionChange) {
				onPositionChange(finalPosition);
			}

			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}

		// Add event listener directly
		node.addEventListener('mousedown', handleMouseDown);

		// Return cleanup function
		return {
			destroy() {
				node.removeEventListener('mousedown', handleMouseDown);
				if (dragState.clickTimer) {
					clearTimeout(dragState.clickTimer);
				}
				// Clean up document listeners if still active
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			}
		};
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
	class="dock dock--{position}" 
	onclick={closeDropdown}
	use:draggableAction={{ 
		onPositionChange: (newPos) => position = newPos,
		currentPosition: position 
	}}
>
	{#each items as item (item.id)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div 
			class="dock-item-container"
			onmouseenter={() => handleMouseEnter(item.id)}
			onmouseleave={() => handleMouseLeave(item.id)}
		>
			<button
				class="dock-item"
				class:dock-item--active={activeDropdown === item.id}
				onclick={(e) => {
					e.stopPropagation();
					toggleDropdown(item.id);
				}}
				title={item.label}
			>
				{#if item.icon}
					{#if item.icon.startsWith('<svg')}
						<span class="dock-item__icon dock-item__icon--svg">{@html item.icon}</span>
					{:else if item.icon.endsWith('.svg')}
						<img src={item.icon} alt="" class="dock-item__icon dock-item__icon--img" width="16" height="16" />
					{:else}
						<span class="dock-item__icon">{item.icon}</span>
					{/if}
				{/if}
				{#if !['zoom', 'new-pane', 'world-map', 'settings'].includes(item.id)}
					<span class="dock-item__label">{item.label}</span>
				{/if}
			</button>

			{#if activeDropdown === item.id}
				{#if item.hasSlider}
					<div class="slider-container slider-container--{position}">
						<Slider 
							bind:value={zoomLevel}
							min={0.1}
							max={3}
							step={0.1}
							orientation={sliderOrientation()}
							label="Zoom Level"
							--track-thickness="var(--slider-track-thickness)"
							--thumb-size="var(--slider-thumb-size)"
						/>
						<div class="zoom-display">{Math.round(zoomLevel * 100)}%</div>
					</div>
				{:else}
					<div class="dropdown dropdown--{position}">
						{#each item.dropdown as dropdownItem (dropdownItem.id)}
							<button
								class="dropdown-item"
								onclick={(e) => {
									e.stopPropagation();
									handleDropdownClick(dropdownItem.id, dropdownItem.label);
								}}
								title={dropdownItem.label}
							>
								{#if dropdownItem.icon.startsWith('<svg')}
									<span class="dropdown-item__icon dropdown-item__icon--svg">{@html dropdownItem.icon}</span>
								{:else if dropdownItem.icon.endsWith('.svg')}
									<img src={dropdownItem.icon} alt="" class="dropdown-item__icon dropdown-item__icon--img" width="16" height="16" />
								{:else}
									<span class="dropdown-item__icon">{dropdownItem.icon}</span>
								{/if}
								<span class="dropdown-item__label">{dropdownItem.label}</span>
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	{/each}
</div>

<style>
	/* CSS Custom Properties for consistent sizing */
	.dock {
		--dock-icon-size: 1rem;
		--dock-padding-block: 0.3rem;
		--dock-padding-inline: 0.3rem;
		--dock-border-radius: 10rem;
		--dock-gap: 0.375rem;
		--dropdown-min-width: 11.25rem; /* 180px */
		--dropdown-max-width: 18.75rem; /* 300px */
		--slider-track-thickness: 0.25rem;
		--slider-thumb-size: 1rem;
	}

	.dock {
		display: flex;
		gap: var(--dock-gap);
		padding: var(--dock-padding-inline);
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: var(--dock-border-radius);
		border: 1px solid rgba(255, 255, 255, 0.2);
		opacity: 0.3;
		transition: opacity 0.3s ease;
	}

	.dock:hover {
		opacity: 1;
	}

	.dock--bottom,
	.dock--top {
		flex-direction: row;
	}

	.dock--left,
	.dock--right {
		flex-direction: column;
	}

	.dock-item-container {
		position: relative;
	}

	.dock-item {
		display: flex;
		align-items: center;
		gap: var(--dock-gap);
		padding: var(--dock-padding-block) var(--dock-padding-inline);
		border-radius: var(--dock-border-radius);
		color: white;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.875rem; /* 14px */
		min-width: max-content; /* Dynamic: size based on content */
	}

	.dock-item:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.dock-item:active,
	.dock-item--active {
		transform: translateY(0);
		background: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.4);
	}

	/* Dropdown Styles */
	.dropdown {
		position: absolute;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(15px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: var(--dock-border-radius);
		padding: var(--dock-gap);
		/* Dynamic: responsive width with min/max constraints */
		width: clamp(var(--dropdown-min-width), max-content, var(--dropdown-max-width));
		z-index: 1000;
		opacity: 0;
		animation: dropdownFadeIn 0.2s ease forwards;
	}

	@keyframes dropdownFadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Dropdown positioning based on dock position */
	.dropdown--bottom {
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%) scale(0.95);
		margin-bottom: 8px;
		animation: dropdownFadeInBottom 0.2s ease forwards;
	}

	.dropdown--top {
		top: 100%;
		left: 50%;
		transform: translateX(-50%) scale(0.95);
		margin-top: 8px;
		animation: dropdownFadeInTop 0.2s ease forwards;
	}

	.dropdown--left {
		left: 100%;
		top: 50%;
		transform: translateY(-50%) scale(0.95);
		margin-left: 8px;
		animation: dropdownFadeInLeft 0.2s ease forwards;
	}

	.dropdown--right {
		right: 100%;
		top: 50%;
		transform: translateY(-50%) scale(0.95);
		margin-right: 8px;
		animation: dropdownFadeInRight 0.2s ease forwards;
	}

	@keyframes dropdownFadeInBottom {
		from {
			opacity: 0;
			transform: translateX(-50%) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) scale(1);
		}
	}

	@keyframes dropdownFadeInTop {
		from {
			opacity: 0;
			transform: translateX(-50%) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) scale(1);
		}
	}

	@keyframes dropdownFadeInLeft {
		from {
			opacity: 0;
			transform: translateY(-50%) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(-50%) scale(1);
		}
	}

	@keyframes dropdownFadeInRight {
		from {
			opacity: 0;
			transform: translateY(-50%) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(-50%) scale(1);
		}
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 12px;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: white;
		cursor: pointer;
		transition: background-color 0.15s ease;
		font-size: 13px;
		text-align: left;
	}

	.dropdown-item:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.dropdown-item__icon {
		font-size: 14px;
		flex-shrink: 0;
		width: 16px;
		text-align: center;
	}

	.dropdown-item__icon--svg {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: white; /* This sets the stroke color via currentColor */
	}

	.dropdown-item__icon--img {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		filter: invert(1); /* Make SVG icons white to match the theme */
	}

	.dropdown-item__label {
		white-space: nowrap;
	}

	.dock-item__icon {
		font-size: 16px;
		flex-shrink: 0;
	}

	.dock-item__icon--svg {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: white; /* This sets the stroke color via currentColor */
	}

	.dock-item__icon--img {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		filter: invert(1); /* Make SVG icons white to match the theme */
	}

	.dock-item__label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Slider container styles */
	.slider-container {
		position: absolute;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(15px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 30px;
		padding: 0.25rem;
		z-index: 1000;
		opacity: 0;
		animation: dropdownFadeIn 0.2s ease forwards;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	/* Slider container positioning based on dock position */
	.slider-container--bottom {
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-bottom: var(--dock-gap);
		flex-direction: column;
		/* Dynamic: inherit width from parent button, with minimum for usability */
		width: 100%;
		min-width: 2.5rem;
	}

	.slider-container--top {
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-top: var(--dock-gap);
		flex-direction: column;
		/* Dynamic: inherit width from parent button, with minimum for usability */
		width: 100%;
		min-width: 2.5rem;
	}

	.slider-container--left {
		left: 100%;
		top: 50%;
		transform: translateY(-50%);
		margin-left: var(--dock-gap);
		flex-direction: row;
		/* Container width: 5rem slider + space for percentage display */
		width: max-content;
	}

	.slider-container--right {
		right: 100%;
		top: 50%;
		transform: translateY(-50%);
		margin-right: var(--dock-gap);
		flex-direction: row;
		/* Container width: 5rem slider + space for percentage display */
		width: max-content;
	}

	.zoom-display {
		color: white;
		font-size: 12px;
		font-weight: 500;
		text-align: center;
		min-width: 40px;
		white-space: nowrap;
	}

	/* Responsive behavior */
	@media (max-width: 768px) {
		.dock-item__label {
			display: none;
		}
		
		.dock-item {
			/* Ensure minimum touch target size on mobile */
			min-width: 2.5rem; /* 40px */
			justify-content: center;
		}
	}
</style>