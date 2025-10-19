// Browser-compatible storage manager that can work in both web and Electron environments

// Define ChunkData interface locally since it's declared globally in app.d.ts
interface ChunkData {
    coords: [number, number];
    uuid: string;
    panes: PaneData[];
    dimensions?: [number, number];
    isLoaded?: boolean;
    lastAccessed?: Date;
}

interface PaneData {
    uuid: string;
    paneType: string;
    data: Object;
    chunkCoords: [number, number];
    paneCoords: [number, number];
    paneSize: [number, number];
    semanticTags: string;
    color: [number, number, number, number];
}

// Check if we're running in Electron
const isElectron = typeof window !== 'undefined' && window.api;

// Browser fallback storage using localStorage
class BrowserStorageManager {
    private storageKey = 'zither-chunks';

    saveChunk(chunkData: ChunkData): void {
        try {
            const existingData = this.getAllChunksData();
            const key = `${chunkData.coords[0]},${chunkData.coords[1]}`;
            existingData[key] = chunkData;
            localStorage.setItem(this.storageKey, JSON.stringify(existingData));
            console.log(`Saved chunk at ${key} to browser storage:`, chunkData);
            
            // Emit custom event for storage change
            window.dispatchEvent(new CustomEvent('storage-changed', { 
                detail: { action: 'save', chunkData } 
            }));
        } catch (error) {
            console.warn('Failed to save chunk to browser storage:', error);
        }
    }

    loadChunk(coords: [number, number]): ChunkData | null {
        try {
            const allData = this.getAllChunksData();
            const key = `${coords[0]},${coords[1]}`;
            const chunkData = allData[key];
            console.log(`Loaded chunk at ${key} from browser storage:`, chunkData || 'NOT FOUND');
            return chunkData || null;
        } catch (error) {
            console.warn('Failed to load chunk from browser storage:', error);
            return null;
        }
    }

    hasChunk(coords: [number, number]): boolean {
        try {
            const allData = this.getAllChunksData();
            const key = `${coords[0]},${coords[1]}`;
            return key in allData;
        } catch (error) {
            console.warn('Failed to check chunk existence in browser storage:', error);
            return false;
        }
    }

    getAllChunksArray(): ChunkData[] {
        try {
            const allData = this.getAllChunksData();
            return Object.values(allData);
        } catch (error) {
            console.warn('Failed to get all chunks from browser storage:', error);
            return [];
        }
    }

    deleteChunk(coords: [number, number]): boolean {
        try {
            const allData = this.getAllChunksData();
            const key = `${coords[0]},${coords[1]}`;
            if (key in allData) {
                delete allData[key];
                localStorage.setItem(this.storageKey, JSON.stringify(allData));
                console.log(`Deleted chunk at ${key} from browser storage`);
                
                // Emit custom event for storage change
                window.dispatchEvent(new CustomEvent('storage-changed', { 
                    detail: { action: 'delete', coords } 
                }));
                
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Failed to delete chunk from browser storage:', error);
            return false;
        }
    }

    private getAllChunksData(): Record<string, ChunkData> {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Failed to parse stored chunks from browser storage:', error);
            return {};
        }
    }
}

// Create the appropriate storage manager based on environment
let storageManager: any;

if (isElectron) {
    // In Electron, we'll dynamically import the real storage manager
    // For now, use browser storage as fallback
    console.log('Running in Electron environment, using browser storage fallback');
    storageManager = new BrowserStorageManager();
} else {
    // In browser, use localStorage-based storage
    console.log('Running in browser environment, using localStorage');
    storageManager = new BrowserStorageManager();
}

export { storageManager };
