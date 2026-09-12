# Wildberries Channel Manager

Telegram-бот для мониторинга новых товаров Wildberries,
автоматического отбора лучших и публикации в Telegram-канал.
Веб-интерфейс для управления через браузер.

---

## Возможности

- **Мониторинг каталогов продавцов** — отслеживает появление новых товаров у указанных продавцов
- **Умный отбор** — выбирает лучшие товары по рейтингу, отзывам, цене и скидке
- **Автоматическая публикация** — создаёт посты с карточками-коллажами (rembg + шаблон)
- **Планировщик** — автоматическая проверка новинок по расписанию
- **Управление через Telegram** — добавление/удаление продавцов, настройки
- **Веб-интерфейс** — дашборд, сбор фото, разметка данных для ML
- **Обработка изображений** — скачивание фото (wbbasket.ru + Playwright fallback), удаление фона (rembg), ранжирование

---

## Быстрый старт

### 1. Установка

```bash
# Установите зависимости
pip install -r requirements.txt

# Установите Chromium для Playwright
playwright install chromium
playwright install-deps chromium   # Linux
```

### 2. Настройка

```bash
# Создайте файл .env из примера
cp .env.example .env

# Отредактируйте .env:
#   BOT_TOKEN=ваш_токен_от_BotFather
#   CHANNEL_USERNAME=@ваш_канал
#   PROXY=socks5://user:pass@host:port  # опционально, для *.wbbasket.ru
```

### 3. Запуск

```bash
# Telegram-бот
python main.py

# Веб-интерфейс
cd web_gui && python server.py

# Windows
start.bat

# Linux/macOS
./start.sh
```

### 4. Docker

```bash
docker-compose up -d
```

---

## Структура проекта

```
├── main.py                         # Точка входа для Telegram-бота
├── start.bat / start.sh            # Скрипты запуска
├── Dockerfile / docker-compose.yml # Docker-развёртка
├── requirements.txt                # Зависимости
├── .env.example / .env             # Конфигурация
│
├── src/                            # Исходный код
│   ├── config/                     # Глобальные настройки
│   │   ├── __init__.py             # .env, пути, прокси
│   │   └── sellers.py              # Управление продавцами из БД
│   │
│   ├── telegram/                   # Telegram Bot
│   │   ├── bot.py                  # Инициализация python-telegram-bot
│   │   ├── handlers.py             # Обработчики команд и callback'ов
│   │   ├── menus.py                # Клавиатуры и меню
│   │   └── publisher.py            # Публикация постов с фото
│   │
│   ├── wb/                         # Wildberries API
│   │   ├── client.py               # WBClient (сессия + API + каталог)
│   │   ├── session.py              # Playwright-сессия с SOCKS5-прокси
│   │   ├── catalog_fetcher.py      # Requests → Playwright fallback
│   │   ├── catalog.py              # Парсинг каталога
│   │   ├── product_api.py          # Карточка товара
│   │   ├── models.py               # Product
│   │   ├── image_finder.py         # Поиск фото через wbbasket.ru
│   │   ├── photo_ranker.py         # Ранжирование фото
│   │   ├── monitor.py              # Мониторинг изменений
│   │   ├── browser_catalog.py      # Playwright-каталог (legacy)
│   │   ├── category.py             # Категория товара
│   │   ├── dns_resolver.py         # DNS для wbbasket.ru (Windows)
│   │   └── wb_http_client.py       # HTTP-клиент (без браузера)
│   │
│   ├── engine/                     # Бизнес-логика
│   │   ├── engine.py               # Engine — обход продавцов
│   │   ├── selector.py             # Отбор товаров
│   │   ├── cache_check.py          # Кэш проверок (SQLite, TTL=1ч)
│   │   ├── checked.py              # Проверенные артикулы
│   │   ├── blacklist.py            # Чёрный список
│   │   ├── scheduler.py            # Планировщик
│   │   └── seller_manager.py       # Добавление продавца по ссылке
│   │
│   ├── image/                      # Обработка изображений
│   │   ├── renderer.py             # Оркестратор: скачивание → rembg → шаблон
│   │   ├── background_remover.py   # Удаление фона (rembg)
│   │   └── template.py             # Шаблон карточки-коллажа
│   │
│   ├── content/                    # Контент для постов
│   │   ├── formatter.py            # Форматирование текста
│   │   └── buttons.py              # Кнопки
│   │
│   ├── database/                   # SQLite БД
│   │   ├── __init__.py
│   │   └── db.py                   # db.query, db.execute, db.cache
│   │
│   ├── scheduler/                  # Планировщик (в разработке)
│   │
│   └── utils/                      # Утилиты
│       └── logger.py               # Логирование
│
├── web_gui/                        # Веб-интерфейс (http.server)
│   ├── server.py                   # HTTP-сервер + REST API (1299 строк)
│   ├── index.html                  # Дашборд
│   ├── photo_tab.html              # Сбор и разметка фото
│   ├── app.js                      # JS-логика
│   ├── styles.css                  # Стили
│   ├── server.log                  # Логи сервера
│   └── start_web_gui.bat / .sh     # Запуск
│
├── scripts/                        # Утилиты
│   ├── collect_photos.py           # Сбор фото для ML-разметки
│   ├── collect_basket_data.py      # Сбор метаданных wbbasket.ru
│   ├── analyze_basket.py           # Анализ JSON с данными корзин
│   └── run_bot.py                  # Обёртка для запуска бота
│
├── data/                           # Данные (создаются автоматически)
│   ├── database.db                 # SQLite
│   ├── logs/                       # bot_debug.txt
│   ├── images/                     # Фото: original/, cards/, annotator_articles/, preview_cache/
│   ├── cache/                      # Кэш корзин
│   ├── preview_cache/              # Кэш превью карточек
│   ├── checked_articles.json       # Проверенные артикулы
│   ├── blacklist.json              # Чёрный список
│   ├── new_products.json           # Текущие новинки
│   ├── photo_annotations.json      # ML-разметка
│   ├── brands.txt / names.txt      # Списки
│   └── sellers.json                # Продавцы (legacy, сейчас в БД)
│
├── engine/                         # Pony ORM (legacy)
│   └── __init__.py
│
├── plans/                          # Документация
│   ├── project_summary.md
│   ├── roadmap.md
│   └── bugs.md
│
└── USAGE.md                        # Инструкция
```

