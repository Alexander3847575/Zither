from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from service import run_clustering_flow
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Check for Gemini API key on startup."""
    if not os.getenv("GEMINI_API_KEY"):
        raise RuntimeError("GEMINI_API_KEY not found. Please set it in your .env file.")
    yield
    # No shutdown logic needed

# Initialize FastAPI app
app = FastAPI(
    title="Tab Clustering API",
    description="An API for clustering browser tabs using embeddings and generative AI.",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for Request and Response ---

class TabInput(BaseModel):
    id: str
    name: str

class ClusterOutput(BaseModel):
    id: str
    name: str
    tabs: List[TabInput]

# --- API Endpoints ---

@app.post("/cluster", response_model=List[ClusterOutput])
async def cluster_tabs(tabs: List[TabInput]):
    """
    Receives a list of tabs, performs clustering, and returns the results.
    """
    try:
        # Convert Pydantic models to dictionaries for the service layer
        tabs_data = [tab.dict() for tab in tabs]
        
        # Run the clustering flow
        clustered_data = run_clustering_flow(tabs_data)

        # Debug log: echo back clusters and labels
        try:
            print("[API] /cluster result:")
            for c in clustered_data:
                names = ", ".join([t.get('name', '') for t in c.get('tabs', [])])
                print(f"  {c.get('id')} | {c.get('name')} -> [ {names} ]")
        except Exception:
            pass
        
        return clustered_data
    except Exception as e:
        # For any unexpected errors, return a generic 500 server error
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

# To run this API, use the command:
# uvicorn api:app --reload
