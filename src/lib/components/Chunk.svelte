<script lang="ts">
	import { getContext, onDestroy } from 'svelte';
	import Pane from "$lib/components/Pane.svelte";

	let appState: AppState = getContext('appstate');
	let  { coords, uuid } = $props();
	let xOffset = $derived(coords[0] * appState.chunkDimensions[0].current + appState.globalOffset[0].current);
	let yOffset = $derived(coords[1] * appState.chunkDimensions[1].current * -1 + appState.globalOffset[1].current);
	let dist = $derived([Math.abs(coords[0] - appState.viewportPos[0]), Math.abs(coords[1] - appState.viewportPos[1])]);
	let left = $state(0);
	let top = $state(0);

	// panes owned by this Chunk. Export API so programmatic mounters can add panes
	let panes: PaneData[] = $state([]);

	export function addPane(data: PaneData) {
		panes = [...panes, data];
	}

	export function removePane(uuidToRemove: string) {
		panes = panes.filter(p => p.uuid !== uuidToRemove);
	}

	function fitMaxAmountEvenly(totalSize: number, minimumSize: number): number {
		let canFit = totalSize / minimumSize;
		let maxAmount = Math.floor(canFit);
		let evenAmount = totalSize / maxAmount;
		return evenAmount;
	}

    function onmouseenter(event: Event) {
        appState.activeChunk = uuid;
    };
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	style="
	left: {left + xOffset}px;
	top: {top + yOffset}px;
	width: {appState.chunkDimensions[0].current}px;
	height: {appState.chunkDimensions[1].current}px;
	background-size: 5.1vmin 5.2vmin;
	background-image: radial-gradient(rgba(0, 0, 0, 0.07) 9%, transparent 9%);
	background-position: 25% 25%;
	"
	class="
	chunk-{uuid} 
	absolute 
	bg-gray-50 flex justify-center items-center text-center w-full h-full"
	role="application"
    {onmouseenter}
>
	<div class="block">
		<!--<p>
			{coords}
		</p>-->
		{#each panes as p (p.uuid)}
			<Pane data={p} />
		{/each}
	</div>
</div>