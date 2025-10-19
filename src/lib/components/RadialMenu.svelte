<script lang="ts">
    import { getContext } from "svelte";
  import { elasticOut, quartOut } from "svelte/easing";
  import { Tween } from "svelte/motion";

    let appState: AppState = getContext("appstate");
    let size = new Tween(0, {
        easing: quartOut,
        duration: 400,
    });
    let baseItemWidth = 50;
    let outerCircleWidth = baseItemWidth * 3;
    let x = appState.mousePos[0] - (baseItemWidth/2);
    let y = appState.mousePos[1] - (baseItemWidth/2);
    let outerX = appState.mousePos[0] - (outerCircleWidth/2);
    let outerY = appState.mousePos[1] - (outerCircleWidth/2);
    let rotation = $derived(Math.atan2(appState.mouseDelta[1], appState.mouseDelta[0]) + 1.2);

    let itemCount = 3;
    let angle = (2 * Math.PI / itemCount);

    size.set(1);
</script>
<div style="
border-color: #1a7bff;
border-radius: 50%;
left: {x + (baseItemWidth/2) * (1-size.current)}px;
top: {y + (baseItemWidth/2) * (1-size.current)}px;
width: {baseItemWidth * size.current}px;
height: {baseItemWidth * size.current}px;
z-index: 75;
opacity: 100%;
"
class="
absolute
border-4
bg-white
text-center
">

</div>
<div style="
border-radius: 50%;
left: {outerX + (outerCircleWidth/2) * (1-size.current)}px;
top: {outerY  + (outerCircleWidth/2) * (1-size.current)}px;
width: {outerCircleWidth * size.current}px;
height: {outerCircleWidth* size.current}px;
z-index: 74;
opacity: 80%;
background-image: conic-gradient(#e1efff 45deg, white 0 220deg);
transform: rotate({rotation}rad);

"
class="
absolute
border-4
border-gray-200
bg-gray-20  
text-center
">
</div>

{#each { length: itemCount }, i}
    <div style="
    left: {-baseItemWidth/2 +outerX + outerCircleWidth/2  - outerCircleWidth/2  * Math.cos(angle * i + 1.6)}px;
    top: {-baseItemWidth/2 + outerY + outerCircleWidth/2 - outerCircleWidth/2 * Math.sin(angle * i + 1.6)}px;
    height: {baseItemWidth}px;
    width: {baseItemWidth}px;
    border-radius: 20%;
    border-color: {(Math.abs(angle * i - rotation) < angle /2) ? "#1a7bff" : "#dde1ed"};
    z-index: 76;
    "
    class="
    border-5
    bg-white
    absolute
    flex
    items-center
    ">
    <svg xmlns="http://www.w3.org/2000/svg" width="{baseItemWidth * 0.7}" height="{baseItemWidth * 0.7}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-browser-plus"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 8h16" /><path d="M12 20h-6a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v6" /><path d="M8 4v4" /><path d="M16 19h6" /><path d="M19 16v6" /></svg>
    </div>
{/each}