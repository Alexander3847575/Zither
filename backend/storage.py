"""
In-memory storage system for tabs, clusters, and embeddings.
"""

from typing import Dict, List, Optional, Any
import json
from datetime import datetime
from models import Tab, Cluster, Embedding


class InMemoryStorage:
    """Simple in-memory storage for development and testing."""
    
    def __init__(self):
        self.tabs: Dict[str, Tab] = {}
        self.clusters: Dict[str, Cluster] = {}
        self.embeddings: Dict[str, Embedding] = {}
        self._next_cluster_id = 1
    
    # Tab operations
    def add_tab(self, tab: Tab) -> str:
        """Add a tab to storage."""
        self.tabs[tab.id] = tab
        return tab.id
    
    def get_tab(self, tab_id: str) -> Optional[Tab]:
        """Get a tab by ID."""
        return self.tabs.get(tab_id)
    
    def get_all_tabs(self) -> List[Tab]:
        """Get all tabs."""
        return list(self.tabs.values())
    
    # Cluster operations
    def add_cluster(self, cluster: Cluster) -> str:
        """Add a cluster to storage."""
        if not cluster.id:
            cluster.id = f"cluster_{self._next_cluster_id}"
            self._next_cluster_id += 1
        self.clusters[cluster.id] = cluster
        return cluster.id
    
    def get_cluster(self, cluster_id: str) -> Optional[Cluster]:
        """Get a cluster by ID."""
        return self.clusters.get(cluster_id)
    
    def get_all_clusters(self) -> List[Cluster]:
        """Get all clusters."""
        return list(self.clusters.values())
    
    # Embedding operations
    def add_embedding(self, embedding: Embedding) -> str:
        """Add an embedding to storage."""
        self.embeddings[embedding.tab_id] = embedding
        return embedding.tab_id
    
    def get_embedding(self, tab_id: str) -> Optional[Embedding]:
        """Get an embedding by tab ID."""
        return self.embeddings.get(tab_id)
    
    def get_all_embeddings(self) -> List[Embedding]:
        """Get all embeddings."""
        return list(self.embeddings.values())
    
    # Utility methods
    def get_tabs_by_cluster(self, cluster_id: str) -> List[Tab]:
        """Get all tabs belonging to a specific cluster."""
        cluster = self.get_cluster(cluster_id)
        if not cluster:
            return []
        
        tabs = []
        for tab_id in cluster.tab_ids:
            tab = self.get_tab(tab_id)
            if tab:
                tabs.append(tab)
        return tabs
    
    def clear_all(self):
        """Clear all stored data."""
        self.tabs.clear()
        self.clusters.clear()
        self.embeddings.clear()
        self._next_cluster_id = 1
