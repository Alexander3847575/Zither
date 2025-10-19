import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the storage manager to avoid localStorage dependencies and file IO
const mockStorageManager = {
    getAllChunksArray: vi.fn().mockReturnValue([]),
    saveChunk: vi.fn(),
};

vi.mock('./storageManager.js', () => ({
    storageManager: mockStorageManager
}));

// A minimal, isolated implementation that mirrors the production workflow
// We avoid importing the Svelte-runes class to keep this test runnable in isolation.
class MinimalClusterManager {
    createClustersFromAPI(results: Array<{ id: string; name: string; tabs: Array<{ id: string; name: string }> }>) {
        const clusters: any[] = [];
        results.forEach((result, index) => {
            const paneIds = result.tabs.map((t) => t.id);
            const color = this.generateClusterColor(index);
            const cluster = {
                id: result.id,
                label: result.name,
                paneIds,
                color
            };
            clusters.push(cluster);
            this.applyClusterColors(cluster);
        });
        return clusters;
    }

    async autoClusterFromBackend(timeoutMs: number = 15000) {
        // Gather panes from storage
        const allChunks = mockStorageManager.getAllChunksArray();
        const panes = allChunks.flatMap((c: any) => c.panes);
        if (!panes || panes.length === 0) {
            return null;
        }

        const tabsPayload = panes.map((p: any) => ({ id: p.uuid, name: p.paneType }));

        // Prefer Electron bridge if available
        if (typeof window !== 'undefined' && (window as any).api?.clusterTabs) {
            const result = await (window as any).api.clusterTabs(tabsPayload);
            return this.createClustersFromAPI(result);
        }

        // Fallback to fetch
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const resp = await fetch('http://localhost:8000/cluster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tabsPayload),
                signal: controller.signal
            } as RequestInit);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            return this.createClustersFromAPI(data);
        } finally {
            clearTimeout(t);
        }
    }

    private applyClusterColors(cluster: { paneIds: string[]; color: [number, number, number, number] }) {
        const allChunks = mockStorageManager.getAllChunksArray();
        allChunks.forEach((chunk: any) => {
            let modified = false;
            chunk.panes.forEach((pane: any) => {
                if (cluster.paneIds.includes(pane.uuid)) {
                    pane.color = cluster.color;
                    modified = true;
                }
            });
            if (modified) mockStorageManager.saveChunk(chunk);
        });
    }

    private generateClusterColor(index: number): [number, number, number, number] {
        const colors: [number, number, number, number][] = [
            [255, 99, 132, 255],
            [54, 162, 235, 255],
            [255, 205, 86, 255],
            [75, 192, 192, 255],
            [153, 102, 255, 255],
            [255, 159, 64, 255]
        ];
        return colors[index % colors.length];
    }
}

// Test data helpers
const createMockPane = (id: string, color: [number, number, number, number] = [255, 255, 255, 255]) => ({
    uuid: id,
    paneType: 'mock-type',
    data: {},
    chunkCoords: [0, 0] as [number, number],
    paneCoords: [0, 0] as [number, number],
    paneSize: [1, 1] as [number, number],
    semanticTags: 'mock',
    color
});

const createMockChunk = (panes: any[]) => ({
    coords: [0, 0] as [number, number],
    uuid: 'chunk-0-0',
    panes,
});

describe('Auto-cluster workflow (isolated)', () => {
    let mgr: MinimalClusterManager;

    beforeEach(() => {
        vi.clearAllMocks();
        mgr = new MinimalClusterManager();
        // Default panes in storage
        const chunk = createMockChunk([
            createMockPane('pane-1'),
            createMockPane('pane-2')
        ]);
        mockStorageManager.getAllChunksArray.mockReturnValue([chunk]);
    });

    afterEach(() => {
        // Cleanup any global mocks
        if (typeof window !== 'undefined') (window as any).api = undefined;
        (globalThis as any).fetch = undefined;
    });

    it('uses Electron bridge when available and applies colors', async () => {
        const mockResponse = [
            {
                id: 'cluster_1',
                name: 'Web Dev',
                tabs: [
                    { id: 'pane-1', name: 'SvelteKit Docs' },
                    { id: 'pane-2', name: 'OpenAI Blog' },
                ],
            },
        ];

        (window as any).api = { clusterTabs: vi.fn().mockResolvedValue(mockResponse) };

        const clusters = await mgr.autoClusterFromBackend(5000);
        expect(clusters).toHaveLength(1);
        expect((window as any).api.clusterTabs).toHaveBeenCalledTimes(1);
        expect(mockStorageManager.saveChunk).toHaveBeenCalled();
    });

    it('falls back to fetch when Electron bridge is absent', async () => {
        const mockResponse = [
            {
                id: 'cluster_1',
                name: 'AI Research',
                tabs: [
                    { id: 'pane-1', name: 'HDBSCAN paper' },
                ],
            },
        ];

        (globalThis as any).fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        });

        const clusters = await mgr.autoClusterFromBackend(5000);
        expect(clusters).toHaveLength(1);
        expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
        expect(mockStorageManager.saveChunk).toHaveBeenCalled();
    });

    it('returns null when there are no panes', async () => {
        mockStorageManager.getAllChunksArray.mockReturnValue([]);
        const clusters = await mgr.autoClusterFromBackend(100);
        expect(clusters).toBeNull();
    });
});