---

## Команды Telegram-бота

| Команда / Кнопка | Описание |
|---|---|
| `/start` | Главное меню |
| `📋 Список продавцов` | Управление продавцами |
| `➕ Добавить продавца` | Добавить по ссылке на товар |
| `🔍 Проверить новинки` | Ручная проверка |
| `📤 Опубликовать пост` | Публикация в канал |
| `📊 Статистика` | Статистика БД |
| `⚙️ Настройки` | Режим отбора, интервал |
| `⏱ Планировщик` | Автопроверка |

### Аргументы командной строки

```bash
python main.py                # Запуск бота
python main.py --check        # Разовая проверка
python main.py --stats        # Статистика
python main.py --clear-cache  # Очистка кэша
```

---

## Режимы отбора товаров

| Режим | Описание |
|---|---|
| `mixed` | Сбалансированный (по умолчанию) |
| `new` | Приоритет новинкам (до 300 отзывов) |
| `popular` | Приоритет популярным (1000+ отзывов) |

Меняется в меню "⚙️ Настройки" или через `MODE` в `.env`.

---

## Веб-интерфейс

```bash
cd web_gui && python server.py
# http://localhost:8080
```

- Дашборд с логами и статистикой
- Управление продавцами
- Проверка новинок и публикация
- Сбор фото с WB для ML-разметки
- Разметка good/bad и экспорт датасета

---

## Сбор фото для ML

```bash
# Из articles.txt
python scripts/collect_photos.py

# Из new_products.json (каталог)
python scripts/collect_photos.py --from-catalog

# Конкретные артикулы
python scripts/collect_photos.py 12345678 23456789

# Свой файл
python scripts/collect_photos.py --from-file my_articles.txt
```

---

## Требования

- **Python 3.10+**
- **Playwright** (Chromium) — для обхода антибота WB
- **Telegram Bot Token** — [@BotFather](https://t.me/BotFather)
- **SOCKS5 прокси** (опционально) — для *.wbbasket.ru

---

## Лицензия

MIT