/**
 * Pane Layout System
 * 
 * This module provides algorithms for positioning panes within chunks.
 * It takes pane UUIDs and chunk dimensions as input and outputs optimal
 * positions for each pane within the chunk coordinate system.
 */

export interface PaneLayoutOptions {
	/** Minimum size for panes [width, height] */
	minPaneSize?: [number, number];
	/** Padding between panes */
	padding?: number;
	/** Margin from chunk edges */
	margin?: number;
	/** Preferred aspect ratio for panes */
	preferredAspectRatio?: number;
}

export interface PanePosition {
	/** UUID of the pane */
	uuid: string;
	/** Position within chunk [x, y] */
	position: [number, number];
	/** Size of the pane [width, height] */
	size: [number, number];
}

export interface LayoutResult {
	/** Array of positioned panes */
	positions: PanePosition[];
	/** Whether all panes fit comfortably */
	fitsWell: boolean;
	/** Utilization ratio of chunk space (0-1) */
	utilization: number;
}




/**
 * Implements the MaxRects algorithm for rectangle packing.
 * This algorithm is more efficient than Bottom-Left and often produces better results.
 * Based on research from: https://eatplayhate.me/2013/09/17/adventures-in-engine-construction-rectangle-packing/
 * 
 * @param paneUuids Array of pane UUIDs to position
 * @param chunkDimensions [width, height] of the chunk in pixels
 * @param paneDataMap Map of UUID to PaneData for size constraints
 * @param options Layout configuration options
 * @returns Layout result with positioned panes
 */
