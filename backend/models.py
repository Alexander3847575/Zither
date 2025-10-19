"""
Data models for tab clustering system.
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime


@dataclass
class Tab:
    """Represents a browser tab with its metadata."""
    
    id: str
    name: str
    
    @classmethod
    def from_name(cls, name: str, **kwargs):
        """Create a Tab from just a name (for testing)."""
        tab_id = str(uuid.uuid4())
        
        return cls(
            id=tab_id,
            name=name,
            **kwargs
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert tab to dictionary for serialization."""
        return {
            'id': self.id,
            'name': self.name,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        """Create Tab from dictionary."""
        return cls(
            id=data['id'],
            name=data['name'],
        )


@dataclass
class Cluster:
    """Represents a cluster of related tabs."""
    
    id: str
    name: str
    description: Optional[str] = None
    tab_ids: List[str] = None
    centroid_embedding: Optional[List[float]] = None
    created_at: datetime = None
    last_updated: datetime = None
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.tab_ids is None:
            self.tab_ids = []
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.last_updated is None:
            self.last_updated = datetime.now()
        if self.metadata is None:
            self.metadata = {}
    
    def size(self) -> int:
        """Get the number of tabs in this cluster."""
        return len(self.tab_ids)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert cluster to dictionary for serialization."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'tab_ids': self.tab_ids,
            'centroid_embedding': self.centroid_embedding,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'metadata': self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        """Create Cluster from dictionary."""
        # Parse datetime strings
        created_at = None
        last_updated = None
        if data.get('created_at'):
            created_at = datetime.fromisoformat(data['created_at'])
        if data.get('last_updated'):
            last_updated = datetime.fromisoformat(data['last_updated'])
        
        return cls(
            id=data['id'],
            name=data['name'],
            description=data.get('description'),
            tab_ids=data.get('tab_ids', []),
            centroid_embedding=data.get('centroid_embedding'),
            created_at=created_at,
            last_updated=last_updated,
            metadata=data.get('metadata', {})
        )


@dataclass
class Embedding:
    """Represents an embedding vector for a tab."""
    
    tab_id: str
    vector: List[float]
    model_name: str
    created_at: datetime = None
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert embedding to dictionary for serialization."""
        return {
            'tab_id': self.tab_id,
            'vector': self.vector,
            'model_name': self.model_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'metadata': self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        """Create Embedding from dictionary."""
        created_at = None
        if data.get('created_at'):
            created_at = datetime.fromisoformat(data['created_at'])
        
        return cls(
            tab_id=data['tab_id'],
            vector=data['vector'],
            model_name=data['model_name'],
            created_at=created_at,
            metadata=data.get('metadata', {})
        )
