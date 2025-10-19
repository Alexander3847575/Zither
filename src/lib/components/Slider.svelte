<!--
@component
A customizable slider component that adapts its orientation based on props.
Supports both horizontal and vertical orientations with proper accessibility.

Features:
- Reactive value binding with $bindable
- Configurable min, max, and step values
- Automatic orientation (horizontal/vertical)
- Keyboard navigation support
- Custom styling with CSS custom properties

Usage:
  ```html
  <Slider 
    bind:value={zoomLevel} 
    min={0.1} 
    max={3} 
    step={0.1} 
    orientation="horizontal"
    label="Zoom Level"
  />
  ```
-->
<script>
	/**
	 * @typedef {'horizontal' | 'vertical'} Orientation
	 */

	/** @type {{ value?: number, min?: number, max?: number, step?: number, orientation?: Orientation, label?: string, disabled?: boolean }} */
	let { 
		value = $bindable(1), 
		min = 0, 
		max = 100, 
		step = 1, 
		orientation = 'horizontal',
		label = 'Slider',
		disabled = false 
	} = $props();

	let sliderElement = $state(null);
	let isDragging = $state(false);

	// Ensure value is within bounds
	$effect(() => {
		if (value < min) value = min;
		if (value > max) value = max;
	});

	/**
	 * Calculate percentage for positioning the thumb
	 */
	const percentage = $derived(() => {
		return ((value - min) / (max - min)) * 100;
	});

	/**
	 * Handle mouse/touch events for dragging
	 * @param {MouseEvent | TouchEvent} event
	 */
	function handlePointerDown(event) {
		if (disabled) return;
		
		event.preventDefault();
		isDragging = true;
		
		// Handle both mouse and touch events
		const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
		
		updateValueFromPosition(clientX, clientY);
		
		// Add global event listeners
		const handleMove = (e) => {
			if (!isDragging) return;
			const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
			const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
			updateValueFromPosition(x, y);
		};
		
		const handleEnd = () => {
			isDragging = false;
			document.removeEventListener('mousemove', handleMove);
			document.removeEventListener('mouseup', handleEnd);
			document.removeEventListener('touchmove', handleMove);
			document.removeEventListener('touchend', handleEnd);
		};
		
		document.addEventListener('mousemove', handleMove);
		document.addEventListener('mouseup', handleEnd);
		document.addEventListener('touchmove', handleMove);
		document.addEventListener('touchend', handleEnd);
	}

	/**
	 * Update value based on mouse/touch position
	 * @param {number} clientX
	 * @param {number} clientY
	 */
	function updateValueFromPosition(clientX, clientY) {
		if (!sliderElement) return;
		
		const rect = sliderElement.getBoundingClientRect();
		let ratio;
		
		if (orientation === 'horizontal') {
			ratio = (clientX - rect.left) / rect.width;
		} else {
			// For vertical, we want top to be max value, bottom to be min
			ratio = 1 - (clientY - rect.top) / rect.height;
		}
		
		// Clamp ratio between 0 and 1
		ratio = Math.max(0, Math.min(1, ratio));
		
		// Calculate new value
		const newValue = min + ratio * (max - min);
		
		// Round to nearest step
		const steppedValue = Math.round(newValue / step) * step;
		
		// Ensure within bounds and update
		value = Math.max(min, Math.min(max, steppedValue));
	}

	/**
	 * Handle keyboard navigation
	 * @param {KeyboardEvent} event
	 */
	function handleKeyDown(event) {
		if (disabled) return;
		
		let newValue = value;
		const largeStep = (max - min) / 10;
		
		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowDown':
				event.preventDefault();
				newValue = value - step;
				break;
			case 'ArrowRight':
			case 'ArrowUp':
				event.preventDefault();
				newValue = value + step;
				break;
			case 'PageDown':
				event.preventDefault();
				newValue = value - largeStep;
				break;
			case 'PageUp':
				event.preventDefault();
				newValue = value + largeStep;
				break;
			case 'Home':
				event.preventDefault();
				newValue = min;
				break;
			case 'End':
				event.preventDefault();
				newValue = max;
				break;
			default:
				return;
		}
		
		value = Math.max(min, Math.min(max, newValue));
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
	class="slider-container slider-container--{orientation}"
	class:slider-container--disabled={disabled}
