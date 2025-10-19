# Zither Tab Clustering API – Implementation Spec

This document describes the end-to-end clustering flow, the public API schema, dependencies, and non-functional requirements. It is intended for reuse by another LLM/agent to implement compatible clients or services.

## Overview

Given a set of panes (tabs), the backend:
- Generates embeddings for each tab name using Gemini embeddings
- Clusters via HDBSCAN
- Names clusters using an LLM
- Returns cluster assignments and labels

## Endpoint

- Method: POST
- Path: /cluster
- Base URL (local dev/Electron): http://localhost:8000
- CORS: Allow-all in development

## Request Schema

- Content-Type: application/json
- Body: Array<TabInput>

TabInput
- id: string (stable unique identifier for a pane)
- name: string (human-readable title; used for embedding)

Example
```json
[
  { "id": "pane-1", "name": "OpenAI Blog" },
  { "id": "pane-2", "name": "SvelteKit Docs" },
  { "id": "pane-3", "name": "HDBSCAN paper" }
]
```

## Response Schema

- 200 OK: Array<ClusterOutput>

ClusterOutput
- id: string (cluster identifier, e.g. "cluster_1")
- name: string (LLM-generated cluster label)
- tabs: Array<TabInput> (subset of input tabs in this cluster)

Example
```json
[
  {
    "id": "cluster_1",
    "name": "AI Research",
    "tabs": [{ "id": "pane-3", "name": "HDBSCAN paper" }]
  },
  {
    "id": "cluster_2",
    "name": "Web Dev",
    "tabs": [
      { "id": "pane-1", "name": "OpenAI Blog" },
      { "id": "pane-2", "name": "SvelteKit Docs" }
    ]
  }
]
```

## Processing Pipeline (Backend)

Entry: `POST /cluster` in `backend/api.py`

1) Validate and parse request
- Pydantic models: `TabInput`, `ClusterOutput`
- Convert to plain dicts for service layer

2) Clustering flow: `run_clustering_flow(api_input)` in `backend/service.py`
- Initialize services:
  - Storage: `InMemoryStorage`
  - Embeddings: `EmbeddingService` (Gemini)
  - Clusterer: `TabClusterer` (HDBSCAN; parameters: `min_cluster_size=2`, `min_samples=1`, `max_cluster_size=10`)
  - Namer: `LLMClusterNamer` (batch names via LLM)
- Create/store tabs
- Generate embeddings: `embed_tabs_batch(tabs)` using Gemini `models/text-embedding-004`
- Cluster embeddings -> clusters
- Name clusters (LLM) -> `clusterNames`
- Apply names, persist clusters
- Export clusters to JSON compatible with `ClusterOutput[]`

3) Error handling
- Unexpected exceptions return HTTP 500 with message

## Dependencies / Environment

Python backend (`backend/requirements.txt`)
- fastapi, uvicorn
- numpy, pandas, scikit-learn
- hdbscan
- faiss-cpu
- google-generativeai
- python-dotenv

Environment variables
- `GEMINI_API_KEY` (required) for embedding and cluster naming

Local run
```bash
uvicorn api:app --reload
```

## Client Integration (Svelte/Electron)

Trigger: Dock → World Map → "Auto Cluster"

Client steps (simplified):
1) Gather panes from storage: `storageManager.getAllChunksArray().flatMap(c => c.panes)`
2) Build request: `tabsPayload = panes.map(p => ({ id: p.uuid, name: p.paneType }))`
3) Call backend
   - Prefer Electron bridge `window.api.clusterTabs(tabsPayload)` if available
   - Else `fetch('http://localhost:8000/cluster', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(tabsPayload) })`
   - Use AbortController timeout (recommended 15s)
4) Apply results: `clusterManager.createClustersFromAPI(clustersJson)`
   - Colors panes per cluster and persists updated chunks

## Non-Functional

- Typical latency: ~4 seconds (depends on LLM/embedding throughput)
- Recommended client timeout: 10–20 seconds (current default: 15s)
- Idempotency: Sending same set of tabs may yield different cluster names due to LLM naming variance
- CORS: open in dev; ensure appropriate origins in production

## Failure Modes

- 400/422: Schema validation errors (malformed body)
- 401/403: Missing/invalid `GEMINI_API_KEY` (embedding init may fail)
- 500: Unexpected server error (embedding/LLM/clusterer failures)
- Network: Timeouts or connection refused (ensure backend started)

## Test Checklist

- Minimal input (1 tab) → may yield empty clusters depending on `min_cluster_size`
- Mixed topics (3–6 tabs) → should produce ≥1 clusters with names
- Non-ASCII names → embeddings and naming should work
- Large batches → ensure HDBSCAN parameters and max cluster size constraints are acceptable

## Contract Summary

- Input: Array of `{ id: string, name: string }`
- Output: Array of `{ id: string, name: string, tabs: Array<{ id: string, name: string }> }`
- Side effects: None on server beyond in-memory storage during request


