"""
Embedding generation service for tab titles and content.
"""

import numpy as np
from typing import List, Optional, Dict, Any
import google.generativeai as genai
from models import Tab, Embedding
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class EmbeddingService:
    """Service for generating embeddings from tab content."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the embedding service with Gemini.
        
        Args:
            api_key: Gemini API key (optional, will use GEMINI_API_KEY env var if not provided)
        """
        self.model_name = "gemini"
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        
        if not self.api_key:
            raise ValueError("Gemini API key not provided. Set GEMINI_API_KEY environment variable or pass api_key parameter.")
        
        genai.configure(api_key=self.api_key)
    
    def embed_texts_batch(self, texts: List[str], model: str = None) -> List[List[float]]:
        """
        Generate embeddings for a batch of texts using Gemini.
        
        Args:
            texts: List of texts to embed.
            model: Specific Gemini model to use (optional, defaults to text-embedding-004).
            
        Returns:
            List of float value lists representing the embeddings.
        """
        model = model or "models/text-embedding-004"
        
        try:
            result = genai.embed_content(
                model=model,
                content=texts,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            raise RuntimeError(f"Gemini batch embedding failed: {e}")
    
    def embed_tabs_batch(self, tabs: List[Tab], model: str = None, batch_size: int = 100) -> List[Embedding]:
        """
        Generate embeddings for multiple tabs in batches using Gemini.
        
        Args:
            tabs: List of Tab objects.
            model: Specific Gemini model to use (optional, defaults to text-embedding-004).
            batch_size: Number of tabs to process in each batch (max 100 for Gemini).
            
        Returns:
            List of Embedding objects.
        """
        embeddings = []
        
        for i in range(0, len(tabs), batch_size):
            batch_tabs = tabs[i:i + batch_size]
            
            texts_to_embed = [tab.name for tab in batch_tabs]

            try:
                batch_vectors = self.embed_texts_batch(texts_to_embed, model)
                
                for tab, vector, text in zip(batch_tabs, batch_vectors, texts_to_embed):
                    embeddings.append(Embedding(
                        tab_id=tab.id,
                        vector=vector,
                        model_name=model or "text-embedding-004",
                        metadata={
                            'text_used': text,
                            'tab_name': tab.name
                        }
                    ))
            except Exception as e:
                print(f"Failed to embed batch starting at index {i}: {e}")

        print(f"Successfully embedded {len(embeddings)}/{len(tabs)} tabs")
        
        return embeddings
