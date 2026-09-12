# Баги и проблемы

Файл для отслеживания найденных багов и проблем в проекте.

---

## Активные баги

*(пока нет)*

---

## Исправленные баги

### 1. "Опубликовать выбранные" — зависание кнопки
- **Симптом:** После нажатия "Опубликовать выбранные" бот зависает, не отвечает на команды.
- **Причина:** Генерация карточки (ImageRenderer) выполнялась в основном потоке, блокируя long-polling.
- **Решение:** Генерация карточки вынесена в фоновый поток (`threading.Thread`).
- **Файлы:** `src/telegram/handlers.py` — `_publish_selected()`

### 2. Неправильные фото товаров
- **Симптом:** Бот берёт не те фото (например, фото другого цвета/размера).
- **Причина:** WBPhotoDownloader использовал неправильную логику поиска фото.
- **Решение:** Переработка `WBPhotoDownloader`, добавлен `_get_photo_from_card_api()`, очистка кэша фото.
- **Файлы:** `src/wb/photo_downloader.py`

### 3. "Проверить новинки" — очень долго (4+ минуты)
- **Симптом:** Проверка новинок занимает 4+ минуты.
- **Причина:** `WBPhotoDownloader` запускался в отдельном потоке с `threading.Thread` + `queue.Queue` и таймаутом 300с.
- **Решение:** Убрана проверка фото из `process_seller()`. Фото проверяются только при публикации.
- **Файлы:** `src/engine/engine.py` — `process_seller()`

### 4. "Новых товаров нет" для всех продавцов
- **Симптом:** После успешной загрузки каталога `Selector.select()` возвращает 0 товаров.
- **Причина:** `check_cache.json` содержал битые данные (все товары в blacklisted). `Selector.is_valid()` проверял blacklist.
- **Решение:** 
  - Очищен `check_cache.json` и `blacklist.json`
  - Добавлена защита от битого кэша в `get_cached_result()` — если `valid_articles` пуст и `blacklisted_articles` > 50%, кэш игнорируется
  - Убрана проверка `is_blacklisted()` из `Selector.is_valid()`
- **Файлы:** `src/engine/cache_check.py`, `src/engine/selector.py`, `src/engine/engine.py`

### 5. `_try_direct_download()` не работает через SOCKS5
- **Симптом:** Прямое скачивание фото через `page.request.get()` не работает.
- **Причина:** DNS `*.wbbasket.ru` не резолвится через SOCKS5-прокси.
- **Решение:** Метод удалён. Используется только `page.goto()` + `expect_response`.
- **Файлы:** `src/wb/photo_downloader.py`

### 6. `expect_response` — TargetClosedError
- **Симптом:** Редкая ошибка `TargetClosedError` при ожидании ответа.
- **Причина:** Вызов `r.body()` в предикате `expect_response` мог вызывать ошибку, если страница уже закрыта.
- **Решение:** Убран `r.body()` из предиката.
- **Файлы:** `src/wb/photo_downloader.py`

### 7. "Cancel" на публикации не работал
- **Симптом:** Кнопка "Отмена" при подтверждении публикации не возвращала в меню.
- **Причина:** `callback_data="menu"` конфликтовал с главным меню.
- **Решение:** Изменён `callback_data` на `"cancel_publish"`, добавлен отдельный обработчик.
- **Файлы:** `src/telegram/handlers.py`

### 8. ThreadPoolExecutor + Playwright — "Cannot switch to a different thread"
- **Симптом:** Ошибка при попытке параллельного скачивания фото через ThreadPoolExecutor.
- **Причина:** Playwright sync API использует greenlets, привязанные к одному потоку.
- **Решение:** Замена на `threading.Thread` + `queue.Queue`.
- **Файлы:** `src/engine/engine.py` — `_filter_products_with_photos()`

### 9. Выбор товара ломает навигацию по категориям
- **Симптом:** При нажатии на товар в многоуровневой навигации (продавцы → пол → категории → товары) показываются все товары вместо текущей категории.
- **Причина:** `_toggle_product()` использовал `self.available_products[chat_id]` — все товары, а не только отфильтрованные по категории.
- **Решение:** Добавлен `self.nav_context[chat_id]`, который хранит `(seller_id, gender, category)`. `_toggle_product()` фильтрует товары по этому контексту.
- **Файлы:** `src/telegram/handlers.py` — `_toggle_product()`, `_nav_show_products()`

---

## Наблюдения

- **Requests API WB:** Возвращает 403 для каталогов продавцов. Playwright fallback работает стабильно.
- **SOCKS5 прокси:** Необходим для доступа к `*.wbbasket.ru`. Системный DNS не резолвит эти домены.
- **Playwright greenlet limitation:** Sync API Playwright привязан к одному потоку. ThreadPoolExecutor не работает.
- **Кэш каталога:** Хранится в SQLite (`cache` table, TTL=3600с). Ускоряет повторные проверки.