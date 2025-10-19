<script lang="ts">
    import { getContext, onMount } from "svelte";
    import { cubicIn, elasticOut, quartOut } from "svelte/easing";
    import { Tween } from "svelte/motion";
    import { ChunkManager } from "$lib/framework/chunkManager";

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
    let chunkManager: ChunkManager = getContext("chunkManager");


    let unscaledWidth = $derived(paneData.paneSize[0] * appState.unitToPixelRatio.current);
    let unscaledHeight = $derived(paneData.paneSize[1] * appState.unitToPixelRatio.current);
    let xOffset = $derived(paneData.paneCoords[0] * appState.unitToPixelRatio.current);  
    let yOffset = $derived(paneData.paneCoords[1] * appState.unitToPixelRatio.current);  
    let active = $state(false);
    let dragging = $state(false);
    let shouldCancelPointerEvents = $derived((appState.state == "MovingPane") ? "pointer-events-none" : "");
    let resizing = $state(0);
    let mouseDelta = [0, 0];
    let persistenceTimeout: NodeJS.Timeout | null = null;
    let isSelected = $derived(appState.isSelected(paneData.uuid));

    let scale = new Tween(1, {
        easing: quartOut,
        duration: 200,
    });
    let width = $derived(scale.current * unscaledWidth);
    let height = $derived(scale.current * unscaledHeight);

    let borderColor = $derived(rgbaToHex(...paneData.color));
    function rgbaToHex(r: number, g: number, b: number, a: number) {
        const toHex = (value: number) => value.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // Create solid border color with no gradient
    let solidBorderStyle = $derived(`5px solid ${borderColor}`);

    // Debug logging for color changes
    $effect(() => {
        console.log(`🎨 Pane ${paneData.uuid} color changed:`, {
            color: paneData.color,
            borderColor: borderColor,
            isSelected: isSelected
        });
    });

    // Keep pane UI in sync with storage/cluster updates
    onMount(() => {
        function handleClusterChanged(e: Event) {
            const detail = (e as CustomEvent).detail as any;
            const paneIds: string[] | undefined = detail?.cluster?.paneIds;
            if (paneIds && paneIds.includes(paneData.uuid)) {
                // If this pane is affected, refresh its color from authoritative source if available
                // For now, trust that storage already has the updated color and just trigger a reactive update
                paneData = { ...paneData } as PaneData;
            }
        }

        function handleStorageChanged(e: Event) {
            const detail = (e as CustomEvent).detail as any;
            const chunk = detail?.chunkData as { panes?: PaneData[] } | undefined;
            if (chunk?.panes) {
                const updated = chunk.panes.find(p => p.uuid === paneData.uuid);
                if (updated && updated.color && updated.color !== paneData.color) {
                    paneData.color = updated.color as [number, number, number, number];
                    // Reassign to ensure reactivity
                    paneData = { ...paneData } as PaneData;
                }
            }
        }

        window.addEventListener('cluster-changed', handleClusterChanged as EventListener);
        window.addEventListener('storage-changed', handleStorageChanged as EventListener);

        return () => {
            window.removeEventListener('cluster-changed', handleClusterChanged as EventListener);
            window.removeEventListener('storage-changed', handleStorageChanged as EventListener);
        };
    });


    function onmouseenter() {
        active = true;
        scale.set(1.02);
    }
    function onmouseleave() {
        active = false;
        dragging = false;
        scale.set(1);
    }
    
    function onmousedown(event: MouseEvent) {
        if (!active) {
            return;
        }
        
        // Handle shift-click selection
        if (event.shiftKey) {
            appState.toggleSelection(paneData.uuid);
            event.stopPropagation();
            return;
        }
        
        let resizeMargin = 10;
        if (event.x > xOffset + width - resizeMargin) {
            console.log("right")
            // resize right
            resizing = 2;
            return;
        } else if (event.x < xOffset + resizeMargin) {
            console.log("left")
            //resizing left
            resizing = 4;
            return;
        } else if (event.y < yOffset + resizeMargin) {
            console.log("top")
            // resize top
            resizing = 1;
            return;
        } else if (event.y > height + yOffset - resizeMargin) {
            console.log("bottom")
            resizing = 3
            return;
        }

        if (appState.state != "MovingPane") {
            return;
        }

        scale.set(1.1);
        dragging = true;
        event.stopPropagation();
    }

    function triggerPersistence() {
        // Clear any existing timeout
        if (persistenceTimeout) {
            clearTimeout(persistenceTimeout);
        }
        
        // Debounce persistence to avoid too many storage writes
        persistenceTimeout = setTimeout(() => {
            try {
                // Update the pane data in the chunk manager's tracking
                const chunkHolder = chunkManager.loadedChunks.get(paneData.chunkCoords[0])?.get(paneData.chunkCoords[1]);
                if (chunkHolder) {
                    chunkHolder.paneData.set(paneData.uuid, paneData);
                    // Trigger persistence to storage
                    chunkManager.persistChunkToStorage(paneData.chunkCoords, chunkHolder);
                }
            } catch (error) {
                console.warn('Failed to persist pane changes:', error);
            }
        }, 100); // 100ms debounce
    }

    function onmouseup() {
        dragging = false;
        resizing = 0;
        scale.set(1.02);
        
        // Trigger persistence when dragging/resizing ends
        triggerPersistence();
    }
    function onmousemove(event: MouseEvent) {
        if (dragging) {
            xOffset += event.movementX;
            yOffset += event.movementY;
            
            // Update the underlying paneData coordinates
            paneData.paneCoords[0] = xOffset / appState.unitToPixelRatio.current;
            paneData.paneCoords[1] = yOffset / appState.unitToPixelRatio.current;
            return;
        }

        switch (resizing) {
            case 1:
                yOffset += event.movementY;
                unscaledHeight += event.movementY;
                paneData.paneCoords[1] = yOffset / appState.unitToPixelRatio.current;
                paneData.paneSize[1] = height / appState.unitToPixelRatio.current;
                break;
            case 2: 
                //xOffset += event.movementX;
                unscaledWidth += event.movementX;
                paneData.paneSize[0] = width / appState.unitToPixelRatio.current;
                break;
            case 3: 
                //yOffset += event.movementY;
                unscaledHeight += event.movementY;
                paneData.paneSize[1] = height / appState.unitToPixelRatio.current;

                break;
            case 4: 
                xOffset += event.movementX;
                unscaledWidth -= event.movementX;
                paneData.paneCoords[0] = xOffset / appState.unitToPixelRatio.current;
                paneData.paneSize[0] = width / appState.unitToPixelRatio.current;
                break;
        }
    }


    // PDF preview state (use $state so Svelte reactivity updates the template)
	let pdfUrl = $state<string | null>(null);
    let imgUrl =  $state<string | null>(null);
	let _prevUrl: string | null = null;
    function onFileChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input?.files?.[0];
        if (!file) {
            return;
        }
        console.log("Opening " + file.type);
        if (_prevUrl) {
            URL.revokeObjectURL(_prevUrl);
        }
        if (file.type === 'application/pdf') {
            const url = URL.createObjectURL(file);
            pdfUrl = url;
            _prevUrl = url;
        } else if (file.type.startsWith('image/')) {
            imgUrl = URL.createObjectURL(file);
        } else {
            pdfUrl = null;
            _prevUrl = null;
        }
    }

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    style="
	left: {xOffset - (width - unscaledWidth) / 2}px;
	top: {yOffset - (height - unscaledHeight) / 2}px;
	width: {width}px;
	height: {height}px;
    box-sizing: border-box;
    -moz-box-sizing: border-box;
    -webkit-box-sizing: border-box;
    border: {solidBorderStyle};
    border-radius: 25px;
    overflow: hidden;
    z-index: 10;
    background: #64748b;
    background-image: none;
	"
    class="
    pane-{paneData.uuid}
    absolute
    {isSelected ? 'ring-4 ring-blue-500 ring-opacity-75' : ''}
    "
    {onmouseenter}
    {onmouseleave}
    {onmousedown}
    {onmouseup}
    {onmousemove}
>
    <div class="        
        flex justify-center items-center text-center w-full h-full text-slate-50">
        <!-- PDF preview (renders when a PDF is selected) -->
        {#if pdfUrl}
            <div style="
            width: {width}px;
            height: {height}px;
            "
            class="border border-gray-300 absolute
            ">
                <object title="PDF preview" data={pdfUrl + "#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0"} type="application/pdf" width="100%" height="100%">
                    <p>PDF preview not available.</p>
                </object>
            </div>
        {:else if imgUrl}
            <img src="{imgUrl}" alt="" style="
            user-drag: none;
            user-select: none;"/>
        {:else}
            <!-- PDF upload input -->
            <label for="pdf-input-{paneData.uuid}" class="text-sm block">
                <svg xmlns="http://www.w3.org/2000/svg" width="{width/2}" height="{width/2}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-file"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /></svg>
            </label>
            <input 
            id="pdf-input-{paneData.uuid}"
            type="file"
            accept="*"
            onchange={onFileChange}
            class="mt-1 hidden" />
        {/if}
    </div>
</div>
