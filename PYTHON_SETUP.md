# Python Setup Guide

This app requires Python 3.8+ and some machine learning libraries to run the tab clustering features.

## Quick Setup

### 1. Install Python

**Windows:**
- Download Python from [python.org](https://www.python.org/downloads/)
- Run the installer and check "Add Python to PATH"
- Verify: Open Command Prompt and run `python --version`

**macOS:**
- Python is usually pre-installed
- If not: `brew install python3` or download from python.org
- Verify: Open Terminal and run `python3 --version`

**Linux:**
- Ubuntu/Debian: `sudo apt install python3 python3-pip`
- CentOS/RHEL: `sudo yum install python3 python3-pip`
- Verify: Run `python3 --version`

### 2. Install Dependencies

Open Terminal/Command Prompt in the `backend` folder and run:

```bash
pip install -r requirements.txt
```

Or if you need to use `pip3`:

```bash
pip3 install -r requirements.txt
```

### 3. Set Up API Key

Create a `.env` file in the `backend` folder:

```bash
# backend/.env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your free API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

### 4. Test the Setup

Run this command to test if everything works:

```bash
cd backend
python3 -m uvicorn api:app --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Started server process
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Troubleshooting

**"Python not found"**
- Make sure Python is installed and in your PATH
- Try `python3` instead of `python`

**"Module not found" errors**
- Run `pip install -r requirements.txt` in the backend folder
- Make sure you're in the correct directory

**"GEMINI_API_KEY not found"**
- Create the `.env` file with your API key
- Make sure the file is in the `backend` folder

**Port 8000 already in use**
- The Python API is already running
- Close other applications using port 8000
- Or restart your computer

## What This Does

The Python API provides intelligent tab clustering using:
- **Google Gemini AI** for understanding tab content
- **Machine Learning** for grouping similar tabs
- **FastAPI** for the web interface

Once set up, the Electron app will automatically start the Python API when needed.
