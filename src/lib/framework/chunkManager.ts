import type Chunk from "$lib/components/Chunk.svelte";
import { mount } from "svelte";


export class ChunkManager {

    private target: HTMLElement;
    private loadedChunks: Map<number, Map<number, Chunk>>;

    constructor(target: HTMLElement) {
        this.target = target;
        this.loadedChunks = new Map();
    }

    async load(target: HTMLElement, coords: [number, number]) {
        if (!this.loadedChunks.has(coords[0])) {
            this.loadedChunks.set(coords[0], new Map());
        }
        let yMap = this.loadedChunks.get(coords[0]);

        if (yMap?.has(coords[1])) {
            return;
        }

        // TODO: Save and load from db here

        //let chunk = mount(this.target, {

        //});
        //return chunk;
    }

    async save() {
        
    }
}