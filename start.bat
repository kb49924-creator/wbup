@echo off
chcp 65001 >nul
title Wildberries Channel Manager
cd /d "%~dp0"

echo ============================================
echo  Wildberries Channel Manager
echo ============================================
echo.

:: Проверяем наличие Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Python не найден. Установите Python 3.10+.
    pause
    exit /b 1
)

:: Проверяем наличие .env
if not exist ".env" (
    echo [ПРЕДУПРЕЖДЕНИЕ] Файл .env не найден!
    echo Копирую .env.example в .env...
    copy .env.example .env >nul
    echo.
    echo [ВАЖНО] Отредактируйте .env и укажите BOT_TOKEN.
    echo.
)

:: Проверяем установку Playwright
python -c "import playwright" >nul 2>&1
if %errorlevel% neq 0 (
    echo [УСТАНОВКА] Устанавливаю зависимости...
    pip install -r requirements.txt
    python -m playwright install chromium
    echo.
)

echo [ЗАПУСК] Запускаю бота...
echo.

python main.py

if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Бот завершился с ошибкой (код: %errorlevel%).
    pause
)