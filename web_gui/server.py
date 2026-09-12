#!/usr/bin/env python3
"""
============================================================
Wildberries Channel Manager — Web GUI Server (FastAPI)
============================================================

Современный асинхронный сервер на FastAPI + Uvicorn.
Заменяет устаревший http.server (BaseHTTPRequestHandler).

Преимущества:
  - Полностью асинхронный (asyncio) — не блокируется на запросах
  - Автоматическая документация API: http://localhost:8501/docs
  - Нормальный роутинг (декораторы), а не огромный if/elif
  - Server-Sent Events (SSE) для прогресса скачивания
  - Правильная обработка CORS и ошибок
  - Автоматическая отдача статических файлов

Запуск:
  python web_gui/server.py
  python web_gui/server.py 8080  # другой порт
"""

import json
import os
import sys
import sqlite3

if sys.platform != 'win32':
    try:
        import uvloop
        uvloop.install()
    except ImportError:
        pass
import shutil
import time
import threading
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional, Any

# Fix Windows cp1251 console encoding (otherwise emoji crash the logger)
if sys.platform == 'win32':
    import io
    try:
        if hasattr(sys.stdout, 'buffer') and getattr(sys.stdout, 'encoding', '').lower() != 'utf-8':
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'buffer') and getattr(sys.stderr, 'encoding', '').lower() != 'utf-8':
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass
    os.environ.setdefault('PYTHONIOENCODING', 'utf-8')

# ----------------------------
# FastAPI + Uvicorn
# ----------------------------
try:
    import fastapi
    from fastapi import FastAPI, HTTPException, Request, Response
    from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
    from fastapi.staticfiles import StaticFiles
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
except ImportError:
    print("\n[!] FastAPI или Uvicorn не установлены.")
    print("    Запустите: pip install fastapi uvicorn[standard]\n")
    sys.exit(1)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# ============================================================
# Configuration
# ============================================================
def _parse_port() -> int:
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        return int(sys.argv[1])
    return int(os.environ.get('GUI_PORT', 8501))

PORT = _parse_port()
STATIC_DIR = Path(__file__).parent
DATA_DIR = Path(__file__).parent.parent / 'data'
LOG_FILE = DATA_DIR / 'bot_debug.txt'

ANNOTATIONS_FILE = DATA_DIR / 'photo_annotations.json'
ANNOTATOR_IMAGES_DIR = DATA_DIR / 'images' / 'annotator_articles'
BASKET_CACHE_FILE = DATA_DIR / 'images' / 'basket_cache.json'

# ============================================================
# Logging
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(DATA_DIR / 'bot_debug.txt', encoding='utf-8', mode='a')
        if DATA_DIR.exists() else logging.StreamHandler()
    ]
)
log = logging.getLogger('wbup-webgui')

# ============================================================
# App State
# ============================================================
class AppState:
    def __init__(self):
        self.scheduler_running = False
        self.scheduler_thread: Optional[threading.Thread] = None
        self.scheduler_interval = 60
        self.logs: list[dict] = []
        self.max_logs = 1000


state = AppState()

import platform
_server_start_time = time.time()
APP_VERSION = "2.2.0"


# ============================================================
# FastAPI Application
# ============================================================

tags_metadata = [
    {"name": "Dashboard", "description": "Статистика и логи"},
    {"name": "Sellers", "description": "Управление продавцами"},
    {"name": "Products", "description": "Каталог и публикация"},
    {"name": "Settings", "description": "Настройки приложения"},
    {"name": "Scheduler", "description": "Планировщик проверок"},
    {"name": "Queue", "description": "Очередь отложенных публикаций"},
    {"name": "Photos", "description": "Фото и аннотации для ML"},
    {"name": "AI", "description": "Локальный ИИ для фото"},
    {"name": "System", "description": "Системные эндпоинты"},
]

app = FastAPI(
    title="WB Up Manager API",
    description="Wildberries Channel Manager — Web GUI API",
    version=APP_VERSION,
    openapi_tags=tags_metadata,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=500)


# Security headers + Cache-Control + Request timing
@app.middleware("http")
async def server_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Cache-Control: disable caching for app code (HTML, CSS, JS) and dynamic APIs
    path = request.url.path
    if path.endswith(('.css', '.js', '.html')) or path == '/' or (path.startswith('/api/') and not path.startswith('/api/image/')):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    elif path.endswith(('.woff2', '.ttf', '.woff')):
        response.headers["Cache-Control"] = "public, max-age=86400"

    # Log slow requests
    if duration > 1.0 and '/api/' in path:
        log.warning(f"Slow request: {request.method} {path} took {duration:.2f}s")

    return response

# ============================================================
# Pydantic Models
# ============================================================
class SellerAddRequest(BaseModel):
    input: str

class SellerToggleRequest(BaseModel):
    id: int
    enabled: bool

class PublishRequest(BaseModel):
    articles: list
    preview_card_path: Optional[str] = None
    text: Optional[str] = None

class PreviewRequest(BaseModel):
    articles: list

class SettingsRequest(BaseModel):
    settings: dict

class SchedulerStartRequest(BaseModel):
    interval: int = 60

class SchedulerSettingsRequest(BaseModel):
    interval: Optional[int] = None

class PhotoDownloadRequest(BaseModel):
    articles: Any
    max_indexes: int = 15
    basket: str = 'first'

class AnnotationSaveRequest(BaseModel):
    article: str
    label: int  # 1=good, 0=bad

class LogsRawRequest(BaseModel):
    limit: int = 500

class ArticleRemoveRequest(BaseModel):
    article: str

class QueueAddRequest(BaseModel):
    articles: list
    post_text: Optional[str] = None
    preview_card_path: Optional[str] = None
    scheduled_at: Optional[str] = None


# ============================================================
# Helpers: Logging
# ============================================================
def add_log(level: str, message: str):
    entry = {'time': time.strftime('%H:%M:%S'), 'level': level, 'message': message}
    state.logs.append(entry)
    if len(state.logs) > state.max_logs:
        state.logs = state.logs[-state.max_logs:]


def error_response(message: str, code: int = 400) -> JSONResponse:
    """Унифицированный формат ошибки API."""
    return JSONResponse(
        status_code=code,
        content={"success": False, "error": message, "code": code}
    )


