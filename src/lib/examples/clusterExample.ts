/**
 * Cluster Manager Usage Example
 * 
 * This file demonstrates how to use the clusterManager to create,
 * manage, and color clusters of panes.
 */

import { clusterManager } from '$lib/framework/clusterManager.svelte.js';
import { storageManager } from '$lib/framework/storageManager.js';

// Example: Create a cluster with some panes
export function createExampleCluster() {
    // First, let's get some existing panes from storage
    const allChunks = storageManager.getAllChunksArray();
    const allPanes = allChunks.flatMap(chunk => chunk.panes);
    
    if (allPanes.length === 0) {
        console.log('No panes found in storage. Create some panes first.');
        return;
    }
    
    // Take the first 3 panes as an example
    const paneIds = allPanes.slice(0, 3).map(pane => pane.uuid);
    
    // Create a cluster with a custom color
    const cluster = clusterManager.createCluster(
        'Example Cluster',
        paneIds,
        [255, 0, 0, 255] // Red color
    );
    
    console.log('Created cluster:', cluster);
    return cluster;
}

// Example: Create clusters from Python API results
export function createClustersFromAPI() {
    // Simulate Python API response
    const mockAPIResponse = [
        {
            id: 'cluster_1',
            name: 'Work Documents',
            tabs: [
                { id: 'pane_1', name: 'Document 1' },
                { id: 'pane_2', name: 'Document 2' }
            ]
        },
        {
            id: 'cluster_2', 
            name: 'Research',
            tabs: [
                { id: 'pane_3', name: 'Research Paper' },
                { id: 'pane_4', name: 'Notes' }
            ]
        }
    ];
    
    const clusters = clusterManager.createClustersFromAPI(mockAPIResponse);
    console.log('Created clusters from API:', clusters);
    return clusters;
}

// Example: Update cluster properties
export function updateClusterExample(clusterId: string) {
    // Update the cluster label
    clusterManager.updateClusterLabel(clusterId, 'Updated Cluster Name');
    
    // Change the cluster color to blue
    clusterManager.setClusterColor(clusterId, [0, 0, 255, 255]);
    
    console.log('Updated cluster:', clusterManager.getCluster(clusterId));
}

// Example: Add more panes to a cluster
export function addPanesToClusterExample(clusterId: string) {
    const allChunks = storageManager.getAllChunksArray();
    const allPanes = allChunks.flatMap(chunk => chunk.panes);
    
    // Add a few more panes to the cluster
    const newPaneIds = allPanes.slice(3, 5).map(pane => pane.uuid);
    clusterManager.addPanesToCluster(clusterId, newPaneIds);
    
    console.log('Added panes to cluster:', clusterManager.getCluster(clusterId));
}

// Example: Get cluster statistics
export function getClusterStats() {
    const stats = clusterManager.getStats();
    console.log('Cluster Statistics:', stats);
    return stats;
}

// Example: Listen for cluster changes
export function setupClusterListeners() {
    window.addEventListener('cluster-changed', (event: CustomEvent) => {
        console.log('Cluster changed:', event.detail);
        
        switch (event.detail.action) {
            case 'save':
                console.log('Cluster saved:', event.detail.cluster);
                break;
            case 'update':
                console.log('Cluster updated:', event.detail.cluster);
                break;
            case 'delete':
                console.log('Cluster deleted:', event.detail.clusterId);
                break;
            case 'clear':
                console.log('All clusters cleared');
                break;
            case 'reset-colors':
                console.log('Pane colors reset for:', event.detail.paneIds);
                break;
        }
    });
}

// Example: Get all clusters and their panes
export function getAllClustersWithPanes() {
    const clusters = clusterManager.getAllClusters();
    
    clusters.forEach(cluster => {
        const panes = clusterManager.getPanesInCluster(cluster.id);
        console.log(`Cluster "${cluster.label}" contains ${panes.length} panes:`, panes);
    });
    
    return clusters;
}
