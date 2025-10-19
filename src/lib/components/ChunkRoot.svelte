<script lang="ts">
    import { getContext } from "svelte";
    import type { ChunkManager } from "$lib/framework/chunkManager";

    // Get instances from parent context
    let appState: AppState = getContext('appstate');
    const chunkManager: ChunkManager = getContext('chunkManager');
    console.log("Retrieved chunk manager from context.");

    $effect(() => {
        chunkManager.renderChunks(appState.viewportPos, 10);
    });

    document.addEventListener("keydown", (event) => {
    const key = event.key; // Get the key pressed
    if (key === "n") {
        chunkManager.mountPane(appState.viewportPos, {
            uuid: crypto.randomUUID(),
            paneType: "pdf",
            data: {"src": ""},
            chunkCoords: appState.viewportPos,
            paneCoords: [1, 1],
            paneSize: [5, 3],
            semanticTags: "",
            color: [200, 200, 200, 120],
        });
    } else if (key === "d") {
        chunkManager.unmountPane(appState.activePane, appState.viewportPos);
    }else if (event.ctrlKey && key === "s") {
    event.preventDefault(); // Prevent default browser behavior
    console.log("Ctrl + S was pressed!");
    }
    });
</script>

<div class="main-mount">
    
</div>
<!--{@render children?.()}-->
