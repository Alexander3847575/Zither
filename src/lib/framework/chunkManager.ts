import Chunk from "$lib/components/Chunk.svelte";
import Pane from "$lib/components/Pane.svelte";
import { mount, unmount } from "svelte";


export class ChunkHolder {
    uuid: string;
    chunk: Chunk;
    panes: Map<string, Pane>;
    constructor(uuid: string, chunk: Chunk, panes: Map<string, Pane>) {
        this.uuid = uuid;
        this.chunk = chunk;
        this.panes = panes;
    }
}

export class PaneHolder {
    uuid: string;
    data: PaneData;
    constructor(uuid: string, data: PaneData) {
        this.uuid = uuid;
        this.data = data;
    }
}

export class ChunkManager {
     
    loadedChunks: Map<number, Map<number, ChunkHolder>>;
    parent: HTMLElement;

    constructor(parent: HTMLElement) {
        this.loadedChunks = new Map();
        this.parent = parent;
    }

    /**
     * Loads a Space to this.loadedSpaces from storage. Will overwrite data at old coordinates.
     * @param coords Tuple of [number, number] for the Space to fetch from persistent storage.
     */
    async load(coords: [number, number]): Promise<Chunk | null> {

        if (!this.loadedChunks.has(coords[0]))
            this.loadedChunks.set(coords[0], new Map());


        let yMap: Map<number, ChunkHolder> = this.loadedChunks.get(coords[0])!;

        if (yMap.has(coords[1])) {
            return null;
        }

        //if (Storage.get(coords) == null) TODO: Check if storage has space and if not load one
        // TODO: Create storage fetch queue and scheduler; check if chunk is within current render range upon task handling
        let chunkUUID = crypto.randomUUID();
        let chunk = mount(Chunk, {
            target: this.parent,
            props: {
                coords: coords,
                uuid: chunkUUID,
            }
        });

        yMap!.set(coords[1], new ChunkHolder(chunkUUID, chunk, new Map()));
        
        return chunk;
    }

    async unload(coords: [number, number]) {
        if (!this.loadedChunks.has(coords[0]))
            return;
        let yMap: Map<number, ChunkHolder> | null = this.loadedChunks.get(coords[0]) ?? null;

        if (!yMap!.has(coords[1])) 
            return;
        // TODO: Save chunk to storage here
        unmount(yMap!.get(coords[1])!.chunk);
        yMap?.delete(coords[1]);
        
        if (yMap!.size == 0) 
            this.loadedChunks.delete(coords[0]);

    }

    async mountPane(chunkCoords: [number, number], data: PaneData) {
        let chunkHolder = this.loadedChunks.get(chunkCoords[0])?.get(chunkCoords[1]);
        if (chunkHolder == undefined)
            return;

        // Prefer adding the pane through the Chunk component so it becomes a real child and
        // inherits context set by ancestors. The mounted Chunk component exposes addPane.
        try {
            // chunkHolder.chunk is the value returned by mount(Chunk, ...)
            if (typeof (chunkHolder.chunk as any).addPane === 'function') {
                (chunkHolder.chunk as any).addPane(data);
                // We don't have direct access to the Pane instance here (it's managed by Chunk),
                // so store a marker object in the map for bookkeeping.
                chunkHolder.panes.set(data.uuid, null as any);
                return;
            }
        } catch (e) {
            // fall back to old behavior if chunk instance doesn't expose addPane
            console.warn('Chunk.addPane call failed, falling back to programmatic mount', e);
        }

        // Fallback: mount pane programmatically into the chunk DOM element. This won't inherit context.
        let target = document.querySelector(`.chunk-${chunkHolder.uuid}`)
        if (target == null)
            return;
        let pane = mount(Pane, {
            target: target,
            props: {
                data: data,
            }
        });
        chunkHolder.panes.set(data.uuid, pane);
    }

    async movePane(uuid: string, oldCoords: [number, number], newCoords: [number, number]) {

    }
    
