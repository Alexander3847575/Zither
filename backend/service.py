from models import Tab
from storage import InMemoryStorage
from embeddings import EmbeddingService
from clustering import TabClusterer, LLMClusterNamer
from typing import List, Dict, Any

def create_tabs_from_data(tab_data: list):
    """Create Tab objects from a list of dictionaries."""
    tabs = []
    for tab_item in tab_data:
        tab = Tab(
            id=tab_item['id'],
            name=tab_item['name']
        )
        tabs.append(tab)
    return tabs

def run_clustering_flow(api_input: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Runs the full clustering flow from API input to clustered JSON output.
    """
    # Initialize services
    storage = InMemoryStorage()
    embedding_service = EmbeddingService()
    clusterer = TabClusterer(min_cluster_size=2, min_samples=1, max_cluster_size=10)
    namer = LLMClusterNamer()

    # Create and store tabs
    tabs = create_tabs_from_data(api_input)
    for tab in tabs:
        storage.add_tab(tab)

    # Generate embeddings
    embeddings = embedding_service.embed_tabs_batch(tabs)
    for embedding in embeddings:
        storage.add_embedding(embedding)

    # Perform clustering
    clusters = clusterer.cluster_tabs(embeddings, storage)
    if not clusters:
        return []

    # Generate cluster names
    cluster_names = namer.name_clusters_batch(clusters, storage)

    # Apply names to clusters
    for cluster in clusters:
        cluster.name = cluster_names.get(cluster.id, f"Cluster {cluster.id}")
        storage.add_cluster(cluster)

    # Export results
    clusters_json = clusterer.export_clusters_to_json(clusters, storage)
    
    return clusters_json
