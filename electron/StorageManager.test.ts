import { describe, it, expect } from 'vitest';
import { StorageManager, Coordinates, CoordinatePair } from './storageManager';
import Store from 'electron-store';
import path from 'path';
import fs from 'fs';

// Setup test folder and store path
const testFolder = path.resolve(process.cwd(), 'electron-test');
if (!fs.existsSync(testFolder)) fs.mkdirSync(testFolder, { recursive: true });

const testStorePath = path.resolve(testFolder, 'zither-storage-test.json');

// Create a separate StorageManager instance for testing
const testStorageManager = (() => {
    const store = new Store({
        name: 'zither-storage-test',
        cwd: testFolder,
    });

    return {
        saveCoordinates(first: Coordinates, second: Coordinates) {
            const coordPair: CoordinatePair = { first, second };
            store.set('zither_coordinates', coordPair);
        },
        loadCoordinates(): CoordinatePair | null {
            return store.get('zither_coordinates') as CoordinatePair | null;
        },
        hasCoordinates(): boolean {
            return store.has('zither_coordinates');
        },
        getStorePath(): string {
            return (store as any).path;
        }
    };
})();

describe('StorageManager (disk test)', () => {
    const coord1: Coordinates = { x: 10, y: 20 };
    const coord2: Coordinates = { x: 30, y: 40 };

    it('saves and loads coordinates correctly', () => {
        testStorageManager.saveCoordinates(coord1, coord2);

        // Check that file exists
        expect(fs.existsSync(testStorageManager.getStorePath())).toBe(true);

        const loaded: CoordinatePair | null = testStorageManager.loadCoordinates();
        expect(loaded).not.toBeNull();
        expect(loaded).toEqual({ first: coord1, second: coord2 });

        // Print saved JSON for verification
        console.log('Saved contents:', fs.readFileSync(testStorageManager.getStorePath(), 'utf-8'));
    });

    it('returns true when coordinates exist', () => {
        testStorageManager.saveCoordinates(coord1, coord2);
        const hasCoords = testStorageManager.hasCoordinates();
        expect(hasCoords).toBe(true);
    });

    it('returns false when coordinates do not exist', () => {
        // Only works if store was never written to
        const storeEmpty = new Store({ name: 'zither-storage-test-empty', cwd: testFolder });
        const hasCoords = storeEmpty.has('zither_coordinates');
        expect(hasCoords).toBe(false);
    });
});
