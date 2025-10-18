@ -0,0 +1,16 @@
<script lang="ts">
  import { getContext } from "svelte";

    let appState: AppState = getContext("appstate");
</script>




<div class="absolute bg-slate-600 rounded-2xl m-2 text-slate-200 px-2" style="z-index: 10;">
    State: {appState.state}
    Pos: {appState.viewportPos}
    Del: {appState.effectiveDelta}
    Direction: {appState.directionData}
    Active: {appState.activeChunk}
    <span style="-webkit-app-region: drag">⋮⋮⋮⋮⋮</span>
</div>