export function calculateMaxRectsLayout(
	paneUuids: string[],
	chunkDimensions: [number, number],
	paneDataMap: Map<string, PaneData> | PaneData[],
	options: PaneLayoutOptions = {}
): LayoutResult {
	const {
		minPaneSize = [100, 80],
		padding = 8,
		margin = 16
	} = options;

	if (paneUuids.length === 0) {
		return { positions: [], fitsWell: true, utilization: 0 };
	}

	// Convert array to map if needed
	const dataMap = Array.isArray(paneDataMap) 
		? new Map(paneDataMap.map(p => [p.uuid, p]))
		: paneDataMap;

	const [chunkWidth, chunkHeight] = chunkDimensions;
	
	// Initialize with one large free rectangle
	const freeRects: Array<{ x: number, y: number, width: number, height: number }> = [{
		x: margin,
		y: margin,
		width: chunkWidth - (2 * margin),
		height: chunkHeight - (2 * margin)
	}];

	// Prepare panes with sizes, sorted by area (descending) for MaxRects
	const panesWithSizes = paneUuids.map(uuid => {
		const paneData = dataMap.get(uuid);
		let width = minPaneSize[0];
		let height = minPaneSize[1];

		if (paneData?.paneSize) {
			const [specifiedWidth, specifiedHeight] = paneData.paneSize;
			if (specifiedWidth > 0 && specifiedHeight > 0) {
				width = specifiedWidth;
				height = specifiedHeight;
			}
		}

		return { uuid, width, height, area: width * height };
	}).sort((a, b) => b.area - a.area); // Sort by area descending

	const positions: PanePosition[] = [];
	let fitsWell = true;

	for (const pane of panesWithSizes) {
		const { uuid, width, height } = pane;
		// Note: We need space for the pane PLUS padding around it
		const requiredWidth = width + padding;
		const requiredHeight = height + padding;

		// Find the best free rectangle using Best Short Side Fit heuristic
		let bestRect = -1;
		let bestShortSide = Infinity;
		let bestLongSide = Infinity;

		for (let i = 0; i < freeRects.length; i++) {
			const rect = freeRects[i];
			
			// Check if the pane + padding fits in this free rectangle
			if (rect.width >= requiredWidth && rect.height >= requiredHeight) {
				const leftoverHoriz = rect.width - requiredWidth;
				const leftoverVert = rect.height - requiredHeight;
				const shortSide = Math.min(leftoverHoriz, leftoverVert);
				const longSide = Math.max(leftoverHoriz, leftoverVert);

				if (shortSide < bestShortSide || (shortSide === bestShortSide && longSide < bestLongSide)) {
					bestRect = i;
					bestShortSide = shortSide;
					bestLongSide = longSide;
				}
			}
		}

		if (bestRect === -1) {
			fitsWell = false;
			// Fallback: place at the top of the highest rectangle
			let fallbackX = margin;
			let fallbackY = margin;
			
			if (positions.length > 0) {
				const maxY = Math.max(...positions.map(p => p.position[1] + p.size[1]));
				fallbackY = maxY + padding;
			}

			positions.push({
				uuid,
				position: [fallbackX, fallbackY],
				size: [width, height]
			});
			continue;
		}

		// Place the pane in the best free rectangle
		const chosenRect = freeRects[bestRect];
		const newX = chosenRect.x;
		const newY = chosenRect.y;

		positions.push({
			uuid,
			position: [newX, newY],
			size: [width, height]
		});

		// CORRECT MaxRects Implementation: Clip the placed rectangle from ALL free rectangles
		const placedRect = {
			x: newX,
			y: newY,
			width: requiredWidth,  // width + padding
			height: requiredHeight // height + padding
		};

		// Clip the placed rectangle from all existing free rectangles
		const newFreeRects: typeof freeRects = [];
		
		for (const freeRect of freeRects) {
			// Check if the free rectangle overlaps with the placed rectangle
			if (!(freeRect.x >= placedRect.x + placedRect.width || 
				  freeRect.x + freeRect.width <= placedRect.x ||
				  freeRect.y >= placedRect.y + placedRect.height ||
				  freeRect.y + freeRect.height <= placedRect.y)) {
				
				// This free rectangle overlaps with the placed rectangle - clip it
				const clippedRects = clipRectangle(freeRect, placedRect);
				newFreeRects.push(...clippedRects);
			} else {
				// No overlap - keep the free rectangle as is
				newFreeRects.push(freeRect);
			}
		}

		// Replace the free rectangles list with the clipped ones
		freeRects.length = 0;
		freeRects.push(...newFreeRects);

		// Remove redundant rectangles (rectangles completely contained within others)
		removeRedundantRectangles(freeRects);
	}

	// Calculate utilization
	const totalPaneArea = positions.reduce((sum, p) => sum + (p.size[0] * p.size[1]), 0);
	const chunkArea = chunkWidth * chunkHeight;
	const utilization = totalPaneArea / chunkArea;

	return { positions, fitsWell, utilization };
}

/**
 * Clips a free rectangle by subtracting a placed rectangle from it.
 * Returns an array of up to 4 new free rectangles.
 */
function clipRectangle(
	freeRect: { x: number, y: number, width: number, height: number },
	placedRect: { x: number, y: number, width: number, height: number }
): Array<{ x: number, y: number, width: number, height: number }> {
	const clipped: Array<{ x: number, y: number, width: number, height: number }> = [];

	// Left side (if there's space to the left of the placed rectangle)
	if (freeRect.x < placedRect.x) {
		clipped.push({
			x: freeRect.x,
			y: freeRect.y,
			width: placedRect.x - freeRect.x,
			height: freeRect.height
		});
	}

	// Right side (if there's space to the right of the placed rectangle)
	if (freeRect.x + freeRect.width > placedRect.x + placedRect.width) {
		clipped.push({
			x: placedRect.x + placedRect.width,
			y: freeRect.y,
			width: (freeRect.x + freeRect.width) - (placedRect.x + placedRect.width),
			height: freeRect.height
		});
	}

	// Bottom side (if there's space below the placed rectangle)
	if (freeRect.y < placedRect.y) {
		clipped.push({
			x: freeRect.x,
			y: freeRect.y,
			width: freeRect.width,
			height: placedRect.y - freeRect.y
		});
	}

	// Top side (if there's space above the placed rectangle)
	if (freeRect.y + freeRect.height > placedRect.y + placedRect.height) {
		clipped.push({
			x: freeRect.x,
			y: placedRect.y + placedRect.height,
			width: freeRect.width,
			height: (freeRect.y + freeRect.height) - (placedRect.y + placedRect.height)
		});
	}

	// Filter out rectangles with zero or negative dimensions
	return clipped.filter(rect => rect.width > 0 && rect.height > 0);
}

