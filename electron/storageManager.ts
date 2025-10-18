import Store from 'electron-store';
import path from 'path';

export interface Coordinates {
    x: number;
    y: number;
}

export interface CoordinatePair {
    first: Coordinates;
    second: Coordinates;
}

export class StorageManager {
    private static instance: StorageManager;
    private store: Store<any>;
    private storageKey = 'zither_coordinates';

    private constructor() {
        // Store JSON directly in project folder
        const cwd = path.resolve(process.cwd(), 'electron'); // folder in project
        this.store = new Store({
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

    /** Save coordinates permanently */
    public saveCoordinates(firstCoords: Coordinates, secondCoords: Coordinates): void {
        if (!firstCoords || !secondCoords) throw new Error('Coordinates cannot be undefined');
        const coordPair: CoordinatePair = { first: firstCoords, second: secondCoords };
        this.store.set(this.storageKey, coordPair);
        console.log('Saved coordinates:', coordPair);
    }

    /** Load coordinates */
    public loadCoordinates(): CoordinatePair | null {
        const coordPair = this.store.get(this.storageKey) as CoordinatePair | undefined;
        console.log('Loaded coordinates:', coordPair);
        return coordPair ?? null;
    }

    /** Check if coordinates exist */
    public hasCoordinates(): boolean {
        return this.store.has(this.storageKey);
    }

    // Note: No clearStorage() method — nothing will ever be deleted
}

// Singleton instance
export const storageManager = StorageManager.getInstance();
