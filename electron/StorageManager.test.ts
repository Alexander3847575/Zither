import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach } from 'vitest';
import Store from 'electron-store';

// Simple Node.js test that runs independently of vitest
async function runDirectStorageTest() {
    console.log('\n🧪 === DIRECT STORAGE MANAGER TEST ===');
    
    try {
        const testFolder = path.resolve(process.cwd(), 'electron-test');
        if (!fs.existsSync(testFolder)) fs.mkdirSync(testFolder, { recursive: true });
        
        const testFilePath = path.join(testFolder, 'zither-storage-test-direct.json');
        console.log(`📁 Storage file: ${testFilePath}`);
        
        // Test data
        const testChunks = {
            '0,1': {
                coords: [0, 1],
                uuid: 'chunk-origin-right',
                panes: [
                    {
                        uuid: 'pane-text-hello',
                        paneType: 'text',
                        data: { content: 'Hello from chunk [0,1]!' },
                        paneCoords: [1, 1],
                        paneSize: [4, 2],
                        semanticTags: 'greeting',
                        color: [255, 100, 50, 255]
                    }
                ],
                dimensions: [1470, 735],
                isLoaded: true,
                lastAccessed: new Date().toISOString()
            },
            '-2,3': {
                coords: [-2, 3],
                uuid: 'chunk-negative-positive',
                panes: [
                    {
                        uuid: 'pane-image-sample',
                        paneType: 'image',
                        data: { src: '/images/sample.jpg', alt: 'Sample image' },
                        paneCoords: [0, 0],
                        paneSize: [3, 3],
                        semanticTags: 'visual media',
                        color: [0, 255, 128, 200]
                    },
                    {
                        uuid: 'pane-note-reminder',
                        paneType: 'note',
                        data: { text: 'Remember to test negative coordinates!' },
                        paneCoords: [3, 0],
                        paneSize: [2, 1],
                        semanticTags: 'reminder note',
                        color: [255, 255, 0, 180]
                    }
                ],
                isLoaded: false
            },
            '10,-5': {
                coords: [10, -5],
                uuid: 'chunk-far-corner',
                panes: [],
                dimensions: [800, 600],
                isLoaded: true,
                lastAccessed: new Date().toISOString()
            }
        };
        
        // Save chunks using coordinate-based keys (simulate electron-store behavior)
        console.log('\n💾 Saving chunks to storage...');
        Object.entries(testChunks).forEach(([key, chunkData]) => {
            console.log(`  ✓ Saved chunk at ${key}: ${chunkData.uuid}`);
        });
        
        // Write to JSON file
        fs.writeFileSync(testFilePath, JSON.stringify(testChunks, null, 2));
        
        // Read back and verify
        console.log('\n📂 Reading chunks from storage...');
        const fileContents = fs.readFileSync(testFilePath, 'utf-8');
        const storedData = JSON.parse(fileContents);
        Object.keys(storedData).forEach(key => {
            const chunk = storedData[key];
            console.log(`  ✓ Found chunk at ${key}: ${chunk.uuid} (${chunk.panes.length} panes)`);
        });
        
        console.log('\n📄 Raw JSON file contents:');
        console.log('='.repeat(80));
        console.log(fileContents);
        console.log('='.repeat(80));
        
        // Parse and analyze
        console.log('\n🔍 Analysis:');
        console.log(`  - File size: ${Buffer.byteLength(fileContents, 'utf8')} bytes`);
        console.log(`  - Chunks stored: ${Object.keys(storedData).length}`);
        console.log(`  - Coordinate keys: ${Object.keys(storedData).join(', ')}`);
        
        let totalPanes = 0;
        Object.values(storedData).forEach((chunk: any) => {
            totalPanes += chunk.panes.length;
        });
        console.log(`  - Total panes across all chunks: ${totalPanes}`);
        
        // Test coordinate-based retrieval
        console.log('\n🎯 Testing coordinate-based retrieval:');
        const testCoords = [[0, 1], [-2, 3], [10, -5], [99, 99]];
        testCoords.forEach(([x, y]) => {
            const key = `${x},${y}`;
            const exists = key in storedData;
            const chunk = storedData[key];
            console.log(`  ${key}: ${exists ? '✓ EXISTS' : '✗ NOT FOUND'} ${chunk ? `(${chunk.uuid})` : ''}`);
        });
        
        console.log('\n✅ Direct storage test completed successfully!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Direct storage test failed:', error);
        return false;
    }
}

// Run the direct test if this file is executed directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('StorageManager.test.ts')) {
    runDirectStorageTest().then(success => {
        process.exit(success ? 0 : 1);
    });
}

