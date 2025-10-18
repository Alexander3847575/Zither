<script lang="ts">
    import { getContext, onMount } from "svelte";

    let { data } = $props();
    let paneData: PaneData = data;
    let appState: AppState = getContext("appstate");

    let unitToPixelRatio = 120;
    let width = $derived(paneData.paneSize[0] * unitToPixelRatio);
    let height = $derived(paneData.paneSize[1] * unitToPixelRatio);
    let xOffset = $derived(paneData.paneCoords[0] * unitToPixelRatio);  
    let yOffset = $derived(paneData.paneCoords[1] * unitToPixelRatio);  
</script>

<div
    style="
	left: {xOffset}px;
	top: {yOffset}px;
	width: {width}px;
	height: {height}px;
	"
    class="
    pane-{paneData.uuid}
    absolute
    bg-slate-500
    "
>
    
</div>