# Суть проекта Wildberries Channel Manager (wb_up)

## 🎯 Назначение
Telegram-бот для **автоматического мониторинга новых товаров** у продавцов Wildberries, **умного отбора** лучших товаров по скорингу и **публикации** красивых коллажей в Telegram-канал `@wbuppp`.

---

## 🏗 Архитектура модулей

```
wb_up/
├── main.py                    # Точка входа (CLI + запуск бота)
├── build_exe.py               # Скрипт сборки .exe (PyInstaller)
├── requirements.txt           # Зависимости: requests, playwright, Pillow, rembg
├── .env                       # Настройки (BOT_TOKEN, CHANNEL_USERNAME, MODE, прокси)
│
├── src/
│   ├── config/__init__.py     # Конфиг из .env (пути, мин.рейтинг 4.7, макс.цена 3500₽)
│   ├── config/sellers.py      # Список продавцов SELLERS []
│   │
│   ├── engine/
│   │   ├── engine.py          # Оркестратор: process_seller(), run() —accumulator от всех продавцов
│   │   ├── selector.py        # Скоринг: рейтинг(30б), отзывы(40б), фото(10б), цена(10б)
│   │   ├── scheduler.py       # Периодическая проверка по таймеру (check_interval_minutes)
│   │   ├── seller_manager.py  # Добавление продавца по ссылке/артикулу
│   │   ├── checked.py         # Кэш проверенных артикулов (checked_articles.json)
│   │   └── blacklist.py       # Товары без фото
│   │
│   ├── wb/
│   │   ├── session.py         # Playwright persistent_context (врем. профиль, headless=False)
│   │   ├── client.py          # WBClient: get_product(), get_seller_products()
│   │   ├── catalog_fetcher.py # Загрузка каталога продавца через браузер
│   │   ├── product_api.py     # API карточки товара
│   │   ├── models.py          # Product dataclass (article, name, price, rating, photos...)
│   │   ├── photo_downloader.py# Скачивание фото товаров
│   │   └── category.py        # Определение категории
│   │
│   ├── image/
│   │   ├── renderer.py        # ImageRenderer: скачать→rembg фон→коллаж
│   │   ├── downloader.py      # ImageDownloader через requests
│   │   ├── background_remover.py # rembg (ONNX Runtime, CPU)
│   │   └── template.py        # CardTemplate: сборка коллажа 1080×1080.webp
│   │
│   ├── telegram/
│   │   ├── bot.py             # TelegramBot базовый класс
│   │   ├── handlers.py        # Long polling + все обработчики команд/callback
│   │   ├── menus.py           # Inline-клавиатуры
│   │   └── publisher.py       # Публикация постов в канал
│   │
│   ├── database/db.py         # SQLite: sellers, products, publications, settings, cache
│   └── utils/logger.py        # Настройка логирования
│
├── data/                      # Данные (создаются автоматически)
│   ├── database.db            # SQLite БД
│   ├── images/
│   │   ├── original/          # Оригинальные фото товаров
│   │   ├── no_bg/             # Фото без фона (rembg кэш)
│   │   └── cards/             # Готовые коллажи card_*.webp
│   ├── checked_articles.json  # Проверенные артикулы
│   ├── new_products.json      # Результат последней проверки
│   └── blacklist.json         # Чёрный список
│
└── scripts/                   # Вспомогательные/отладочные скрипты
```

---

## ⚙️ Основной флоу работы

### 1. Добавление продавца
```
Пользователь → /add → ссылка на товар WB → SellerManager.add()
→ определяется supplier_id + brand → подтверждение → запись в SQLite
```

### 2. Проверка новинок (`Engine.run()`)
```
Для каждого enabled-продавца:
  1. WBClient.get_seller_products(supplier_id) → через Playwright (обход антибота)
  2. Динамический лимит: top-N% от каталога (настройка check_percent, дефолт 30%)
  3. Selector.select(products):
     - Фильтр: есть статья, название, цена, не опубликован, не проверен ранее
     - Группировка по категориям (топ-per_category из каждой)
     - Скоринг: рейтинг(30) + отзывы(mode-dependent)(40) + фото(10) + цена(10) = макс 90
     - Режимы: "mixed" / "new" (новинкам до 300 отзывов бонус) / "popular" (популярным 1000+)
  4. Накопление результатов в _all_selected_products
  5. Сохранение в data/new_products.json
```

### 3. Публикация
```
Пользователь → /publish → навигация:
  Продавцы → Пол (male/female/unisex) → Категории (платья, футболки...) → Товары с чекбоксами
→ Выбранные товары → ImageRenderer.render():
  1. Скачать фото (photo_downloader, Playwright)
  2. Удалить фон (rembg, кэшируется в no_bg/)
  3. Собрать коллаж на фоне из logo/ → cards/card_*.webp
→ TelegramPublisher.publish() → медиа-группа в канал @wbuppp
→ Запись в history публикаций (SQLite)
→ Удаление опубликованных артикулов из new_products.json
```

