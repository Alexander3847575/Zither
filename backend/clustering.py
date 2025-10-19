"""
HDBSCAN clustering implementation for tab clustering system.
"""

import numpy as np
import hdbscan
from typing import List, Dict, Tuple, Optional, Any
from sklearn.metrics.pairwise import cosine_similarity
from models import Tab, Cluster, Embedding
from storage import InMemoryStorage
import json
from datetime import datetime
import warnings

# Suppress sklearn deprecation warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="sklearn")


class TabClusterer:
    """HDBSCAN-based clustering system for tabs."""
    
    def __init__(self, min_cluster_size: int = 2, min_samples: int = 1, max_cluster_size: int = 10):
        """
        Initialize the clusterer with optimized parameters for real embeddings.
        
        Args:
            min_cluster_size: Minimum size of clusters (HDBSCAN parameter)
            min_samples: Minimum samples in neighborhood (HDBSCAN parameter)
            max_cluster_size: Maximum size of clusters (post-processing limit)
        """
        self.min_cluster_size = min_cluster_size
        self.min_samples = min_samples
        self.max_cluster_size = max_cluster_size
        self.clusterer = None
        self.cluster_labels = None
        self.cluster_centroids = {}
        self._next_cluster_id = 0
    
    def cluster_tabs(self, embeddings: List[Embedding], storage: InMemoryStorage) -> List[Cluster]:
        """
        Cluster tabs using HDBSCAN.
        
        Args:
            embeddings: List of embeddings to cluster
            storage: Storage system containing tab data
            
        Returns:
            List of Cluster objects
        """
        if not embeddings:
            return []
        
        # Extract vectors and tab IDs
        vectors = np.array([emb.vector for emb in embeddings])
        tab_ids = [emb.tab_id for emb in embeddings]
        
        # Normalize vectors for cosine similarity (euclidean distance on normalized vectors = cosine distance)
        vectors_normalized = vectors / np.linalg.norm(vectors, axis=1, keepdims=True)
        
        # Initialize and fit HDBSCAN with balanced parameters
        self.clusterer = hdbscan.HDBSCAN(
            min_cluster_size=self.min_cluster_size,
            min_samples=self.min_samples,
            metric='euclidean',
            cluster_selection_epsilon=0.05,  # Balanced clustering - not too strict, not too lenient
            cluster_selection_method='eom'  # EOM method for better cluster selection
        )
        
        self.cluster_labels = self.clusterer.fit_predict(vectors_normalized)
        
        # Check if we found any clusters
        unique_labels = set(self.cluster_labels)
        if -1 in unique_labels:
            unique_labels.remove(-1)  # Remove noise label
        
        if not unique_labels:
            # Fallback: try with even more lenient parameters
            print("No clusters found with current parameters, trying fallback...")
            return self._fallback_clustering(vectors_normalized, tab_ids, embeddings, storage)
        
        # Apply noise reassignment hack
        self.cluster_labels = self._reassign_noise_points(vectors_normalized, self.cluster_labels)
        
        # Create clusters
        clusters = self._create_clusters_from_labels(embeddings, tab_ids, storage)
        
        # Apply cluster size limit - split oversized clusters
        clusters = self._apply_cluster_size_limit(clusters, vectors_normalized, tab_ids, storage)
        
        # Calculate centroids for each cluster
        self._calculate_cluster_centroids(vectors_normalized, tab_ids, clusters)
        
        return clusters
    
    def _apply_cluster_size_limit(self, clusters: List[Cluster], vectors: np.ndarray, 
                                 tab_ids: List[str], storage: InMemoryStorage) -> List[Cluster]:
        """
        Split clusters that exceed the maximum size limit.
        
        Args:
            clusters: List of clusters to process
            vectors: Normalized embedding vectors
            tab_ids: List of tab IDs corresponding to vectors
            storage: Storage system
            
        Returns:
            List of clusters with size limits applied
        """
        final_clusters = []
        
        for cluster in clusters:
            if cluster.size() <= self.max_cluster_size:
                # Cluster is within size limit, keep as is
                final_clusters.append(cluster)
            else:
                # Cluster is too large, split it
                print(f"Splitting oversized cluster '{cluster.name}' ({cluster.size()} tabs)")
                split_clusters = self._split_cluster(cluster, vectors, tab_ids, storage)
                final_clusters.extend(split_clusters)
        
        return final_clusters
    
    def _split_cluster(self, cluster: Cluster, vectors: np.ndarray, tab_ids: List[str], 
                      storage: InMemoryStorage) -> List[Cluster]:
        """
        Split a large cluster into smaller sub-clusters.
        
        Args:
            cluster: Cluster to split
            vectors: Normalized embedding vectors
            tab_ids: List of tab IDs corresponding to vectors
            storage: Storage system
            
        Returns:
            List of smaller clusters
        """
        # Get indices of tabs in this cluster
        cluster_indices = [i for i, tab_id in enumerate(tab_ids) if tab_id in cluster.tab_ids]
        
        if len(cluster_indices) <= self.max_cluster_size:
            return [cluster]
        
        # Extract vectors for this cluster
        cluster_vectors = vectors[cluster_indices]
        cluster_tab_ids = [tab_ids[i] for i in cluster_indices]
        
        # Use K-means to split the cluster
        from sklearn.cluster import KMeans
        
        # Determine number of sub-clusters needed
        n_subclusters = max(2, (len(cluster_indices) + self.max_cluster_size - 1) // self.max_cluster_size)
        
        try:
            kmeans = KMeans(n_clusters=n_subclusters, random_state=42, n_init=10)
            sub_labels = kmeans.fit_predict(cluster_vectors)
            
            # Create sub-clusters
            sub_clusters = []
            for i in range(n_subclusters):
                sub_cluster_tab_ids = [cluster_tab_ids[j] for j in range(len(cluster_tab_ids)) 
                                     if sub_labels[j] == i]
                
                if len(sub_cluster_tab_ids) >= self.min_cluster_size:
                    sub_cluster = Cluster(
                        id=f"cluster_{self._next_cluster_id}",
                        name=f"Cluster {self._next_cluster_id}",
                        tab_ids=sub_cluster_tab_ids,
                        metadata={
                            'parent_cluster': cluster.id,
                            'split_method': 'kmeans',
                            'size': len(sub_cluster_tab_ids),
                            'created_at': datetime.now().isoformat()
                        }
                    )
                    self._next_cluster_id += 1
                    sub_clusters.append(sub_cluster)
            
            if sub_clusters:
                print(f"  Split into {len(sub_clusters)} sub-clusters")
                return sub_clusters
            else:
                # If splitting failed, return original cluster
                return [cluster]
                
        except Exception as e:
            print(f"  Failed to split cluster: {e}")
            return [cluster]
    
    def _fallback_clustering(self, vectors_normalized: np.ndarray, tab_ids: List[str], 
                           embeddings: List[Embedding], storage: InMemoryStorage) -> List[Cluster]:
        """Fallback clustering using K-means when HDBSCAN fails."""
        from sklearn.cluster import KMeans
        
        # Try different numbers of clusters
        for n_clusters in [2, 3, 4, 5]:
            try:
                kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
                labels = kmeans.fit_predict(vectors_normalized)
                
                # Create clusters from K-means labels
                clusters = []
                for i in range(n_clusters):
                    cluster_tab_ids = [tab_ids[j] for j in range(len(tab_ids)) if labels[j] == i]
                    if len(cluster_tab_ids) >= 2:  # Only create clusters with at least 2 tabs
                        cluster = Cluster(
                            id=f"cluster_{self._next_cluster_id}",
                            name=f"Cluster {self._next_cluster_id}",
                            tab_ids=cluster_tab_ids,
                            metadata={
                                'method': 'kmeans_fallback',
                                'n_clusters': n_clusters,
                                'size': len(cluster_tab_ids)
                            }
                        )
                        self._next_cluster_id += 1
                        clusters.append(cluster)
                
                if clusters:
                    print(f"Fallback clustering found {len(clusters)} clusters using K-means")
                    # Calculate centroids
                    self._calculate_cluster_centroids(vectors_normalized, tab_ids, clusters)
                    return clusters
                    
            except Exception as e:
                print(f"K-means with {n_clusters} clusters failed: {e}")
                continue
        
        print("All clustering methods failed")
        return []
    
    def _reassign_noise_points(self, vectors: np.ndarray, labels: np.ndarray, similarity_threshold: float = 0.6) -> np.ndarray:
        """
        Reassign noise points to nearest clusters if similarity is above threshold.
        
        Args:
            vectors: Normalized embedding vectors
            labels: Current cluster labels (-1 for noise)
            similarity_threshold: Minimum cosine similarity to reassign
            
        Returns:
            Updated labels with reassigned noise points
        """
        noise_mask = labels == -1
        if not noise_mask.any():
            return labels
        
        from sklearn.metrics.pairwise import cosine_similarity
        
        # Get noise and clustered embeddings
        noise_embeddings = vectors[noise_mask]
        cluster_embeddings = vectors[~noise_mask]
        cluster_labels = labels[~noise_mask]
        
        # Calculate similarities between noise points and clustered points
        similarities = cosine_similarity(noise_embeddings, cluster_embeddings)
        
        # Create new labels array
        new_labels = labels.copy()
        reassigned_count = 0
        
        # Reassign each noise point to its most similar cluster
        for i, noise_idx in enumerate(np.where(noise_mask)[0]):
            max_sim_idx = np.argmax(similarities[i])
            max_similarity = similarities[i][max_sim_idx]
            
            if max_similarity > similarity_threshold:
                new_labels[noise_idx] = cluster_labels[max_sim_idx]
                reassigned_count += 1
        
        print(f"Reassigned {reassigned_count}/{noise_mask.sum()} noise points to nearest clusters")
        return new_labels
    
    def _create_clusters_from_labels(self, 
                                   embeddings: List[Embedding], 
                                   tab_ids: List[str], 
                                   storage: InMemoryStorage) -> List[Cluster]:
        """Create Cluster objects from HDBSCAN labels."""
        clusters = []
        unique_labels = set(self.cluster_labels)
        
        # Remove noise label (-1) if present
        if -1 in unique_labels:
            unique_labels.remove(-1)
        
        for label in unique_labels:
            # Get tab IDs for this cluster
            cluster_tab_ids = [tab_ids[i] for i, cluster_label in enumerate(self.cluster_labels) 
                             if cluster_label == label]
            
            # Get tabs for this cluster
            cluster_tabs = [storage.get_tab(tab_id) for tab_id in cluster_tab_ids]
            cluster_tabs = [tab for tab in cluster_tabs if tab is not None]
            
            if not cluster_tabs:
                continue
            
            # Create cluster
            cluster = Cluster(
                id=f"cluster_{self._next_cluster_id}",
                name=f"Cluster {self._next_cluster_id}",  # Will be renamed by LLM later
                tab_ids=cluster_tab_ids,
                metadata={
                    'hdbscan_label': int(label),
                    'size': len(cluster_tab_ids),
                    'created_at': datetime.now().isoformat()
                }
            )
            self._next_cluster_id += 1
            clusters.append(cluster)
        
        return clusters
    
    def _calculate_cluster_centroids(self, 
                                   vectors: np.ndarray, 
                                   tab_ids: List[str], 
                                   clusters: List[Cluster]):
        """Calculate centroid for each cluster."""
        for cluster in clusters:
            # Get indices of tabs in this cluster
            cluster_indices = [i for i, tab_id in enumerate(tab_ids) 
                             if tab_id in cluster.tab_ids]
            
            if not cluster_indices:
                continue
            
            # Calculate centroid
            cluster_vectors = vectors[cluster_indices]
            centroid = np.mean(cluster_vectors, axis=0)
            
            # Store centroid in cluster
            cluster.centroid_embedding = centroid.tolist()
            self.cluster_centroids[cluster.id] = centroid
    
    def export_clusters_to_json(self, 
                              clusters: List[Cluster], 
                              storage: InMemoryStorage) -> List[Dict[str, Any]]:
        """
        Export clusters to a list of dictionaries.
        
        Args:
            clusters: List of clusters to export
            storage: Storage system containing tab data
            
        Returns:
            A list of dictionaries, where each dictionary represents a cluster.
        """
        result = []
        for cluster in clusters:
            # Get tabs for this cluster
            cluster_tabs = [storage.get_tab(tab_id) for tab_id in cluster.tab_ids]
            cluster_tabs = [tab for tab in cluster_tabs if tab is not None]
            
            result.append({
                "id": cluster.id,
                "name": cluster.name,
                "tabs": [tab.to_dict() for tab in cluster_tabs]
            })
            
        return result


class LLMClusterNamer:
    """LLM-powered cluster naming and summarization."""
    
    def __init__(self, api_key: str = None):
        """
        Initialize the LLM namer.
        
        Args:
            api_key: API key for the LLM service (optional, will use env var)
        """
        self.api_key = api_key
        self.model_name = "gemini"  # Default to Gemini
    
    def name_clusters_batch(self, 
                           clusters: List[Cluster], 
                           storage: InMemoryStorage) -> Dict[str, str]:
        """
        Generate names for all clusters using a single Gemini API call.
        
        Args:
            clusters: List of clusters to name
            storage: Storage system
            
        Returns:
            Dictionary mapping cluster_id to cluster_name
        """
        if not clusters:
            return {}
        
        # Prepare cluster data for batch processing
        cluster_data = []
        for i, cluster in enumerate(clusters):
            # Get all tab titles in the cluster
            all_tabs = [storage.get_tab(tab_id) for tab_id in cluster.tab_ids]
            all_tabs = [tab for tab in all_tabs if tab is not None]
            all_titles = [tab.name for tab in all_tabs]
            
            cluster_data.append({
                "cluster_id": cluster.id,
                "tabs": all_titles
            })
        
        # Use Gemini to generate all cluster names in one call
        cluster_names = self._gemini_batch_cluster_naming(cluster_data)
        
        # Associate names with cluster IDs based on order
        return {cluster.id: name for cluster, name in zip(clusters, cluster_names)}
    
    def _gemini_batch_cluster_naming(self, cluster_data: List[Dict]) -> List[str]:
        """
        Generate names for all clusters using a single Gemini API call.
        
        Args:
            cluster_data: List of cluster data with cluster_id and tabs
            
        Returns:
            List of cluster names in the same order as the input.
        """
        from google import genai
        from pydantic import BaseModel, RootModel
        from typing import List as TypingList
        import os
        
        # Define Pydantic model for batch response
        class BatchClusterNames(RootModel[TypingList[str]]):
            root: TypingList[str]
        
        # Configure Gemini client
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found")
        
        client = genai.Client(api_key=api_key)
        
        # Create batch prompt
        prompt_parts = ["Analyze these browser tab clusters and suggest a 2-3 word category name for each cluster that best describes their common theme:\n"]
        
        for i, cluster in enumerate(cluster_data, 1):
            prompt_parts.append(f"Cluster {i}:")
            for tab in cluster['tabs']:
                prompt_parts.append(f"  - {tab}")
            prompt_parts.append("")
        
        prompt_parts.extend([
            "Examples of good category names: \"AI Tools\", \"Web Development\", \"News & Media\", \"Productivity Apps\", \"Travel & Weather\", \"Shopping & Finance\", \"Sports\", \"Entertainment\", \"Education\", \"Programming & Tech\"",
            "",
            "Return a JSON array of strings, with each string being a cluster name. Ensure the order of names matches the order of clusters in the prompt."
        ])
        
        prompt = "\n".join(prompt_parts)
        
        # Generate response with Pydantic schema enforcement
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": BatchClusterNames,
            },
        )
        
        # Parse the response using Pydantic
        batch_response: BatchClusterNames = response.parsed
        
        # Return the list of names
        return [name.strip() for name in batch_response.root]

