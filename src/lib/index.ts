// place files you want to import through the `$lib` alias in this folder.

// Export pane layout utilities
export {
	calculatePanePositions,
	calculateMaxRectsLayout,
	fitMaxAmountEvenly,
	canPanesFit,
	type PaneLayoutOptions,
	type PanePosition,
	type LayoutResult
} from './framework/paneLayout.js';

// Export cluster management utilities
export {
    clusterManager
} from './framework/clusterManager.svelte.js';
