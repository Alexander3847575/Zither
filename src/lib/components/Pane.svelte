<script lang="ts">
    import { getContext, onMount } from "svelte";

    const PaneState = {
		Default: "Default",
		MovingPane: "MovingPane",
		ResizingPane: "ResizingPane",
		Maximized: "Maximized",
	} as const;

    let { data } = $props();
    let paneData: PaneData = $state(data);
    let paneState: PaneStateKey = $state(PaneState.Default);
    let appState: AppState = getContext("appstate");


    let width = $derived(paneData.paneSize[0] * appState.unitToPixelRatio.current);
    let height = $derived(paneData.paneSize[1] * appState.unitToPixelRatio.current);
    let xOffset = $derived(paneData.paneCoords[0] * appState.unitToPixelRatio.current);  
    let yOffset = $derived(paneData.paneCoords[1] * appState.unitToPixelRatio.current);  
    let active = $state(false);

    let mouseDelta = [0, 0];

    function onmouseenter() {
        active = true;
    }
    function onmouseleave() {
        active = false;
    }

    // PDF preview state (use $state so Svelte reactivity updates the template)
	let pdfUrl = $state<string | null>(null);
	let _prevUrl: string | null = null;
    function onFileChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input?.files?.[0];
        if (file && file.type === 'application/pdf') {
            if (_prevUrl) {
                URL.revokeObjectURL(_prevUrl);
            }
            const url = URL.createObjectURL(file);
            pdfUrl = url;
            _prevUrl = url;
        } else {
            if (_prevUrl) {
                URL.revokeObjectURL(_prevUrl);
            }
            pdfUrl = null;
            _prevUrl = null;
        }
    }

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    style="
	left: {xOffset}px;
	top: {yOffset}px;
	width: {width}px;
	height: {height}px;
    border-radius: 25px;
    overflow: hidden;
	"
    class="
    pane-{paneData.uuid}
    absolute
    bg-slate-500
    "
    {onmouseenter}
    {onmouseleave}
>
    
    <!-- PDF preview (renders when a PDF is selected) -->
    {#if !pdfUrl}
        <!-- PDF upload input -->
        <div class="mt-2">
            <label for="pdf-input-{paneData.uuid}" class="text-sm block">Upload PDF:</label>
            <input id="pdf-input-{paneData.uuid}" type="file" accept="application/pdf" onchange={onFileChange} class="mt-1" />
        </div>
    {:else}
        <div class=" w-full h-full border border-gray-300">
            <object title="PDF preview" data={pdfUrl + "#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0"} type="application/pdf" width="100%" height="100%">
                <p>PDF preview not available.</p>
            </object>
        </div>
    {/if}

</div>