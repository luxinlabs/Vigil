# 🚀 Vigil Quick Start Guide

## Installation (First Time Only)

```bash
# Install CLI dependencies
pip3 install -r requirements.txt

# Build mock packages
python3 build_mock_packages.py
```

## Running the Demo

```bash
# Start everything (backend + frontend)
./demo.sh
```

The dashboard will open automatically at http://localhost:5173

## Demo Commands

Open a **new terminal** and run:

### Act 1: The Attack (Without Vigil)
```bash
python3 vigil_cli.py demo attack
```
Watch credentials get stolen in real-time.

### Act 2: Vigil Blocks It
```bash
python3 vigil_cli.py demo block
```
Vigil detects and blocks the malicious package.

### Act 3: Prompt Injection Detection
```bash
python3 vigil_cli.py demo inject
```
AlignGuard catches hidden injection attempts.

## Manual Scanning

```bash
# Scan specific packages
python3 vigil_cli.py scan mock-litellm==1.82.7
python3 vigil_cli.py scan mock-requests==2.31.0
python3 vigil_cli.py scan mock-cursor-plugin==1.0.0

# Watch mode
python3 vigil_cli.py watch
```

## Stopping

Press `Ctrl+C` in the terminal running `./demo.sh`

## Troubleshooting

**Port already in use?**
```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

**Frontend not loading?**
```bash
cd frontend
npm install
npm run dev
```

**Backend not responding?**
```bash
cd backend
pip3 install -r requirements.txt
uvicorn main:app --reload
```

## Project Structure

```
vigil/
├── backend/              # FastAPI server
│   ├── main.py          # API endpoints + WebSocket
│   ├── scanner.py       # Behavioral analysis engine
│   └── requirements.txt
├── frontend/            # React dashboard
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   └── package.json
├── mock_packages/       # Demo wheel files (created by build script)
├── vigil_cli.py        # Terminal CLI tool
├── demo.sh             # One-click launcher
└── README.md           # Full documentation
```

## Key Features to Demo

1. **Real-time Dashboard** - Shows all scans as they happen
2. **Threat Scoring** - 0.0 to 1.0 behavioral risk score
3. **Detailed Findings** - Code snippets, file locations, explanations
4. **WebSocket Updates** - Instant notifications
5. **Two Security Modules** - Supply chain + agent alignment
6. **CLI Integration** - Terminal-based scanning

## For Judges

- This catches the **real LiteLLM attack** that happened March 24, 2026
- Traditional tools (Snyk, Socket) **failed** to detect it
- Vigil uses **behavioral analysis**, not CVE databases
- **Zero-day detection** through pattern recognition
- Combines **supply chain + AI agent security** (unique)

👁 **Always watching.**
