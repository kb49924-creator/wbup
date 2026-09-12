@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM WB Up Web GUI — Start Script (Windows) — FastAPI Edition
REM ============================================================

cd /d "%~dp0.."

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.10+
    pause
    exit /b 1
)

echo ========================================
echo   WB Up Web GUI Server (FastAPI)
echo ========================================
echo.

REM Install/check FastAPI dependencies
echo [INFO] Checking FastAPI / Uvicorn dependencies...
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing FastAPI and Uvicorn...
    pip install fastapi "uvicorn[standard]" pydantic
)

echo.

REM Parse port argument (default 8501)
set PORT=8501
if not "%~1"=="" set PORT=%~1

echo Port:     %PORT%
echo URL:      http://localhost:%PORT%
echo API Docs: http://localhost:%PORT%/docs
echo Press Ctrl+C to stop
echo.

REM Start server
start "" python web_gui/server.py %PORT%
timeout /t 2 >nul
start "" http://localhost:%PORT%

echo [OK] Server started and browser opened!