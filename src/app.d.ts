// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SvelteSet } from 'svelte/reactivity';
import type { Tween } from 'svelte/motion';

declare global {
	interface Window
    {
        api: any;
		viewApi: any;
    }
	// interface Error {}
	// interface Locals {}
	// interface PageData {}
	// interface PageState {}
	// interface Platform {}
	export const AppStates = {
		Default: 'Default',
		InteractPane: 'InteractPane',
		InteractMenu: 'InteractMenu',
		MovingPane: 'MovingPane',
		MovingSpace: 'MovingSpace'
	} as const;

	export type AppStateKey = keyof typeof AppStates;

	export interface AppState {
		state: AppStateKey, // Of AppStates
		viewportPos: [number, number],
		unitToPixelRatio: Tween<number>,
		chunkSize: [number, number],
		chunkDimensions: [Tween<number>, Tween<number>],
		globalOffset: [Tween<number>, Tween<number>],
		mousePos: [number, number],
		mouseDelta: [number, number],
		effectiveDelta: [number, number], // 
		directionData: string,
		activeChunk: string,
		activePane: string,
		selectedPanes: SvelteSet<string>, // UUIDs of selected panes
		selectionMode: boolean, // Whether we're in selection mode
		// Selection methods
		selectPane: (uuid: string) => void;
		deselectPane: (uuid: string) => void;
		toggleSelection: (uuid: string) => void;
		clearSelection: () => void;
		isSelected: (uuid: string) => boolean;
		getSelectedPanes: () => string[];
		getSelectionCount: () => number;
	}

	export interface PaneData {
		uuid: string,
		paneType: string,
		data: Object,
		chunkCoords: [number, number],
		paneCoords: [number, number],
		paneSize: [number, number],
		semanticTags: string,
		color: [number, number, number, number],
		isSelected?: boolean, // Optional selection state for persistence
	}

	export interface ChunkData {
		coords: [number, number],      // Chunk coordinates in the grid
		uuid: string,                  // Unique identifier  
		panes: PaneData[],            // Panes contained in this chunk
		dimensions?: [number, number], // Optional: Width/height in pixels
		isLoaded?: boolean,           // Optional: Loading state
		lastAccessed?: Date,          // Optional: For caching/cleanup
	}

	export interface Cluster {
		id: string,                    // Unique identifier for the cluster
		label: string,                 // Human-readable label for the cluster
		paneIds: string[],            // Array of pane UUIDs belonging to this cluster
		color?: [number, number, number, number], // Optional: RGBA color for visual representation
		createdAt?: Date,             // Optional: When the cluster was created
		updatedAt?: Date,             // Optional: When the cluster was last updated
	}
	
	export const PaneState = {
		Default: "Default",
		MovingPane: "MovingPane",
		ResizingPane: "ResizingPane",
		Maximized: "Maximized",
	} as const;

	export type PaneStateKey = keyof typeof PaneState;
}

export {};
