<script lang="ts">
    import { getContext } from "svelte";
  import { Tween } from "svelte/motion";

    let appState: AppState = getContext("appstate");
    let currentSize = appState.chunkDimensions;

</script>

{#if appState.state == AppStates.MovingSpace}
    <div
        class="
            bg-gray-50
        "
        style="
            z-index: 2;
        "
    >

    </div>
{/if}