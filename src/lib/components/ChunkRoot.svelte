<script lang="ts">
    import { getContext, setContext } from "svelte";
    import { ChunkManager } from "$lib/framework/chunkManager";

    const body = document.body;
    const mountPoint = (body.querySelector('#main-mount') instanceof HTMLElement) ? (body.getElementsByClassName("main-mount").item(0) as HTMLElement) : body;
    // (body.getElementsByClassName("main-mount").item(0) instanceof HTMLElement) ? (body.getElementsByClassName("main-mount").item(0) as HTMLElement) : body;

    // place files you want to import through the `$lib` alias in this folder.
    let appState: AppState = getContext('appstate');
    const chunkManager: ChunkManager = new ChunkManager(mountPoint!);
    console.log("Initialized chunk manager.");

    $effect(() => {
        chunkManager.renderChunks(appState.viewportPos, 1);
    });

    document.addEventListener("keydown", (event) => {
    const key = event.key; // Get the key pressed
    if (key === "Enter") {
    console.log("Enter key was pressed!");
    chunkManager.mountPane(appState.viewportPos, {
        uuid: crypto.randomUUID(),
        paneType: "pdf",
        data: {"src": ""},
        chunkCoords: appState.viewportPos,
        paneCoords: [1, 1],
        paneSize: [2, 3],
        semanticTags: "",
        color: [255, 0, 0, 255],
    });
    } else if (event.ctrlKey && key === "s") {
    event.preventDefault(); // Prevent default browser behavior
    console.log("Ctrl + S was pressed!");
    }
    });
</script>

<div class="main-mount">
    
</div>
<!--{@render children?.()}-->
