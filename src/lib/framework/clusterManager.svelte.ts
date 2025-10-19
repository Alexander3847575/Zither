// Cluster Manager - Manages clusters of panes with colors and persistence
// Integrates with storageManager to access and modify pane data

import { storageManager } from './storageManager.js';
import { untrack } from 'svelte';

// Define interfaces locally since they're declared globally in app.d.ts
interface Cluster {
    id: string;
    label: string;
    paneIds: string[];
    color: [number, number, number, number];
    createdAt?: Date;
    updatedAt?: Date;
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

interface ChunkData {
    coords: [number, number];
    uuid: string;
    panes: PaneData[];
    dimensions?: [number, number];
    isLoaded?: boolean;
    lastAccessed?: Date;
}

class ClusterManager {
    private storageKey = 'zither-clusters';
    private nextClusterId = 1;
    
    // Make clusters reactive using $state
    private clusters = $state(new Map<string, Cluster>());
    
    constructor() {
        // Load existing clusters from localStorage on initialization
        this.loadClustersFromStorage();
    }

    /**
     * Auto-cluster current panes by calling the backend service.
     * Uses Electron bridge if available, otherwise falls back to fetch.
     */
    async autoClusterFromBackend(timeoutMs: number = 15000): Promise<Cluster[] | null> {
        const allChunks = storageManager.getAllChunksArray();
        const panes: PaneData[] = allChunks.flatMap((c: ChunkData) => c.panes);
        if (!panes || panes.length === 0) {
            console.warn('No panes available to cluster.');
            return null;
        }

        const tabsPayload = panes.map(p => ({ id: p.uuid, name: p.paneType }));

        // Prefer Electron bridge if present
        try {
            if (typeof window !== 'undefined' && (window as any).api?.clusterTabs) {
                // Ensure backend is running (best-effort)
                try { await (window as any).api.startPythonAPI(); } catch {}
                const result = await (window as any).api.clusterTabs(tabsPayload);
                return this.createClustersFromAPI(result);
            }
        } catch (e) {
            console.warn('Electron bridge clustering failed, falling back to fetch:', e);
        }

        // Fallback to direct fetch to local backend
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const resp = await fetch('http://localhost:8000/cluster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tabsPayload),
                signal: controller.signal
            });
            if (!resp.ok) {
                let detail = '';
                try {
                    const errJson = await resp.json();
                    detail = errJson?.detail ? `: ${errJson.detail}` : '';
                } catch {
                    try { detail = `: ${await resp.text()}`; } catch {}
                }
                throw new Error(`HTTP ${resp.status}${detail}`);
            }
            const data = await resp.json();
            return this.createClustersFromAPI(data);
        } finally {
            clearTimeout(t);
        }
    }

    /**
     * Load clusters from localStorage into reactive state
     */
    private loadClustersFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.clusters.clear();
                
                // Load clusters into reactive Map
                Object.entries(data).forEach(([id, cluster]) => {
                    this.clusters.set(id, cluster as Cluster);
                });
                
                // Update nextClusterId based on existing clusters
                const existingIds = Array.from(this.clusters.keys());
                if (existingIds.length > 0) {
                    const maxId = Math.max(...existingIds
                        .filter(id => id.startsWith('cluster_'))
                        .map(id => parseInt(id.replace('cluster_', '')) || 0)
                    );
                    this.nextClusterId = maxId + 1;
                }
            }
        } catch (error) {
            console.warn('Failed to load clusters from storage:', error);
        }
    }

    /**
     * Create a new cluster with a label and pane IDs
     */
    createCluster(label: string, paneIds: string[], color?: [number, number, number, number]): Cluster {
        const id = `cluster_${this.nextClusterId++}`;
        const cluster: Cluster = {
            id,
            label,
            paneIds: [...paneIds], // Create a copy to avoid reference issues
            color: color || this.generateClusterColor(this.clusters.size),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        console.log('🎯 Creating cluster:', {
            id: cluster.id,
            label: cluster.label,
            paneCount: cluster.paneIds.length,
            paneIds: cluster.paneIds,
            color: cluster.color
        });
        
        this.clusters.set(id, cluster);
        this.persistToStorage();
        this.applyClusterColors(cluster);
        
        console.log('✅ Cluster created successfully:', cluster.id);
        return cluster;
    }

    /**
     * Persist clusters to localStorage
     */
    private persistToStorage(): void {
        untrack(() => {
            try {
                const data = Object.fromEntries(this.clusters.entries());
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            } catch (error) {
                console.warn('Failed to persist clusters to storage:', error);
            }
        });
    }

    /**
     * Get a cluster by ID
     */
    getCluster(id: string): Cluster | null {
        return this.clusters.get(id) || null;
    }

    /**
     * Get all clusters
     */
    getAllClusters(): Cluster[] {
        return Array.from(this.clusters.values());
    }

    /**
     * Update a cluster's label
     */
    updateClusterLabel(id: string, newLabel: string): boolean {
        const cluster = this.getCluster(id);
        if (!cluster) return false;
        
        cluster.label = newLabel;
        cluster.updatedAt = new Date();
        this.persistToStorage();
        return true;
    }

    /**
     * Add pane IDs to a cluster
     */
    addPanesToCluster(id: string, paneIds: string[]): boolean {
        const cluster = this.getCluster(id);
        if (!cluster) return false;
        
        // Add only new pane IDs (avoid duplicates)
        const newPaneIds = paneIds.filter(pid => !cluster.paneIds.includes(pid));
        cluster.paneIds.push(...newPaneIds);
        cluster.updatedAt = new Date();
        
        this.persistToStorage();
        this.applyClusterColors(cluster);
        return true;
    }

    /**
     * Remove pane IDs from a cluster
     */
    removePanesFromCluster(id: string, paneIds: string[]): boolean {
        const cluster = this.getCluster(id);
        if (!cluster) return false;
        
        cluster.paneIds = cluster.paneIds.filter(pid => !paneIds.includes(pid));
        cluster.updatedAt = new Date();
        
        this.persistToStorage();
        this.applyClusterColors(cluster);
        return true;
    }

    /**
     * Set the color of a cluster and update all panes
     */
    setClusterColor(id: string, color: [number, number, number, number]): boolean {
        const cluster = this.getCluster(id);
        if (!cluster) return false;
        
        cluster.color = color;
        cluster.updatedAt = new Date();
        
        this.persistToStorage();
        this.applyClusterColors(cluster);
        return true;
    }

    /**
     * Delete a cluster and reset pane colors
     */
    deleteCluster(id: string): boolean {
        const cluster = this.getCluster(id);
        if (!cluster) return false;
        
        // Reset colors of panes in this cluster
        this.resetPaneColors(cluster.paneIds);
        
        // Remove cluster from reactive Map
        this.clusters.delete(id);
        this.persistToStorage();
        
        // Emit custom event for cluster change
        window.dispatchEvent(new CustomEvent('cluster-changed', { 
            detail: { action: 'delete', clusterId: id } 
        }));
        
        return true;
    }

    /**
     * Get clusters that contain a specific pane ID
     */
    getClustersForPane(paneId: string): Cluster[] {
        return this.getAllClusters().filter(cluster => 
            cluster.paneIds.includes(paneId)
        );
    }

    /**
     * Get panes that belong to a specific cluster
     */
    getPanesInCluster(clusterId: string): PaneData[] {
        const cluster = this.getCluster(clusterId);
        if (!cluster) return [];
        
        const allChunks = storageManager.getAllChunksArray();
        const allPanes: PaneData[] = [];
        
        // Collect all panes from all chunks
        allChunks.forEach((chunk: ChunkData) => {
            allPanes.push(...chunk.panes);
        });
        
        return allPanes.filter(pane => cluster.paneIds.includes(pane.uuid));
    }

    /**
     * Create clusters from the Python API clustering results
     */
    createClustersFromAPI(clusteringResults: Array<{id: string, name: string, tabs: Array<{id: string, name: string}>}>): Cluster[] {
        const newClusters: Cluster[] = [];
        
        clusteringResults.forEach((result, index) => {
            const paneIds = result.tabs.map(tab => tab.id);
            const color = this.generateClusterColor(index);
            
            const cluster = this.createCluster(result.name, paneIds, color);
            newClusters.push(cluster);
        });
        
        return newClusters;
    }

    /**
     * Apply cluster colors to all panes in the cluster
     */
    private applyClusterColors(cluster: Cluster): void {
        // Use untrack to prevent reactive updates from causing infinite loops
        untrack(() => {
            const allChunks = storageManager.getAllChunksArray();
            let chunksModified = false;
            
            console.log('🎨 Applying cluster colors:', {
                clusterId: cluster.id,
                clusterColor: cluster.color,
                paneIds: cluster.paneIds
            });
            
            allChunks.forEach((chunk: ChunkData) => {
                let chunkModified = false;
                
                chunk.panes.forEach((pane: PaneData) => {
                    if (cluster.paneIds.includes(pane.uuid)) {
                        console.log(`🎨 Updating pane ${pane.uuid} color from`, pane.color, 'to', cluster.color);
                        pane.color = cluster.color;
                        chunkModified = true;
                    }
                });
                
                if (chunkModified) {
                    console.log(`💾 Saving chunk ${chunk.uuid} with updated colors`);
                    storageManager.saveChunk(chunk);
                    chunksModified = true;
                }
            });
            
            if (chunksModified) {
                console.log('📡 Emitting cluster-changed event');
                // Emit custom event for cluster change
                window.dispatchEvent(new CustomEvent('cluster-changed', { 
                    detail: { action: 'update', cluster } 
                }));
            }
        });
    }

    /**
     * Reset colors of specific panes to default
     */
    private resetPaneColors(paneIds: string[]): void {
        untrack(() => {
            const allChunks = storageManager.getAllChunksArray();
            let chunksModified = false;
            
            allChunks.forEach((chunk: ChunkData) => {
                let chunkModified = false;
                
                chunk.panes.forEach((pane: PaneData) => {
                    if (paneIds.includes(pane.uuid)) {
                        // Reset to default color (white with some transparency)
                        pane.color = [255, 255, 255, 200] as [number, number, number, number];
                        chunkModified = true;
                    }
                });
                
                if (chunkModified) {
                    storageManager.saveChunk(chunk);
                    chunksModified = true;
                }
            });
            
            if (chunksModified) {
                // Emit custom event for cluster change
                window.dispatchEvent(new CustomEvent('cluster-changed', { 
                    detail: { action: 'reset-colors', paneIds } 
                }));
            }
        });
    }


    /**
     * Generate a randomized color from the pastel palette, preferring colors not already used.
     * The index parameter is ignored (kept for backward compatibility).
     */
    private generateClusterColor(_index: number): [number, number, number, number] {
        const palette: [number, number, number, number][] = [
            [255, 173, 173, 255],  // FFADAD - Light Red
            [255, 214, 165, 255],  // FFD6A5 - Light Orange
            [253, 255, 182, 255],  // FDFFB6 - Light Yellow
            [202, 255, 191, 255],  // CAFFBF - Light Green
            [155, 246, 255, 255],  // 9BF6FF - Light Cyan
            [160, 196, 255, 255],  // A0C4FF - Light Blue
            [189, 178, 255, 255],  // BDB2FF - Light Purple
            [255, 198, 255, 255],  // FFC6FF - Light Pink
        ];

        // Collect colors already used by current clusters
        const usedColorKeys = new Set(
            Array.from(this.clusters.values())
                .filter(c => Array.isArray(c.color))
                .map(c => c.color.join(','))
        );

        // Prefer colors not yet used
        const unused = palette.filter(c => !usedColorKeys.has(c.join(',')));
        const pool = unused.length > 0 ? unused : palette;

        // Random pick from the pool
        const choice = pool[Math.floor(Math.random() * pool.length)];
        return choice;
    }

    /**
     * Clear all clusters and reset all pane colors
     */
    clearAllClusters(): void {
        const allClusters = this.getAllClusters();
        
        // Reset colors of all panes in all clusters
        allClusters.forEach(cluster => {
            this.resetPaneColors(cluster.paneIds);
        });
        
        // Clear reactive Map and storage
        this.clusters.clear();
        this.nextClusterId = 1;
        this.persistToStorage();
        
        // Emit custom event for cluster change
        window.dispatchEvent(new CustomEvent('cluster-changed', { 
            detail: { action: 'clear' } 
        }));
    }

    /**
     * Get cluster statistics
     */
    getStats(): { totalClusters: number, totalPanes: number, averagePanesPerCluster: number } {
        const clusters = this.getAllClusters();
        const totalClusters = clusters.length;
        const totalPanes = clusters.reduce((sum, cluster) => sum + cluster.paneIds.length, 0);
        const averagePanesPerCluster = totalClusters > 0 ? totalPanes / totalClusters : 0;
        
        return {
            totalClusters,
            totalPanes,
            averagePanesPerCluster
        };
    }

    /**
     * Refresh all cluster colors (useful after loading data)
     */
    refreshAllClusterColors(): void {
        const allClusters = this.getAllClusters();
        allClusters.forEach(cluster => {
            this.applyClusterColors(cluster);
        });
    }

    /**
     * Create a cluster from currently selected panes
     */
    createClusterFromSelection(label: string, selectedPaneIds: string[], color?: [number, number, number, number]): Cluster | null {
        console.log('🔄 createClusterFromSelection called:', {
            label,
            selectedPaneIds,
            color,
            paneCount: selectedPaneIds.length
        });

        if (selectedPaneIds.length === 0) {
            console.warn('⚠️ No panes selected for clustering');
            return null;
        }

        const cluster = this.createCluster(label, selectedPaneIds, color);
        console.log(`🎉 Created cluster "${label}" with ${selectedPaneIds.length} panes:`, selectedPaneIds);
        return cluster;
    }
}

// Export a singleton instance
export const clusterManager = new ClusterManager();