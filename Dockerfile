# syntax=docker/dockerfile:1
FROM python:3.14-slim-bookworm

# ============================================
# 1. Системные зависимости для Playwright
# ============================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Playwright (Chromium) dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    # Утилиты
    curl \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# 2. Рабочая директория
# ============================================
WORKDIR /app

# ============================================
# 3. Установка Python-зависимостей
# ============================================
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Устанавливаем Chromium для Playwright
RUN playwright install chromium
RUN playwright install-deps chromium

# ============================================
# 4. Копируем проект
# ============================================
COPY . .

# ============================================
# 5. Создаём volume для данных
# ============================================
VOLUME ["/app/data"]

# ============================================
# 6. Запуск через главный entry point
# ============================================
CMD ["python", "main.py"]