### 4. Планировщик (Scheduler)
```
Автозапуск Engine каждые check_interval_minutes (дефолт 60 мин)
→ Результаты приходят в указанный chat_id для превью
```

---

## 📊 Модели данных

### Product (src/wb/models.py)
```python
article: int                        # Артикул WB
imt_id: int | None                  # IMT ID
name: str | None                    # Название товара
brand: str | None                   # Бренд
supplier_id: int | None             # ID продавца
supplier_name: str | None           # Название продавца
category: str | None                # Категория (платья, футболки...)
root_category: str | None           # Корневая категория
gender: str | None                  # "male" / "female" / "unisex"
rating: float | None                # Рейтинг
feedbacks: int | None               # Количество отзывов
photos: int                         # Кол-во фото
photo_urls: list[str]               # URL фото
price: int | None                   # Цена
sale_price: int | None              # Цена со скидкой
discount: int | None                # Скидка %
sizes: list[dict]                   # Размеры
colors: list[str]                   # Цвета
url: str | None                     # Ссылка на товар
```

---

## 🔑 Параметры фильтрации (из настроек БД)
| Параметр | По умолчанию | Описание |
|----------|-------------|----------|
| min_rating | 4.7 | Минимальный рейтинг |
| max_price | 3500 | Максимальная цена (₽) |
| products_per_category | 10 | Лимит товаров на категорию |
| mode | mixed | Режим отбора: mixed/new/popular |
| check_interval_minutes | 60 | Интервал автопроверки |
| check_percent | 30 | % каталога проверять |

---

## 🚀 Запуск проекта

### Ручной
```bash
cp .env.example .env   # заполнить BOT_TOKEN, CHANNEL_USERNAME
pip install -r requirements.txt
playwright install chromium
python main.py         # запустить бота
```

### Сборка .exe
```bash
python build_exe.py    # автоматически: deps + pyinstaller + chromium в dist/
# Результат: dist/wb-bot.exe + _chromium/ + start.bat
```

### Docker
```bash
docker-compose up -d
```

---

## ⚠️ Технические особенности

1. **Playwright привязан к потоку** — `Engine` создаётся внутри рабочего потока (`threading.Thread`) при ручной проверке
2. **PersistentContext с временным профилем** — исключает блокировку профиля реального Chrome
3. **headless=False** — обязательно для обхода `__wbaas/challenges/antibot` WB
4. **rembg требует ONNX Runtime** — первая обработка фото медленная (загрузка модели ~100MB)
5. **Четыре уровня навигации**: Sellers → Gender → Category → Products
6. **Кэширование** — данные каталогов кешируются в SQLite (cache table) с TTL
7. **WAL режим SQLite** — предотвращает блокировки записи во время чтения

---

## 📦 Зависимости
```
requests>=2.31.0       # Telegram Bot API
playwright>=1.40.0     # Browser automation
Pillow>=10.0.0         # Обработка изображений
rembg[cpu]>=2.0.0      # ИИ удаление фона (ONNX)
```

---

## 🤖 Команды Telegram-бота
| Команда / Кнопка | Описание |
|------------------|----------|
| `/start` | Главное меню |
| `📋 Список продавцов` | Управление (вкл/выкл/удалить) |
| `➕ Добавить продавца` | По артикулу или ссылке |
| `🔍 Проверить новинки` | Ручная проверка всех продавцов |
| `📤 Опубликовать пост` | Выбор товаров → публикация в канал |
| `📊 Статистика` | Сводка: всего публикаций, сегодня, за неделю |
| `⚙️ Настройки` | Режим, рейтинг, цена, интервал |
| `⏱ Планировщик` | Автозапуск проверки |
| `🗑 Очистить кэш` | Удалить все фото, blacklist, checked |

---

## 📝 Файлы данных

| Файл | Описание |
|------|----------|
| `data/database.db` | SQLite: sellers, products, publications, settings, cache |
| `data/new_products.json` | Результаты последней проверки (склад накопления) |
| `data/checked_articles.json` | Уже проверенные артикулы |
| `data/blacklist.json` | Артикулы без фото |
| `data/images/original/*.webp` | Скачанные оригиналы фото |
| `data/images/no_bg/*.png` | Фото без фона (rembg кэш) |
| `data/images/cards/card_*.webp` | Готовые коллажи для публикации |
| `data/sellers.json` | legacy — продавцы (мigrate в SQLite) |
| `data/gui_config.json` | Настройки GUI |

---

*Создано для сохранения контекста проекта. Дата создания: 2026-08-02*