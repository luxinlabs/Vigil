#!/bin/bash

set -e

echo "🚀 Starting Vigil — AI Stack Security Platform"
echo ""

# Kill any existing processes on ports 8000 and 5173
echo "📦 Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

# Build mock packages
echo "🔨 Building mock wheel packages..."
python3 build_mock_packages.py
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
pip3 install -r backend/requirements.txt -q
echo "✓ Backend dependencies installed"
echo ""

# Start backend
echo "🔧 Starting backend server..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 > /dev/null 2>&1 &
BACKEND_PID=$!
cd ..
echo "✓ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✓ Backend is ready"
        break
    fi
    sleep 1
done

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install --silent > /dev/null 2>&1
echo "✓ Frontend dependencies installed"

# Start frontend
echo "🎨 Starting frontend..."
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..
echo "✓ Frontend started (PID: $FRONTEND_PID)"

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "✓ Frontend is ready"
        break
    fi
    sleep 1
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅  Vigil is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "👁  Dashboard: http://localhost:5173"
echo "🔌 API:       http://localhost:8000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 DEMO INSTRUCTIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Open the dashboard in your browser, then run these commands:"
echo ""
echo "  Act 1 — The Attack (without Vigil):"
echo "    python3 vigil_cli.py demo attack"
echo ""
echo "  Act 2 — Vigil Blocks the Attack:"
echo "    python3 vigil_cli.py demo block"
echo ""
echo "  Act 3 — AlignGuard Catches Prompt Injection:"
echo "    python3 vigil_cli.py demo inject"
echo ""
echo "  Or scan any package:"
echo "    python3 vigil_cli.py scan <package-name>"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Open browser (macOS)
if command -v open &> /dev/null; then
    sleep 2
    open http://localhost:5173
fi

# Keep script running
echo "Press Ctrl+C to stop all services"
echo ""

# Trap to cleanup on exit
trap "echo ''; echo '🛑 Stopping Vigil...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait indefinitely
wait
