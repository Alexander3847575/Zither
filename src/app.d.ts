// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
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
		effectiveDelta: [number, number], // 
		directionData: string,
	}
}

export {};
