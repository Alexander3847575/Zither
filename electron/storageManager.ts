import Store from 'electron-store';
import path from 'path';

// ChunkData is available globally from app.d.ts
declare global {
    interface ChunkData {
        coords: [number, number];
        uuid: string;
        panes: any[]; // Using any[] to avoid circular imports
        dimensions?: [number, number];
        isLoaded?: boolean;
        lastAccessed?: Date;
    }
}

export class StorageManager {
    private static instance: StorageManager;
    private store: Store<Record<string, ChunkData>>;

    private constructor() {
        // Store JSON directly in project folder
        const cwd = path.resolve(process.cwd(), 'electron'); // folder in project
        this.store = new Store<Record<string, ChunkData>>({
            name: 'zither-storage',
            cwd, // JSON will be at <project>/electron/zither-storage.json
        });
        console.log('Storing JSON at:', (this.store as any).path);
    }

    public static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    /** Convert coordinates to storage key format "x,y" */
    private coordsToKey(coords: [number, number]): string {
        return `${coords[0]},${coords[1]}`;
    }

    /** Convert storage key back to coordinates */
    private keyToCoords(key: string): [number, number] {
        const [x, y] = key.split(',').map(Number);
        return [x, y];
    }

    /** Save chunk data permanently */
    public saveChunk(chunkData: ChunkData): void {
        if (!chunkData || !chunkData.coords) {
            throw new Error('ChunkData and coords cannot be undefined');
        }
        const key = this.coordsToKey(chunkData.coords);
        this.store.set(key, chunkData);
        console.log(`Saved chunk at ${key}:`, chunkData);
    }

    /** Load chunk data by coordinates */
    public loadChunk(coords: [number, number]): ChunkData | null {
        const key = this.coordsToKey(coords);
        const chunkData = this.store.get(key) as ChunkData | undefined;
        console.log(`Loaded chunk at ${key}:`, chunkData);
        return chunkData ?? null;
    }

    /** Check if chunk exists at coordinates */
    public hasChunk(coords: [number, number]): boolean {
        const key = this.coordsToKey(coords);
        return this.store.has(key);
    }

    /** Get all stored chunk coordinates */
    public getAllChunkCoords(): [number, number][] {
        const allData = this.store.store;
        return Object.keys(allData).map(key => this.keyToCoords(key));
    }

    /** Get all stored chunks */
    public getAllChunks(): ChunkData[] {
        const allData = this.store.store;
        return Object.values(allData);
    }

    /** Delete chunk at coordinates */
    public deleteChunk(coords: [number, number]): boolean {
        const key = this.coordsToKey(coords);
        if (this.store.has(key)) {
            this.store.delete(key);
            console.log(`Deleted chunk at ${key}`);
            return true;
        }
        return false;
    }

    // Note: Individual chunks can be deleted, but we maintain the no-clear-all policy
}

// Singleton instance
export const storageManager = StorageManager.getInstance();
