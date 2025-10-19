# Clustering API Backend

This is the Python API backend for the Zither tab clustering application.

## Environment Variables

You need to set the following environment variable in Vercel:

- `GEMINI_API_KEY`: Your Google Gemini API key

## Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variable:
```bash
export GEMINI_API_KEY=your_api_key_here
```

3. Run the API:
```bash
uvicorn api:app --reload
```

## Deployment

This API is deployed to Vercel and automatically handles CORS for the Electron app.