# ============================================================
# Helpers: JSON files
# ============================================================
def read_json(path: Path, default=None):
    try:
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        log.warning(f"Failed to read {path}: {e}")
    return default if default is not None else []


def write_json(path: Path, data):
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except IOError as e:
        log.error(f"Failed to write {path}: {e}")
        return False


# ============================================================
# Helpers: Database
# ============================================================
from src.database import db as db_module

def get_db_path() -> Optional[Path]:
    return db_module.DB_PATH if db_module.DB_PATH.exists() else None


def db_query(sql: str, params=(), one=False):
    conn = db_module._get_conn()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall()
        if one:
            return dict(rows[0]) if rows else None
        return [dict(r) for r in rows]
    except Exception as e:
        log.error(f"DB error: {e}")
        return [] if not one else None
    finally:
        conn.close()


def db_execute(sql: str, params=()):
    conn = db_module._get_conn()
    try:
        conn.execute(sql, params)
        conn.commit()
    except Exception as e:
        log.error(f"DB execute error: {e}")
    finally:
        conn.close()


# ============================================================
# Helpers: ProductObj
# ============================================================
class ProductObj:
    """Обертка словаря товара для полной совместимости с моделью Product."""
    def __init__(self, d: dict):
        self._data = d or {}

    def get(self, key, default=None):
        return self._data.get(key, default)

    def __getattr__(self, name):
        if name in self._data:
            return self._data[name]
        return None

    @property
    def article(self): return self._data.get('article')
    @property
    def name(self): return self._data.get('name')
    @property
    def brand(self): return self._data.get('brand')
    @property
    def category(self): return self._data.get('category')
    @property
    def price(self): return self._data.get('price')
    @property
    def sale_price(self): return self._data.get('sale_price')
    @property
    def discount(self): return self._data.get('discount')
    @property
    def rating(self): return self._data.get('rating')
    @property
    def feedbacks(self): return self._data.get('feedbacks')
    @property
    def photos(self): return self._data.get('photos', 0)
    @property
    def photo_urls(self): return self._data.get('photo_urls', [])
    @property
    def photo_fallbacks(self): return self._data.get('photo_fallbacks', {})
    @property
    def url(self): return f"https://www.wildberries.ru/catalog/{self._data.get('article')}/detail.aspx"
    @property
    def supplier_id(self): return self._data.get('supplier_id')
    @property
    def sizes(self): return self._data.get('sizes', [])
    @property
    def colors(self): return self._data.get('colors', [])
    @property
    def options(self): return self._data.get('options', [])

    def to_dict(self) -> dict:
        return dict(self._data)


# ============================================================
# Core Business Logic
# ============================================================
def get_sellers():
    sellers = db_query("SELECT * FROM sellers ORDER BY created_at DESC")
    if sellers:
        return sellers
    sellers_json = DATA_DIR / 'sellers.json'
    if sellers_json.exists():
        data = read_json(sellers_json, [])
        return [{'supplier_id': s.get('supplier_id', 0), 'brand': s.get('brand', ''),
                 'enabled': s.get('enabled', True), 'created_at': ''} for s in data]
    return []


def add_seller(input_str: str):
    try:
        # Поддержка добавления по числовому ID
        if input_str.strip().isdigit():
            supplier_id = input_str.strip()
            brand = f"ID {supplier_id}"
            db_execute(
                "INSERT OR REPLACE INTO sellers (supplier_id, brand, enabled, created_at) VALUES (?, ?, 1, datetime('now'))",
                (int(supplier_id), brand)
            )
            add_log('INFO', f"Added seller by ID: supplier_id={supplier_id}")
            return {'success': True, 'result': {'supplier_id': int(supplier_id), 'brand': brand}}

        if 'wildberries.ru' in input_str:
            parts = input_str.split('/')
            supplier_id = None
            for i, p in enumerate(parts):
                if p == 'supplier_id' and i + 1 < len(parts):
                    supplier_id = parts[i + 1]
                    break
            if not supplier_id:
                return {'success': False, 'error': 'Не удалось извлечь supplier_id из ссылки'}
        else:
            return {'success': False, 'error': 'Используйте полную ссылку на страницу продавца WB'}

        brand = f"ID {supplier_id}"
        db_execute(
            "INSERT OR REPLACE INTO sellers (supplier_id, brand, enabled, created_at) VALUES (?, ?, 1, datetime('now'))",
            (int(supplier_id), brand)
        )
        add_log('INFO', f"Added seller: supplier_id={supplier_id}")
        return {'success': True, 'result': {'supplier_id': int(supplier_id), 'brand': brand}}

    except Exception as e:
        add_log('ERROR', f"Error adding seller: {e}")
        return {'success': False, 'error': str(e)}


