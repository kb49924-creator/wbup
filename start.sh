#!/usr/bin/env bash
# Wildberries Channel Manager — запуск на Linux/macOS
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo " Wildberries Channel Manager"
echo "============================================"
echo ""

# Проверяем наличие Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 not found. Install Python 3.10+."
    exit 1
fi

# Проверяем наличие .env
if [ ! -f ".env" ]; then
    echo "[WARNING] .env file not found!"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo ""
    echo "[IMPORTANT] Edit .env and set BOT_TOKEN."
    echo ""
fi

# Проверяем установку Playwright
if ! python3 -c "import playwright" 2>/dev/null; then
    echo "[INSTALL] Installing dependencies..."
    pip3 install -r requirements.txt
    python3 -m playwright install chromium
    echo ""
fi

echo "[START] Launching bot..."
echo ""
python3 main.py