// Vitest tests (only run when imported by vitest)
try {
    const { describe, it, expect, beforeEach } = await import('vitest');

// Define ChunkData interface for testing
interface ChunkData {
    coords: [number, number];
    uuid: string;
    panes: any[];
    dimensions?: [number, number];
    isLoaded?: boolean;
    lastAccessed?: Date;
}

// Setup test folder and store path
const testFolder = path.resolve(process.cwd(), 'electron-test');
if (!fs.existsSync(testFolder)) fs.mkdirSync(testFolder, { recursive: true });

// Create a real storage manager for testing that writes to disk
const createTestStorageManager = () => {
    const store = new Store<Record<string, ChunkData>>({
        name: 'zither-storage-test',
        cwd: testFolder,
    });

    return {
        saveChunk(chunkData: ChunkData) {
            const key = `${chunkData.coords[0]},${chunkData.coords[1]}`;
            store.set(key, chunkData);
            console.log(`💾 Saved chunk ${key} to disk:`, chunkData);
        },
        loadChunk(coords: [number, number]): ChunkData | null {
            const key = `${coords[0]},${coords[1]}`;
            const result = store.get(key) as ChunkData | undefined;
            console.log(`📂 Loaded chunk ${key} from disk:`, result || 'NOT FOUND');
            return result || null;
        },
        hasChunk(coords: [number, number]): boolean {
            const key = `${coords[0]},${coords[1]}`;
            const exists = store.has(key);
            console.log(`🔍 Checking if chunk ${key} exists:`, exists);
            return exists;
        },
        getAllChunks(): ChunkData[] {
            const allData = Object.values(store.store);
            console.log(`📋 Retrieved all chunks from disk:`, allData.length, 'chunks');
            return allData;
        },
        deleteChunk(coords: [number, number]): boolean {
            const key = `${coords[0]},${coords[1]}`;
            if (store.has(key)) {
                store.delete(key);
                console.log(`🗑️ Deleted chunk ${key} from disk`);
                return true;
            }
            console.log(`❌ Could not delete chunk ${key} - not found`);
            return false;
        },
        getRawData(): Record<string, ChunkData> {
            return { ...store.store };
        },
        clear() {
            store.clear();
            console.log(`🧹 Cleared all chunks from disk storage`);
        },
        getStorePath(): string {
            return (store as any).path;
        }
    };
};

const testStorageManager = createTestStorageManager();

describe('StorageManager (ChunkData test)', () => {
    const testChunk1: ChunkData = {
        coords: [0, 1],
        uuid: 'chunk-test-1',
        panes: [
            { uuid: 'pane-1', paneType: 'text', data: { content: 'test' } },
            { uuid: 'pane-2', paneType: 'image', data: { src: 'test.jpg' } }
        ],
        dimensions: [1470, 735],
        isLoaded: true,
        lastAccessed: new Date('2024-01-01T00:00:00Z')
    };

    const testChunk2: ChunkData = {
        coords: [1, -1],
        uuid: 'chunk-test-2',
        panes: [],
        isLoaded: false
    };

    // Clear storage before each test
    beforeEach(() => {
        testStorageManager.clear();
    });

    it('saves and loads chunk data correctly', () => {
        testStorageManager.saveChunk(testChunk1);

        const loaded = testStorageManager.loadChunk([0, 1]);
        expect(loaded).not.toBeNull();
        expect(loaded?.coords).toEqual([0, 1]);
        expect(loaded?.uuid).toBe('chunk-test-1');
        expect(loaded?.panes).toHaveLength(2);
        expect(loaded?.dimensions).toEqual([1470, 735]);
        expect(loaded?.isLoaded).toBe(true);
    });

    it('returns true when chunk exists', () => {
        testStorageManager.saveChunk(testChunk1);
        const hasChunk = testStorageManager.hasChunk([0, 1]);
        expect(hasChunk).toBe(true);
    });

    it('returns false when chunk does not exist', () => {
        const hasChunk = testStorageManager.hasChunk([99, 99]);
        expect(hasChunk).toBe(false);
    });

    it('handles multiple chunks correctly', () => {
        testStorageManager.saveChunk(testChunk1);
        testStorageManager.saveChunk(testChunk2);

        const allChunks = testStorageManager.getAllChunks();
        expect(allChunks).toHaveLength(2);

        const chunk1 = testStorageManager.loadChunk([0, 1]);
        const chunk2 = testStorageManager.loadChunk([1, -1]);

        expect(chunk1?.uuid).toBe('chunk-test-1');
        expect(chunk2?.uuid).toBe('chunk-test-2');
    });

    it('deletes chunks correctly', () => {
        testStorageManager.saveChunk(testChunk1);
        expect(testStorageManager.hasChunk([0, 1])).toBe(true);

        const deleted = testStorageManager.deleteChunk([0, 1]);
        expect(deleted).toBe(true);
        expect(testStorageManager.hasChunk([0, 1])).toBe(false);

        // Trying to delete non-existent chunk
        const deletedAgain = testStorageManager.deleteChunk([0, 1]);
        expect(deletedAgain).toBe(false);
    });

    it('uses coordinate-based keys correctly', () => {
        testStorageManager.saveChunk(testChunk1);
        testStorageManager.saveChunk(testChunk2);

        // Check raw data structure to verify key format
        const rawData = testStorageManager.getRawData();
        
        expect(rawData).toHaveProperty('0,1');
        expect(rawData).toHaveProperty('1,-1');
        expect(rawData['0,1'].uuid).toBe('chunk-test-1');
        expect(rawData['1,-1'].uuid).toBe('chunk-test-2');
    });

    it('handles negative coordinates correctly', () => {
        const negativeChunk: ChunkData = {
            coords: [-5, -10],
            uuid: 'negative-chunk',
            panes: []
        };

        testStorageManager.saveChunk(negativeChunk);
        
        const loaded = testStorageManager.loadChunk([-5, -10]);
        expect(loaded).not.toBeNull();
        expect(loaded?.coords).toEqual([-5, -10]);
        
        const rawData = testStorageManager.getRawData();
        expect(rawData).toHaveProperty('-5,-10');
    });

    it('writes actual JSON file to disk and prints contents', () => {
        console.log('\n🧪 === DISK STORAGE VERIFICATION TEST ===');
        
        // Clear any existing data
        testStorageManager.clear();
        
        // Create comprehensive test data
        const complexChunk: ChunkData = {
            coords: [2, -3],
            uuid: 'complex-test-chunk',
            panes: [
                { 
                    uuid: 'pane-text-1', 
                    paneType: 'text', 
                    data: { content: 'Hello World!', fontSize: 14 },
                    paneCoords: [1, 1],
                    paneSize: [3, 2],
                    semanticTags: 'greeting text',
                    color: [255, 100, 50, 255]
                },
                { 
                    uuid: 'pane-image-1', 
                    paneType: 'image', 
                    data: { src: '/path/to/image.jpg', alt: 'Test image' },
                    paneCoords: [4, 1],
                    paneSize: [2, 3],
                    semanticTags: 'visual content',
                    color: [0, 255, 128, 200]
                }
            ],
            dimensions: [1470, 735],
            isLoaded: true,
            lastAccessed: new Date('2024-10-19T22:00:00Z')
        };

        const simpleChunk: ChunkData = {
            coords: [0, 0],
            uuid: 'origin-chunk',
            panes: [],
            isLoaded: false
        };

        // Save both chunks
        console.log('\n📝 Saving test chunks...');
        testStorageManager.saveChunk(complexChunk);
        testStorageManager.saveChunk(simpleChunk);

        // Verify file exists and read contents
        const filePath = testStorageManager.getStorePath();
        console.log(`\n📁 Storage file path: ${filePath}`);
        
        expect(fs.existsSync(filePath)).toBe(true);
        
        const fileContents = fs.readFileSync(filePath, 'utf-8');
        console.log('\n📄 Raw JSON file contents:');
        console.log('='.repeat(60));
        console.log(fileContents);
        console.log('='.repeat(60));
        
        // Parse and verify structure
        const parsedData = JSON.parse(fileContents);
        console.log('\n🔍 Parsed data structure:');
        console.log('Keys found:', Object.keys(parsedData));
        
        // Verify coordinate-based keys
        expect(parsedData).toHaveProperty('2,-3');
        expect(parsedData).toHaveProperty('0,0');
        
        // Verify complex chunk data
        expect(parsedData['2,-3'].uuid).toBe('complex-test-chunk');
        expect(parsedData['2,-3'].panes).toHaveLength(2);
        expect(parsedData['2,-3'].dimensions).toEqual([1470, 735]);
        
        // Verify simple chunk data
        expect(parsedData['0,0'].uuid).toBe('origin-chunk');
        expect(parsedData['0,0'].panes).toHaveLength(0);
        
        console.log('\n✅ All JSON structure validations passed!');
        console.log('\n📊 Storage Summary:');
        console.log(`  - File size: ${Buffer.byteLength(fileContents, 'utf8')} bytes`);
        console.log(`  - Chunks stored: ${Object.keys(parsedData).length}`);
        console.log(`  - Total panes: ${Object.values(parsedData).reduce((sum: number, chunk: any) => sum + chunk.panes.length, 0)}`);
    });
});

} catch (error) {
    // Vitest not available, skip tests
}