/**
 * Removes redundant rectangles (rectangles completely contained within others).
 */
function removeRedundantRectangles(
	freeRects: Array<{ x: number, y: number, width: number, height: number }>
): void {
	for (let i = freeRects.length - 1; i >= 0; i--) {
		for (let j = freeRects.length - 1; j >= 0; j--) {
			if (i !== j) {
				const rect1 = freeRects[i];
				const rect2 = freeRects[j];
				
				// If rect1 is completely contained within rect2, remove rect1
				if (rect1.x >= rect2.x && 
					rect1.y >= rect2.y &&
					rect1.x + rect1.width <= rect2.x + rect2.width &&
					rect1.y + rect1.height <= rect2.y + rect2.height) {
					freeRects.splice(i, 1);
					break;
				}
			}
		}
	}
}

/**
 * Main function for pane positioning using the MaxRects algorithm.
 * This is the recommended entry point for pane layout.
 * 
 * @param paneUuids Array of pane UUIDs to position
 * @param chunkDimensions [width, height] of the chunk in pixels
 * @param paneDataMap Map of UUID to PaneData for size constraints
 * @param options Layout configuration options
 * @returns Layout result with positioned panes
 */
export function calculatePanePositions(
	paneUuids: string[],
	chunkDimensions: [number, number],
	paneDataMap: Map<string, PaneData> | PaneData[],
	options: PaneLayoutOptions = {}
): LayoutResult {
	return calculateMaxRectsLayout(paneUuids, chunkDimensions, paneDataMap, options);
}


/**
 * Utility function to fit the maximum number of items evenly within a given total size,
 * respecting a minimum size constraint.
 * 
 * @param totalSize Total available size
 * @param minimumSize Minimum size per item
 * @returns Size per item that maximizes count while respecting minimum
 */
export function fitMaxAmountEvenly(totalSize: number, minimumSize: number): number {
	const canFit = Math.floor(totalSize / minimumSize);
	if (canFit <= 0) return minimumSize;
	
	return totalSize / canFit;
}

/**
 * Checks if a set of panes can fit within chunk dimensions with given constraints.
 * 
 * @param paneCount Number of panes to fit
 * @param chunkDimensions [width, height] of the chunk
 * @param minPaneSize Minimum size per pane [width, height]
 * @param padding Padding between panes
 * @param margin Margin from chunk edges
 * @returns Whether panes can fit comfortably
 */
export function canPanesFit(
	paneCount: number,
	chunkDimensions: [number, number],
	minPaneSize: [number, number] = [100, 80],
	padding: number = 8,
	margin: number = 16
): boolean {
	if (paneCount === 0) return true;
	
	const [chunkWidth, chunkHeight] = chunkDimensions;
	const availableWidth = chunkWidth - (2 * margin);
	const availableHeight = chunkHeight - (2 * margin);
	
	// Try different grid configurations
	for (let cols = 1; cols <= paneCount; cols++) {
		const rows = Math.ceil(paneCount / cols);
		
		const requiredWidth = cols * minPaneSize[0] + (cols - 1) * padding;
		const requiredHeight = rows * minPaneSize[1] + (rows - 1) * padding;
		
		if (requiredWidth <= availableWidth && requiredHeight <= availableHeight) {
			return true;
		}
	}
	
	return false;
}
