#!/bin/bash
# ============================================================
# WB Up Web GUI — Convenient Start Script (Linux/Mac)
# ============================================================

cd "$(dirname "$0")/.."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 not found! Please install Python 3.8+"
    exit 1
fi

echo "========================================"
echo "  WB Up Web GUI Server"
echo "========================================"
echo ""

# Parse port argument (default 8501)
PORT="${1:-8501}"

echo "Port: $PORT"
echo "URL: http://localhost:$PORT"
echo "Press Ctrl+C to stop"
echo ""

# Start server in background
python3 web_gui/server.py "$PORT" &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$PORT"
elif command -v open &> /dev/null; then
    open "http://localhost:$PORT"
fi

echo "[OK] Server started and browser opened!"
echo "Server PID: $SERVER_PID"

# Wait for server process
wait $SERVER_PID