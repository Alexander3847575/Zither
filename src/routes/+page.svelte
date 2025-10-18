<script lang="ts">
    import ChunkRoot from "$lib/components/ChunkRoot.svelte";
    import Dock from "$lib/components/Dock.svelte";
    import { setContext } from "svelte";
    import { cubicOut } from "svelte/easing";
    import { Tween } from "svelte/motion";

    // Runtime export of application state enums
    export const AppStates = {
        Default: 'Default',
        InteractPane: 'InteractPane',
        InteractMenu: 'InteractMenu',
        MovingPane: 'MovingPane',
        MovingSpace: 'MovingSpace'
    } as const;

    let viewportPos: [number, number] = [0, 0];
    let chunkSize: [number, number] = [6, 3]; // In terms of units
    let unitToPixelRatio = new Tween(document.body.clientWidth / 16, {
        duration: 0,
        easing: cubicOut,
    });
    let chunkDimensions: [Tween<number>, Tween<number>] = [
        new Tween(chunkSize[0] * unitToPixelRatio.current, {
            duration: 150,
            easing: cubicOut,
        }),
        new Tween(chunkSize[1] * unitToPixelRatio.current, {
            duration: 150,
            easing: cubicOut,
        })
    ];
    let chunkAspectRatio = chunkSize[0] / chunkSize[1];
    let initialOffset = [screen.availWidth / 2 - chunkDimensions[0].current / 2, screen.availHeight / 2 - chunkDimensions[1].current / 2];
    let mouseDelta: [number, number] = [0, 0];
    let effectiveDelta: [number, number] = [0, 0];
    let globalOffset: [Tween<number>, Tween<number>] = [
        new Tween(initialOffset[0] + viewportPos[0] * unitToPixelRatio.current, {
            duration: 150,
            easing: cubicOut,
        }),
        new Tween(initialOffset[1] + viewportPos[1] * unitToPixelRatio.current, {
            duration: 150,
            easing: cubicOut,
        })
    ];

    let directionData = "";

    let appState: AppState = $state({
        state: AppStates.Default,
        viewportPos: viewportPos,
        unitToPixelRatio: unitToPixelRatio,
        chunkSize: chunkSize,
        chunkDimensions: chunkDimensions,
        globalOffset: globalOffset,
        effectiveDelta: effectiveDelta,
        directionData: directionData,
    });
    setContext("appstate", appState);

    function updateUnitToPixelRatio(newRatio: number) {
        appState.unitToPixelRatio.set(newRatio);
    }

</script>

<ChunkRoot></ChunkRoot>
<Dock></Dock>