    async unmountPane(uuid: string, chunkCoords: [number, number]) {
        let chunkHolder = this.loadedChunks.get(chunkCoords[0])?.get(chunkCoords[1]);
        if (chunkHolder == undefined)
            return;
        // If the pane was programmatically mounted we stored the instance in panes map.
        const paneInstance = chunkHolder.panes.get(uuid);
        if (paneInstance) {
            try {
                unmount(paneInstance);
            } catch (e) {
                console.warn('Failed to unmount pane instance', e);
            }
            chunkHolder.panes.delete(uuid);
            return;
        }

        // Otherwise the pane is managed by the Chunk component. Try to call its removePane API.
        try {
            if (typeof chunkHolder.chunk?.removePane === 'function') {
                chunkHolder.chunk.removePane(uuid);
                chunkHolder.panes.delete(uuid);
                return;
            }
        } catch (e) {
            console.warn('Chunk.removePane call failed', e);
        }

        // As a last resort, try to find the element and unmount any child components gracefully.
        const target = document.querySelector(`.chunk-${chunkHolder.uuid}`);
        if (!target) return;
        // nothing else we can reliably do here
    }


    async testRender(size: number) {
        var printMatrix = new Array(size);
        for (var i = 0; i < size; i++) {
            printMatrix[i] = new Array(size);
        }
        var radius = Math.floor(size / 2);
        var j = 1;     
        this.rotate(0, 0, size, (pos) => {
            console.log(pos, j);
            printMatrix[pos[1] * -1 + radius][pos[0] + radius] = j;
            j++;
        });
        console.log(printMatrix);
    }

    async renderChunks(origin: [number, number], renderDistance: number) {
        for (let i = 1; i <= renderDistance + 1; i++) {
            let size = (i - 1) * 2 + 1;
            this.rotate(0, 0, size, (pos) => {
                this.load([origin[0] + pos[0], origin[1] + pos[1]]);
            });
        }
        // for all x in loadedChunks outside of distance, remove
        // for all x remaining, remove all y outside of distance
        for (const [xVal, xGroup] of this.loadedChunks) {
            //console.log("Scanning x column " + xVal + " with distance " + Math.abs(origin[0] - xVal) + " render: " + renderDistance + " consisting of " + JSON.stringify(Object.fromEntries(xGroup.entries())));
            if (Math.abs(origin[0] - xVal) > renderDistance) {
                for (const [yVal, chunk] of xGroup) {
                    //console.log("X out of range, unloading y = " + yVal + " with distance " + Math.abs(origin[0] - yVal));
                    this.unload([xVal, yVal]);
                }
            } else {
                for (const [yVal, chunk] of xGroup) {
                    //console.log("X in range, scanning y = " + yVal + " with distance " + Math.abs(origin[1] - yVal) + " render: " + renderDistance);
                    if (Math.abs(origin[1] - yVal) <= renderDistance) {
                        continue;
                    }
                    this.unload([xVal, yVal]);
                }   
            }
        }
    }

    /**
     * Rotates around a square ring of a given width around a given origin in a spiral pattern and passes result to callback. TODO: Fails for SOME REASON when it fills in the corners
     * @param origin 
     * @param ring 
     */
    private rotate(direction: number, occurence: number, length: number, callback?: (offset: [number, number]) => void) {
        let radius = Math.floor(length / 2);

        var sideOffset = Math.ceil(occurence / 2);

        if (occurence % 2 == 0)
            sideOffset = sideOffset * -1;


        var output: [number, number] = [0, 0];

        switch (direction) {
            case (0): 
                output = [radius, sideOffset];
                break;
            case (1):
                output = [-sideOffset, radius];
                break;
            case (2):
                output = [-radius, -sideOffset];
                break;
            case (3):
                output = [sideOffset, -radius];
                break;
        }

        callback?.call(this, output);

        var newDirection = direction + 1;
        
        if (newDirection > 3) {
            newDirection = 0;
            occurence += 1;
        }

        if (occurence >= length - 1)
            return;

        this.rotate(newDirection, occurence, length, callback);
    }

}