def toggle_seller_fn(supplier_id: int, enabled: bool):
    try:
        db_execute("UPDATE sellers SET enabled = ? WHERE supplier_id = ?",
                   (1 if enabled else 0, supplier_id))
        add_log('INFO', f"Toggle seller id={supplier_id}, enabled={enabled}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def delete_seller_fn(supplier_id: int):
    try:
        db_execute("DELETE FROM sellers WHERE supplier_id = ?", (supplier_id,))
        add_log('INFO', f"Deleted seller id={supplier_id}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}


_products_cache = {
    "mtime": 0.0,
    "data": [],
}
_products_cache_lock = threading.Lock()


def get_products():
    products_file = DATA_DIR / 'new_products.json'
    if not products_file.exists():
        return []
    try:
        current_mtime = products_file.stat().st_mtime
        with _products_cache_lock:
            if _products_cache["mtime"] == current_mtime and _products_cache["data"]:
                return [dict(p) for p in _products_cache["data"]]

        data = read_json(products_file, [])
        with _products_cache_lock:
            _products_cache["mtime"] = current_mtime
            _products_cache["data"] = data
        return [dict(p) for p in data]
    except Exception as e:
        log.warning(f"Error reading products file: {e}")
        return read_json(products_file, [])


_enriched_products_cache = {
    "mtime": 0.0,
    "data": [],
}
_enriched_lock = threading.Lock()


def invalidate_products_cache():
    with _products_cache_lock:
        _products_cache["mtime"] = 0.0
    with _enriched_lock:
        _enriched_products_cache["mtime"] = 0.0


def run_check():
    try:
        from src.engine.engine import Engine
        engine = Engine()
        try:
            add_log('INFO', 'Запускаю проверку продавцов...')
            engine.run()
            prods = engine.last_preview_products or []
            found_count = len(prods)
            add_log('INFO', f"Проверка завершена: найдено {found_count} товаров")
            return {'success': True, 'message': f'Проверка завершена. Найдено {found_count} новинок.', 'count': found_count}
        except Exception as e:
            add_log('ERROR', f"Ошибка проверки: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            engine.close()
    except ImportError:
        add_log('INFO', 'Engine not available')
        return {'success': True, 'message': 'Модуль проверки недоступен'}
    except Exception as e:
        add_log('ERROR', f"run_check error: {e}")
        return {'success': False, 'error': str(e)}


def publish_products(articles: list, preview_card_path: Optional[str] = None, post_text: Optional[str] = None):
    import traceback as tb
    try:
        products = get_products()
        normalized = [str(a) for a in articles]
        selected_dicts = [p for p in products if str(p.get('article')) in normalized]
        if not selected_dicts:
            return {'success': False, 'error': 'Товары не найдены'}

        selected = [ProductObj(d) for d in selected_dicts]

        try:
            from src.telegram.publisher import TelegramPublisher

            text = post_text
            if not text:
                try:
                    from src.content.formatter import PostFormatter
                    formatter = PostFormatter()
                    category = selected[0].category or 'Одежда'
                    text = formatter.format(category, selected)
                except ImportError:
                    lines = [f"{len(selected)} товаров", ""]
                    for p in selected:
                        price = p.sale_price or p.price or 0
                        lines.append(f"• {p.brand} — {p.name} (арт. {p.article}) — {price}₽")
                    text = "\n".join(lines)

            card_path = preview_card_path
            if not card_path:
                try:
                    from src.image.renderer import ImageRenderer
                    card_path = ImageRenderer().render(selected)
                except Exception as e:
                    log.warning(f"Card render failed: {e}", exc_info=True)

            category = selected[0].category or 'Одежда'
            publisher = TelegramPublisher()

            # Generate interactive inline buttons with direct WB links
            buttons = None
            try:
                from src.content.buttons import PostButtons
                buttons = PostButtons().create(category, selected)
            except Exception as be:
                log.warning(f"Buttons generation failed: {be}")

            if buttons:
                publisher.send_with_buttons(
                    text=text,
                    photo_path=card_path if (card_path and Path(card_path).exists()) else None,
                    buttons=buttons
                )
            else:
                publisher.publish(category, selected, existing_photos=[card_path] if card_path else [], text=text)
            add_log('INFO', f"Published {len(selected)} products (with {len(buttons) if buttons else 0} inline buttons)")

            remaining = [p for p in products if str(p.get('article')) not in normalized]
            write_json(DATA_DIR / 'new_products.json', remaining)
            invalidate_products_cache()
            return {'success': True, 'published': len(selected)}

        except ImportError:
            return {'success': True, 'published': len(selected), 'note': 'Publisher not loaded'}

    except Exception as e:
        add_log('ERROR', f"Publish error: {e}")
        tb.print_exc()
        return {'success': False, 'error': str(e)}


def generate_preview(articles: list):
    import hashlib, traceback as tb
    try:
        products = get_products()
        normalized = [str(a) for a in articles]
        selected_dicts = [p for p in products if str(p.get('article')) in normalized]
        if not selected_dicts:
            return {'success': False, 'error': 'Товары не найдены'}

        selected = [ProductObj(d) for d in selected_dicts]

        # Text
        try:
            from src.content.formatter import PostFormatter
            category = selected[0].category or 'Одежда'
            text = PostFormatter().format(category, selected)
        except ImportError:
            lines = [f"{len(selected)} товаров", ""]
            for p in selected:
                price = p.sale_price or p.price or 0
                lines.append(f"• {p.brand} — {p.name} (арт. {p.article}) — {price}₽")
            text = "\n".join(lines)

        # Card caching is disabled to prevent stale cards when background or algorithm changes
        # cache_key = hashlib.md5(",".join(sorted(normalized)).encode()).hexdigest()[:12]
        # preview_cache_dir = DATA_DIR / 'preview_cache'
        # preview_cache_dir.mkdir(parents=True, exist_ok=True)
        # cached_card = preview_cache_dir / f"{cache_key}.webp"
        
        # if cached_card.exists():
        #     log.info(f"Preview cache hit: {cached_card.name}")
        #     return {
        #         'success': True, 'text': text,
        #         'card_path': str(cached_card), 'card_cached': True,
        #         'articles': list(articles),
        #         'products': [{'article': p.article, 'name': p.name, 'price': p.sale_price or p.price} for p in selected]
        #     }

        card_path = None
        warnings = []
        try:
            from src.image.renderer import ImageRenderer
            renderer = ImageRenderer()
            card_path = renderer.render(selected)
            warnings = renderer.warnings
        except Exception as e:
            log.warning(f"Card render failed: {e}", exc_info=True)

        if not card_path:
            return {'success': False, 'error': 'Не удалось сгенерировать карточку (фото не найдены)'}

        return {
            'success': True,
            'text': text,
            'card_path': card_path,
            'no_bg_paths': getattr(renderer, 'no_bg_paths', []),
            'warnings': warnings,
            'articles': list(articles),
            'products': [{'article': p.article, 'name': p.name, 'price': p.sale_price or p.price} for p in selected]
        }

    except Exception as e:
        add_log('ERROR', f"Preview error: {e}")
        tb.print_exc()
        return {'success': False, 'error': str(e)}


def get_statistics():
    sellers = get_sellers()
    products = get_products()
    pubs = db_query("SELECT COUNT(*) as cnt FROM publications")
    pub_count = pubs[0]['cnt'] if pubs else 0
    return {
        'sellers': len(sellers),
        'products': len(products),
        'publications': pub_count,
        'scheduler_running': state.scheduler_running
    }


def get_settings_fn():
    settings = {}
    rows = db_query("SELECT * FROM settings")
    if rows:
        for r in rows:
            key = r.get('key', '')
            val = r.get('value', '')
            if key in ('min_rating', 'max_price', 'products_per_category', 'check_interval_minutes', 'check_percent'):
                try:
                    val = float(val) if '.' in str(val) else int(val)
                except ValueError:
                    pass
            settings[key] = val
    return settings


def save_settings_fn(new_settings: dict):
    try:
        for key, value in new_settings.items():
            db_execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
        add_log('INFO', f"Settings saved: {list(new_settings.keys())}")
        return {'success': True}
    except Exception as e:
        add_log('ERROR', f"Save settings error: {e}")
        return {'success': False, 'error': str(e)}


def start_scheduler(interval: int = 60):
    if state.scheduler_running:
        return {'success': False, 'error': 'Планировщик уже запущен'}

    state.scheduler_interval = interval

    def scheduler_loop():
        add_log('INFO', f"Scheduler started (interval: {interval} min)")
        while state.scheduler_running:
            # Ждём interval минут с проверкой флага каждые 10 секунд
            for _ in range(interval * 6):
                if not state.scheduler_running:
                    break
                time.sleep(10)
            if state.scheduler_running:
                add_log('INFO', 'Scheduled check triggered')
                try:
                    run_check()
                except Exception as e:
                    add_log('ERROR', f"Scheduled check error: {e}")
        add_log('INFO', 'Scheduler stopped')

    state.scheduler_running = True
    state.scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
    state.scheduler_thread.start()
    return {'success': True}


def stop_scheduler():
    if not state.scheduler_running:
        return {'success': False, 'error': 'Планировщик не запущен'}
    state.scheduler_running = False
    if state.scheduler_thread:
        state.scheduler_thread.join(timeout=5)
    add_log('INFO', 'Scheduler stopped by user')
    return {'success': True}


def download_photos_from_wb(data: dict):
    articles_input = data.get('articles', [])
    max_indexes = data.get('max_indexes', 15)

    if isinstance(articles_input, list):
        articles_list = [int(str(a).strip()) for a in articles_input if str(a).strip().isdigit()]
    elif isinstance(articles_input, str):
        articles_list = [int(x.strip()) for x in articles_input.split(',') if x.strip().isdigit()]
    else:
        return {'success': False, 'error': 'Неверный формат артикулов'}

    if not articles_list:
        return {'success': False, 'error': 'Нет артикулов для обработки'}

    ANNOTATOR_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    try:
        from src.wb.image_finder import WBImageService

        async def run_download():
            service = WBImageService(cache_file=BASKET_CACHE_FILE, output_dir=ANNOTATOR_IMAGES_DIR)
            all_photos = {}
            total_count = 0
            try:
                for article in articles_list:
                    photos = await service.downloader.download_article_photos(
                        article=article, max_indexes=max_indexes, max_baskets=3, sizes=['big', 'large']
                    )
                    all_photos[article] = [str(p) for p in photos]
                    total_count += len(photos)
            finally:
                await service.shutdown()
            return {'success': True, 'downloaded': total_count,
                    'articles_processed': len(articles_list), 'per_article': all_photos}

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(run_download())
        finally:
            loop.close()

    except Exception as e:
        return {'success': False, 'error': str(e)}


def list_annotator_photos():
    if not ANNOTATOR_IMAGES_DIR.exists():
        return []
    by_article = {}
    for f in ANNOTATOR_IMAGES_DIR.glob('*.webp'):
        article = f.stem.split('_')[0]
        if article not in by_article:
            by_article[article] = []
        idx = f.stem.split('_')[1].replace('idx', '') if '_idx' in f.stem else '1'
        by_article[article].append({'filename': f.name, 'article': article, 'index': idx,
                                     'url': f'/images/annotator_articles/{f.name}'})
    return list(by_article.keys())


def load_annotations():
    if ANNOTATIONS_FILE.exists():
        try:
            with open(ANNOTATIONS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_annotations(data: dict):
    ANNOTATIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ANNOTATIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def clear_cache_fn():
    try:
        images_dir = DATA_DIR / 'images'
        if images_dir.exists():
            for item in images_dir.iterdir():
                if item.is_file():
                    item.unlink()
                else:
                    shutil.rmtree(item)
        for f in ['checked_articles.json', 'blacklist.json']:
            p = DATA_DIR / f
            if p.exists():
                write_json(p, [])
        add_log('INFO', 'Cache cleared')
        return {'success': True}
    except Exception as e:
        add_log('ERROR', f"Clear cache error: {e}")
        return {'success': False, 'error': str(e)}


# Thread pool for running blocking (sync) code from async FastAPI handlers
_executor = ThreadPoolExecutor(max_workers=min(32, (os.cpu_count() or 4) * 4))


async def _run_blocking(fn, *args):
    """Run a blocking/sync function in a thread pool without blocking the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, fn, *args)


# ============================================================
# API Routes — Dashboard
# ============================================================
@app.get("/api/statistics", tags=["Dashboard"])
async def api_statistics():
    """Статистика системы."""
    return await _run_blocking(get_statistics)


@app.get("/api/health", tags=["System"])
async def api_health():
    """Проверка работоспособности сервера."""
    uptime_seconds = int(time.time() - _server_start_time)
    return {
        "status": "ok",
        "version": APP_VERSION,
        "uptime_seconds": uptime_seconds,
        "uptime_human": f"{uptime_seconds // 3600}ч {(uptime_seconds % 3600) // 60}мин"
    }


@app.get("/api/system/info", tags=["System"])
async def api_system_info():
    """Информация о системе."""
    uptime_seconds = int(time.time() - _server_start_time)
    db_path = get_db_path()
    db_size = db_path.stat().st_size if db_path and db_path.exists() else 0
    db_size_mb = round(db_size / (1024 * 1024), 2)
    return {
        "version": APP_VERSION,
        "python_version": platform.python_version(),
        "os": f"{platform.system()} {platform.release()}",
        "uptime_seconds": uptime_seconds,
        "uptime_human": f"{uptime_seconds // 3600}ч {(uptime_seconds % 3600) // 60}мин",
        "db_size_mb": db_size_mb,
        "fastapi_version": fastapi.__version__,
        "port": PORT
    }


@app.get("/api/system/diagnostics", tags=["System"])
async def api_system_diagnostics():
    """Комплексная диагностика сети, API Wildberries, Telegram и базы данных."""
    import aiohttp
    from src.config import BOT_TOKEN, CHANNEL_USERNAME, TELEGRAM_PROXY

    diag = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "overall_status": "ok",
        "checks": {}
    }

    # 1. Database
    try:
        db_h = await _run_blocking(db_module.check_db_health)
        diag["checks"]["database"] = {
            "name": "SQLite База данных",
            "status": db_h["status"],
            "latency_ms": db_h["latency_ms"],
            "details": f"{db_h['db_size_mb']} MB, целостность: {db_h['integrity']}",
            "counts": db_h.get("counts", {})
        }
    except Exception as e:
        diag["checks"]["database"] = {
            "name": "SQLite База данных",
            "status": "error",
            "latency_ms": None,
            "details": str(e)
        }
        diag["overall_status"] = "warning"

    # 2. WB Card API & 3. WB CDN & 4. Telegram Bot API
    connector = aiohttp.TCPConnector(ssl=False)
    async with aiohttp.ClientSession(connector=connector, timeout=aiohttp.ClientTimeout(total=4.0)) as sess:
        # WB Card API
        t0 = time.time()
        try:
            url = "https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&nm=101130291"
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Referer": "https://www.wildberries.ru/"
            }
            async with sess.get(url, headers=headers) as r:
                wb_lat = round((time.time() - t0) * 1000, 1)
                # WB edge gateway returns 200 or 404/400 with WBAAS challenge headers
                # An HTTP response within normal latency confirms the WB edge is healthy and reachable
                is_alive = r.status in (200, 400, 404, 498)
                diag["checks"]["wb_api"] = {
                    "name": "WB Card API",
                    "status": "ok" if is_alive else "warning",
                    "latency_ms": wb_lat,
                    "details": f"Шлюз активен (card.wb.ru)" if is_alive else f"HTTP {r.status} (card.wb.ru)"
                }
        except Exception as e:
            wb_lat = round((time.time() - t0) * 1000, 1)
            diag["checks"]["wb_api"] = {
                "name": "WB Card API",
                "status": "error",
                "latency_ms": wb_lat,
                "details": f"Недоступен: {type(e).__name__}"
            }
            diag["overall_status"] = "warning"

        # WB CDN
        t0 = time.time()
        try:
            cdn_url = "https://static-basket-01.wbbasket.ru/vol0/data/main-menu-ru-ru-v3.json"
            async with sess.head(cdn_url) as r:
                cdn_lat = round((time.time() - t0) * 1000, 1)
                is_alive = r.status in (200, 301, 302, 403, 404)
                diag["checks"]["wb_cdn"] = {
                    "name": "WB Basket CDN",
                    "status": "ok" if is_alive else "warning",
                    "latency_ms": cdn_lat,
                    "details": f"CDN активен (wbbasket.ru)" if is_alive else f"HTTP {r.status} (wbbasket.ru)"
                }
        except Exception as e:
            cdn_lat = round((time.time() - t0) * 1000, 1)
            diag["checks"]["wb_cdn"] = {
                "name": "WB Basket CDN",
                "status": "error",
                "latency_ms": cdn_lat,
                "details": f"Недоступен: {type(e).__name__}"
            }
            diag["overall_status"] = "warning"

        # Telegram
        t0 = time.time()
        try:
            tg_url = f"https://api.telegram.org/bot{BOT_TOKEN}/getMe"
            proxy = TELEGRAM_PROXY if TELEGRAM_PROXY else None
            async with sess.get(tg_url, proxy=proxy) as r:
                tg_lat = round((time.time() - t0) * 1000, 1)
                data = await r.json() if r.status == 200 else {}
                bot_u = data.get("result", {}).get("username", "")
                diag["checks"]["telegram"] = {
                    "name": "Telegram Bot API",
                    "status": "ok" if r.status == 200 else "warning",
                    "latency_ms": tg_lat,
                    "details": f"@{bot_u} ({CHANNEL_USERNAME})" if bot_u else f"HTTP {r.status}"
                }
        except Exception as e:
            tg_lat = round((time.time() - t0) * 1000, 1)
            diag["checks"]["telegram"] = {
                "name": "Telegram Bot API",
                "status": "error",
                "latency_ms": tg_lat,
                "details": f"Ошибка: {type(e).__name__}"
            }
            diag["overall_status"] = "warning"

    # Disk
    try:
        usage = shutil.disk_usage(DATA_DIR)
        free_gb = round(usage.free / (1024 ** 3), 2)
        total_gb = round(usage.total / (1024 ** 3), 2)
        diag["checks"]["disk"] = {
            "name": "Дисковое пространство",
            "status": "ok" if free_gb > 1.0 else "warning",
            "latency_ms": None,
            "details": f"Свободно {free_gb} ГБ из {total_gb} ГБ"
        }
    except Exception as e:
        diag["checks"]["disk"] = {
            "name": "Дисковое пространство",
            "status": "error",
            "latency_ms": None,
            "details": str(e)
        }

    return diag



@app.get("/api/publications", tags=["Dashboard"])
async def api_publications(limit: int = 50):
    """История публикаций."""
    return db_query(
        "SELECT * FROM publications ORDER BY published_at DESC LIMIT ?",
        (limit,)
    )


@app.get("/robots.txt", tags=["System"], include_in_schema=False)
async def robots_txt():
    return Response(content="User-agent: *\nDisallow: /api/\n", media_type="text/plain")


@app.get("/api/logs", tags=["Dashboard"])
async def api_logs():
    """Получить последние логи."""
    return state.logs[-100:]


@app.post("/api/logs/clear", tags=["Dashboard"])
async def api_logs_clear():
    """Очистить логи."""
    state.logs.clear()
    return {"success": True}


@app.post("/api/logs/raw", tags=["Dashboard"])
async def api_logs_raw(req: LogsRawRequest):
    try:
        if LOG_FILE.exists():
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                lines = f.read().strip().split('\n')
            last = lines[-req.limit:] if len(lines) > req.limit else lines
            return {"lines": last, "total": len(lines)}
    except Exception as e:
        return {"lines": [f"Ошибка: {e}"], "total": 0}
    return {"lines": [], "total": 0}


# ============================================================
# API Routes — Sellers
# ============================================================
@app.get("/api/sellers", tags=["Sellers"])
async def api_sellers():
    """Список всех продавцов."""
    return await _run_blocking(get_sellers)


@app.post("/api/sellers/add", tags=["Sellers"], status_code=201)
async def api_sellers_add(req: SellerAddRequest):
    """Добавить продавца."""
    return await _run_blocking(add_seller, req.input)


@app.post("/api/sellers/toggle", tags=["Sellers"])
async def api_sellers_toggle(req: SellerToggleRequest):
    """Включить/отключить продавца."""
    return await _run_blocking(toggle_seller_fn, req.id, req.enabled)


@app.delete("/api/sellers/{supplier_id}", tags=["Sellers"])
async def api_sellers_delete(supplier_id: int):
    """Удалить продавца."""
    return await _run_blocking(delete_seller_fn, supplier_id)


@app.post("/api/sellers/{supplier_id}/delete", tags=["Sellers"])
async def api_sellers_delete_post(supplier_id: int):
    """Удалить продавца (POST)."""
    return await _run_blocking(delete_seller_fn, supplier_id)


@app.get("/api/sellers/{supplier_id}/details", tags=["Sellers"])
async def api_seller_detail(supplier_id: int):
    """Детали продавца."""
    def _fetch_details():
        seller = db_query("SELECT * FROM sellers WHERE supplier_id = ?", (supplier_id,), one=True)
        if not seller:
            return None
        product_count = db_query("SELECT COUNT(*) as cnt FROM products WHERE supplier_id = ?", (supplier_id,))
        seller['product_count'] = product_count[0]['cnt'] if product_count else 0
        return seller

    seller = await _run_blocking(_fetch_details)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return seller


# ============================================================
# API Routes — Products & Catalog
# ============================================================
from src.wb.fast_image_manager import fast_image_manager
from src.wb.ai_card_service import ai_card_service

@app.get("/api/products/export", tags=["Products"])
async def api_products_export():
    """Экспорт всех товаров в JSON."""
    products = get_products()
    headers = {'Content-Disposition': f'attachment; filename="products_{int(time.time())}.json"'}
    return Response(
        content=json.dumps(products, ensure_ascii=False, indent=2),
        media_type='application/json',
        headers=headers
    )

@app.api_route("/api/image/{article}", methods=["GET", "HEAD"], tags=["Products"])
async def api_image_proxy(
    article: int,
    mode: Optional[str] = None,
    v: Optional[str] = None,
    s: Optional[str] = None,
    st: Optional[str] = None,
):
    """Высокоскоростная отдача фото товара: приоритетно карточка, отобранная локальным ИИ."""
    try:
        img_path = None
        # По умолчанию отдаем фото, одобренное ИИ для публикации
        if mode != "first":
            img_path = ai_card_service.get_best_photo_path(article)

        # Если фото ИИ нет или запрошена первая обложка (mode=first), берём через fast_image_manager
        if not img_path or not img_path.exists():
            img_path = await fast_image_manager.get_image(article)

        if img_path and img_path.exists():
            media_type = "image/webp" if img_path.suffix == ".webp" else "image/jpeg"
            return FileResponse(
                img_path,
                media_type=media_type,
                headers={
                    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
                    "ETag": f'"{article}_{int(img_path.stat().st_mtime)}"',
                }
            )
    except Exception as e:
        log.warning(f"Image proxy error for {article}: {e}")

    return Response(status_code=404, content=b"", media_type="image/webp")

@app.get("/api/products", tags=["Products"])
async def api_products():
    """Каталог товаров с обогащением карточками и статусами от локального ИИ (кэширование в RAM)."""
    products_file = DATA_DIR / 'new_products.json'
    current_mtime = products_file.stat().st_mtime if products_file.exists() else 0.0

    with _enriched_lock:
        if _enriched_products_cache["mtime"] == current_mtime and _enriched_products_cache["data"]:
            return _enriched_products_cache["data"]

    result = await _run_blocking(get_products)
    add_log('INFO', f'GET /api/products: {len(result)} products (cache miss, enriching...)')

    # Обогащаем метаданными отбора локального ИИ
    try:
        ai_ratings = await _run_blocking(db_module.get_all_ai_ratings)
        for p in result:
            art = p.get('article')
            if art and art in ai_ratings:
                r = ai_ratings[art]
                p['ai_card'] = {
                    'status': 'ok' if r['has_card'] else 'rejected',
                    'has_card': bool(r['has_card']),
                    'score': r['best_score'],
                    'index': r['best_index'],
                    'total_photos': r.get('total_photos', 1)
                }
            else:
                p['ai_card'] = {
                    'status': 'pending',
                    'has_card': False,
                    'score': None,
                    'index': None,
                    'total_photos': 0
                }

        with _enriched_lock:
            _enriched_products_cache["mtime"] = current_mtime
            _enriched_products_cache["data"] = result
    except Exception as e:
        log.warning(f"Failed to attach AI ratings to products: {e}")

    # Фоновая предзагрузка фото для первых 50 товаров каталога
    if result:
        articles_to_warm = [p['article'] for p in result[:50] if 'article' in p]
        asyncio.create_task(fast_image_manager.prefetch_articles(articles_to_warm))

    return result


@app.post("/api/check", tags=["Products"])
async def api_check():
    """Запустить проверку новинок."""
    return await _run_blocking(run_check)


@app.post("/api/preview", tags=["Products"])
async def api_preview(req: PreviewRequest):
    """Сгенерировать превью поста."""
    add_log('INFO', f'Preview requested for {len(req.articles)} articles')
    result = await _run_blocking(generate_preview, req.articles)
    return result


@app.post("/api/publish", tags=["Products"])
async def api_publish(req: PublishRequest):
    """Опубликовать товары в Telegram."""
    return await _run_blocking(publish_products, req.articles, req.preview_card_path, req.text)


# ============================================================
# API Routes — Settings
# ============================================================
@app.get("/api/settings", tags=["Settings"])
async def api_settings_get():
    """Получить настройки."""
    return await _run_blocking(get_settings_fn)


@app.post("/api/settings", tags=["Settings"])
async def api_settings_post(request: Request):
    """Сохранить настройки."""
    data = await request.json()
    return await _run_blocking(save_settings_fn, data)


# ============================================================
# API Routes — Scheduler
# ============================================================
@app.get("/api/scheduler/status", tags=["Scheduler"])
async def api_scheduler_status():
    """Статус планировщика."""
    return {"running": state.scheduler_running}


@app.post("/api/scheduler/start", tags=["Scheduler"])
async def api_scheduler_start(req: SchedulerStartRequest):
    """Запустить планировщик."""
    return start_scheduler(req.interval)


@app.post("/api/scheduler/stop", tags=["Scheduler"])
async def api_scheduler_stop():
    """Остановить планировщик."""
    return stop_scheduler()


@app.post("/api/scheduler/settings", tags=["Scheduler"])
async def api_scheduler_settings(req: SchedulerSettingsRequest):
    """Сохранить настройки планировщика."""
    if req.interval is not None:
        state.scheduler_interval = req.interval
    return {"success": True}


# ============================================================
# API Routes — Queue
# ============================================================
@app.get("/api/queue", tags=["Queue"])
async def api_queue_list(status: Optional[str] = None):
    """Список публикаций в очереди."""
    return await _run_blocking(db_module.queue_list, status)


@app.post("/api/queue/add", tags=["Queue"], status_code=201)
async def api_queue_add(req: QueueAddRequest):
    """Добавить пост в очередь публикаций."""
    qid = await _run_blocking(
        db_module.queue_add,
        req.articles,
        req.post_text,
        req.preview_card_path,
        req.scheduled_at,
    )
    add_log('INFO', f"Added post #{qid} ({len(req.articles)} articles) to publication queue")
    return {"success": True, "id": qid}


@app.delete("/api/queue/{queue_id}", tags=["Queue"])
async def api_queue_delete(queue_id: int):
    """Удалить пост из очереди."""
    ok = await _run_blocking(db_module.queue_delete, queue_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Queue item not found")
    add_log('INFO', f"Deleted queue item #{queue_id}")
    return {"success": True}


@app.post("/api/queue/{queue_id}/publish", tags=["Queue"])
async def api_queue_publish(queue_id: int):
    """Опубликовать пост из очереди немедленно."""
    item = await _run_blocking(db_module.queue_get, queue_id)
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")

    res = await _run_blocking(
        publish_products,
        item.get("articles", []),
        item.get("preview_card_path"),
        item.get("post_text"),
    )
    if res.get("success"):
        await _run_blocking(db_module.queue_update_status, queue_id, "published")
    else:
        await _run_blocking(db_module.queue_update_status, queue_id, "failed", res.get("error"))
    return res



# ============================================================
# API Routes — Photos & Annotations (ML)
# ============================================================
@app.get("/api/photos/list", tags=["Photos"])
async def api_photos_list():
    """Список фото для разметки."""
    return {"photos": list_annotator_photos()}


@app.post("/api/photos/list", tags=["Photos"])
async def api_photos_list_post():
    """Список фото для разметки (POST)."""
    return {"photos": list_annotator_photos()}


@app.post("/api/photos/download", tags=["Photos"])
async def api_photos_download(req: PhotoDownloadRequest):
    """Скачать фото товаров для ML."""
    data = req.model_dump() if hasattr(req, 'model_dump') else req.dict()
    return download_photos_from_wb(data)


@app.post("/api/photos/download/start", tags=["Photos"])
async def api_photos_download_start(request: Request):
    """Запуск скачивания фото."""
    data = await request.json()
    return download_photos_from_wb(data)


@app.post("/api/photos/remove", tags=["Photos"])
async def api_photos_remove(req: ArticleRemoveRequest):
    """Удалить фото товара из разметки."""
    target = ANNOTATOR_IMAGES_DIR / str(req.article)
    if target.exists():
        shutil.rmtree(target)
    add_log('INFO', f'Removed article {req.article}')
    return {"success": True}


@app.get("/api/annotations", tags=["Photos"])
async def api_annotations_get():
    """Получить все аннотации."""
    return {"annotations": load_annotations()}


@app.post("/api/annotations", tags=["Photos"])
async def api_annotations_post():
    """Получить все аннотации (POST)."""
    return {"annotations": load_annotations()}


@app.post("/api/annotations/save", tags=["Photos"])
async def api_annotations_save(req: AnnotationSaveRequest):
    """Сохранить аннотацию фото."""
    ann = load_annotations()
    ann[str(req.article)] = int(req.label)
    save_annotations(ann)
    return {"success": True}


@app.post("/api/annotations/clear", tags=["Photos"])
async def api_annotations_clear():
    """Очистить все аннотации."""
    save_annotations({})
    add_log('INFO', 'All annotations cleared')
    return {"success": True}


@app.get("/api/annotations/export", tags=["Photos"])
async def api_annotations_export():
    """Экспорт датасета фото."""
    ann = load_annotations()
    export_data = {
        'version': '1.0',
        'created': time.strftime('%Y-%m-%d %H:%M:%S'),
        'total': len(ann),
        'good': sum(1 for v in ann.values() if v == 1),
        'bad': sum(1 for v in ann.values() if v == 0),
        'data': ann
    }
    headers = {'Content-Disposition': f'attachment; filename="photo_dataset_{int(time.time())}.json"'}
    return Response(
        content=json.dumps(export_data, ensure_ascii=False, indent=2),
        media_type='application/json',
        headers=headers
    )

@app.post("/api/annotations/export", tags=["Photos"])
async def api_annotations_export_post():
    return await api_annotations_export()


# ============================================================
# API Routes — Cache
# ============================================================
@app.post("/api/cache/clear", tags=["System"])
async def api_cache_clear():
    """Очистить кэш изображений."""
    return clear_cache_fn()


# ============================================================
# Static File Serving
# ============================================================

# Serve images from data/images/
@app.get("/images/{file_path:path}", tags=["System"])
async def serve_image(file_path: str):
    img = DATA_DIR / 'images' / file_path
    if img.exists() and img.is_file():
        return FileResponse(img)
    # Try subfolders
    for subdir in ['annotator_articles', 'original']:
        alt = DATA_DIR / 'images' / subdir / file_path
        if alt.exists() and alt.is_file():
            return FileResponse(alt)
    raise HTTPException(status_code=404, detail="Image not found")


# Serve card images from data/images/cards/ and data/preview_cache/
@app.get("/cards/{filename}", tags=["System"])
async def serve_card(filename: str):
    search_dirs = [
        DATA_DIR / 'images' / 'cards',
        Path(__file__).parent.parent / 'src' / 'data' / 'images' / 'cards',
        DATA_DIR / 'preview_cache',
    ]
    for d in search_dirs:
        p = d / filename
        if p.exists() and p.is_file():
            return FileResponse(p)
    raise HTTPException(status_code=404, detail="Card not found")



# ============================================================
# Startup
# ============================================================
@app.on_event("startup")
async def on_startup():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ANNOTATOR_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # Initialize database
    try:
        from src.database import db
        db.init()
        log.info("Database schema initialized successfully")
    except Exception as e:
        log.warning(f"Database init note: {e}")

    log.info("=" * 60)
    log.info(f"WB Up Web GUI Server v{APP_VERSION} (FastAPI)")
    log.info(f"URL:        http://localhost:{PORT}")
    log.info(f"API Docs:   http://localhost:{PORT}/docs")
    log.info(f"Python:     {platform.python_version()}")
    log.info(f"OS:         {platform.system()} {platform.release()}")
    log.info(f"Static dir: {STATIC_DIR}")
    log.info(f"Data dir:   {DATA_DIR}")
    log.info("=" * 60)


# ============================================================

from src.wb.local_ai_ranker import local_ai

class LabelRequest(BaseModel):
    article: int
    url: str
    path: str
    label: int

class DeleteLabelRequest(BaseModel):
    path: str

class ArticleRequest(BaseModel):
    article: int

@app.get("/api/ai/status", tags=["AI"])
def ai_status():
    """Статус модели локального ИИ."""
    return local_ai.get_status()

@app.post("/api/ai/label", tags=["AI"])
def ai_label(req: LabelRequest):
    """Разметить фото для ИИ."""
    count = local_ai.add_label(req.article, req.url, req.path, req.label)
    return {"success": True, "count": count}

@app.delete("/api/ai/label", tags=["AI"])
def ai_delete_label(req: DeleteLabelRequest):
    """Удалить метку из датасета ИИ."""
    count = local_ai.remove_label(req.path)
    return {"success": True, "count": count}

@app.get("/api/ai/dataset", tags=["AI"])
def ai_get_dataset():
    """Получить датасет ИИ."""
    return {"success": True, "dataset": local_ai.get_dataset()}

@app.post("/api/ai/train", tags=["AI"])
def ai_train():
    """Обучить модель локального ИИ."""
    res = local_ai.train()
    if res.get("status") == "error":
        return {"success": False, "error": res.get("message")}
    return {"success": True, **res}

@app.post("/api/ai/fetch", tags=["AI"])
async def ai_fetch(req: ArticleRequest):
    """Скачать и оценить фото товара."""
    from src.wb.photo_ranker import SmartPhotoRanker
    ranker = SmartPhotoRanker()
    
    try:
        photos = await ranker.rank_article_photos(req.article)
        res = []
        for p in photos:
            res.append({"url": p.url_used, "path": str(p.path), "index": p.index})
        return {"success": True, "photos": res}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/ai/test", tags=["AI"])
async def ai_test(req: ArticleRequest):
    """Тестирование модели ИИ на артикуле."""
    from src.wb.photo_ranker import SmartPhotoRanker
    ranker = SmartPhotoRanker()
    
    try:
        photos = await ranker.rank_article_photos(req.article)
        res = []
        for p in photos:
            score = local_ai.predict_score(str(p.path))
            res.append({"path": str(p.path), "score": score})
        res.sort(key=lambda x: x["score"], reverse=True)
        return {"success": True, "photos": res}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/ai/evaluate/{article}", tags=["AI"])
async def api_ai_evaluate_single(article: int, force: bool = False):
    """Оценить конкретный товар через локальный ИИ и зафиксировать лучшую карточку."""
    try:
        res = await ai_card_service.evaluate_article(article, force=force)
        invalidate_products_cache()
        return {"success": True, "result": res}
    except Exception as e:
        log.error(f"Error evaluating article {article}: {e}", exc_info=True)
        return {"success": False, "error": str(e)}

class BatchEvaluateRequest(BaseModel):
    articles: Optional[list] = None
    limit: int = 50

@app.post("/api/ai/evaluate_batch", tags=["AI"])
async def api_ai_evaluate_batch(req: BatchEvaluateRequest):
    """Запустить фоновую оценку товаров каталога через локальный ИИ."""
    articles = req.articles
    if not articles:
        prods = get_products()
        all_ratings = db_module.get_all_ai_ratings()
        articles = [p['article'] for p in prods if p.get('article') and p['article'] not in all_ratings][:req.limit]

    if not articles:
        return {"success": True, "message": "Все доступные товары уже оценены ИИ", "count": 0}

    async def _eval_worker(art_list):
        for art in art_list:
            try:
                await ai_card_service.evaluate_article(art)
                invalidate_products_cache()
                await asyncio.sleep(0.1)
            except Exception as e:
                log.warning(f"Error evaluating article {art}: {e}")

    asyncio.create_task(_eval_worker(articles))
    return {"success": True, "message": f"Запущен анализ {len(articles)} товаров ИИ", "count": len(articles)}

@app.get("/api/ai/card_stats", tags=["AI"])
async def api_ai_card_stats():
    """Статистика покрытия каталога карточками от локального ИИ."""
    stats = await _run_blocking(db_module.get_ai_ratings_stats)
    prods = get_products()
    total_prods = len(prods)
    stats["total_products"] = total_prods
    stats["pending"] = max(0, total_prods - stats.get("total_evaluated", 0))
    return stats


# Entry Point

# Mount static files (CSS, JS, HTML)
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
# ============================================================

if __name__ == '__main__':
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
        log_level="info",
        app_dir=str(STATIC_DIR)
    )