>
	<div 
		bind:this={sliderElement}
		class="slider"
		class:slider--dragging={isDragging}
		onmousedown={handlePointerDown}
		ontouchstart={handlePointerDown}
		onkeydown={handleKeyDown}
		role="slider"
		tabindex={disabled ? -1 : 0}
		aria-label={label}
		aria-valuemin={min}
		aria-valuemax={max}
		aria-valuenow={value}
		aria-orientation={orientation}
		aria-disabled={disabled}
		style:--percentage="{percentage()}%"
	>
		<div class="slider__track"></div>
		<div class="slider__fill"></div>
		<div class="slider__thumb"></div>
	</div>
</div>

<style>
	.slider-container {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
	}

	.slider-container--horizontal {
		/* Dynamic: responsive width with fallback - matches vertical slider length */
		width: var(--slider-width, 5rem); /* 80px - same as vertical slider height */
		height: var(--slider-height, 1.25rem);
	}

	.slider-container--vertical {
		/* Dynamic: inherit from parent with fallback */
		width: var(--slider-width, 100%);
		height: var(--slider-height, 5rem); /* 80px - about 2/3 of original 120px */
	}

	.slider-container--disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.slider {
		position: relative;
		cursor: pointer;
		outline: none;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.slider:focus-visible {
		outline: 2px solid rgba(255, 255, 255, 0.8);
		outline-offset: 2px;
		border-radius: 4px;
	}

	.slider--dragging {
		cursor: grabbing;
	}

	.slider__track {
		position: absolute;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
		transition: background-color 0.2s ease;
	}

	.slider-container--horizontal .slider__track {
		width: 100%;
		height: var(--track-thickness, 0.25rem); /* 4px */
	}

	.slider-container--vertical .slider__track {
		width: var(--track-thickness, 0.25rem); /* 4px */
		height: 100%;
	}

	.slider__fill {
		position: absolute;
		background: rgba(255, 255, 255, 0.6);
		border-radius: 2px;
		transition: background-color 0.2s ease;
	}

	.slider-container--horizontal .slider__fill {
		height: var(--track-thickness, 0.25rem); /* 4px */
		width: var(--percentage);
		left: 0;
	}

	.slider-container--vertical .slider__fill {
		width: var(--track-thickness, 0.25rem); /* 4px */
		height: var(--percentage);
		bottom: 0;
	}

	.slider__thumb {
		position: absolute;
		width: var(--thumb-size, 1rem); /* 16px */
		height: var(--thumb-size, 1rem); /* 16px */
		background: white;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		cursor: grab;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.slider-container--horizontal .slider__thumb {
		left: calc(var(--percentage) - var(--thumb-size, 1rem) / 2);
		transform: translateY(0);
	}

	.slider-container--vertical .slider__thumb {
		bottom: calc(var(--percentage) - var(--thumb-size, 1rem) / 2);
		transform: translateX(0);
	}

	.slider:hover .slider__thumb,
	.slider:focus .slider__thumb {
		background: rgba(255, 255, 255, 0.9);
		border-color: rgba(255, 255, 255, 0.6);
		transform: scale(1.1);
	}

	.slider--dragging .slider__thumb {
		cursor: grabbing;
		transform: scale(1.2);
		background: white;
		border-color: rgba(255, 255, 255, 0.8);
	}

	.slider:hover .slider__track {
		background: rgba(255, 255, 255, 0.3);
	}

	.slider:hover .slider__fill {
		background: rgba(255, 255, 255, 0.8);
	}

	/* Ensure proper positioning for vertical slider */
	.slider-container--vertical .slider {
		flex-direction: column;
	}
</style>
