#!/usr/bin/env python3
""" ============================================================
    Wildberries Channel Manager — Web GUI Server
    Lightweight Flask-like HTTP server (no external deps needed)
    
    Starts on port 8501 by default
    Serves static files + provides API endpoints
    ============================================================ """

import json
import os
import sys
import threading
import time
import logging
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import urllib.request

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# ============================================================
# Configuration
# ============================================================
if len(sys.argv) > 1:
    PORT = int(sys.argv[1])
else:
    PORT = int(os.environ.get('GUI_PORT', 8501))
STATIC_DIR = Path(__file__).parent
DATA_DIR = Path(__file__).parent.parent / 'data'
LOG_FILE = DATA_DIR / 'bot_debug.txt'

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding='utf-8', mode='a')
    ]
)
log = logging.getLogger('wbup-webgui')

# ============================================================
# Global State
# ============================================================
class DownloadTask:
    """Состояние задачи скачивания."""
    def __init__(self, task_id, total):
        self.task_id = task_id
        self.total = total
        self.current = 0
        self.success_count = 0
        self.error_count = 0
        self.status = "Подготовка..."
        self.done = False
        self.error = None


class AppState:
    def __init__(self):
        self.scheduler_running = False
        self.scheduler_thread = None
        self.scheduler_interval = 60
        self.logs = []
        self.max_logs = 1000
        self.download_tasks = {}  # task_id -> DownloadTask


state = AppState()


# Global task counter
_task_counter = 0


def _next_task_id():
    global _task_counter
    _task_counter += 1
    return f"dl_{_task_counter}"

# ============================================================
# API Response Helpers
# ============================================================
def json_response(handler, data, status=200):
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))


def read_json(path, default=None):
    """Read JSON file safely."""
    try:
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        log.warning(f"Failed to read {path}: {e}")
    return default if default is not None else []


def write_json(path, data):
    """Write JSON file safely."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except IOError as e:
        log.error(f"Failed to write {path}: {e}")
        return False


def add_log(level, message):
    """Add entry to application logs."""
    entry = {
        'time': time.strftime('%H:%M:%S'),
        'level': level,
        'message': message
    }
    state.logs.append(entry)
    if len(state.logs) > state.max_logs:
        state.logs = state.logs[-state.max_logs:]


# ============================================================
# Database Helper (SQLite)
# ============================================================
def get_db_path():
    db = DATA_DIR / 'database.db'
    if db.exists():
        return db
    old = Path(__file__).parent.parent / 'data' / 'database.db'
    return old if old.exists() else None


def db_query(sql, params=(), one=False):
    """Execute SQL query and return results."""
    db_path = get_db_path()
    if not db_path:
        return [] if not one else None
    
    import sqlite3
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall()
        if one:
            return rows[0] if rows else None
        return [dict(r) for r in rows]
    except Exception as e:
        log.error(f"DB error: {e}")
        return [] if not one else None
    finally:
        conn.close()


def db_execute(sql, params=()):
    """Execute SQL command."""
    db_path = get_db_path()
    if not db_path:
        return
    import sqlite3
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(sql, params)
        conn.commit()
    except Exception as e:
        log.error(f"DB execute error: {e}")
    finally:
        conn.close()


# ============================================================
# Core Classes
# ============================================================
class ProductObj:
    """Wrapper to make dicts behave like objects with .get() method."""
    def __init__(self, d):
        self._data = d
    
    def get(self, key, default=None):
        return self._data.get(key, default)
    
    @property
    def article(self):
        return self._data.get('article')
    
    @property
    def imt_id(self):
        return self._data.get('imt_id')
    
    @property
    def name(self):
        return self._data.get('name')
    
    @property
    def brand(self):
        return self._data.get('brand')
    
    @property
    def category(self):
        return self._data.get('category')
    
    @property
    def gender(self):
        return self._data.get('gender')
    
    @property
    def price(self):
        return self._data.get('price')
    
    @property
    def sale_price(self):
        return self._data.get('sale_price')
    
    @property
    def discount(self):
        return self._data.get('discount')
    
    @property
    def rating(self):
        return self._data.get('rating')
    
    @property
    def feedbacks(self):
        return self._data.get('feedbacks')
    
    @property
    def photos(self):
        return self._data.get('photos')
    
    @property
    def photo_urls(self):
        return self._data.get('photo_urls', [])
    
    @property
    def photo_fallbacks(self):
        return self._data.get('photo_fallbacks')
    
    @property
    def url(self):
        return f"https://www.wildberries.ru/catalog/{self._data.get('article')}/detail.aspx"
    
    @property
    def supplier_id(self):
        return self._data.get('supplier_id')


# ============================================================
# Core Operations
# ============================================================
def get_sellers():
    """Get all sellers from database."""
    sellers = db_query("SELECT * FROM sellers ORDER BY created_at DESC")
    if sellers:
        return sellers
    sellers_json = DATA_DIR / 'sellers.json'
    if sellers_json.exists():
        data = read_json(sellers_json, [])
        return [{'supplier_id': s.get('supplier_id', 0), 'brand': s.get('brand', ''), 
                 'enabled': s.get('enabled', True), 'created_at': ''} for s in data]
    return []


def add_seller(input_str):
    """Add a seller from URL or article."""
    try:
        if 'wildberries.ru' in input_str or 'catalog.wildberries.ru' in input_str:
            try:
                from src.engine.seller_manager import SellerManager
                from src.config import Config
                cfg = Config()
                mgr = SellerManager(cfg)
                result = mgr.add_from_input(input_str)
                if result:
                    add_log('INFO', f"Added seller via Manager: {input_str}")
                    return {'success': True, 'result': result}
            except ImportError:
                pass
            
            parts = input_str.split('/')
            supplier_id = None
            for i, p in enumerate(parts):
                if p == 'supplier_id' and i + 1 < len(parts):
                    supplier_id = parts[i + 1]
                    break
            
            if not supplier_id:
                return {'success': False, 'error': 'Не удалось извлечь supplier_id из ссылки'}
        else:
            article = input_str.strip()
            add_log('INFO', f"Adding seller by article: {article}")
            return {'success': False, 'error': 'Используйте полную ссылку на товар WB'}
        
        if supplier_id:
            brand = f"ID {supplier_id}"
            db_execute(
                "INSERT OR REPLACE INTO sellers (supplier_id, brand, enabled, created_at) VALUES (?, ?, 1, datetime('now'))",
                (int(supplier_id), brand)
            )
            add_log('INFO', f"Added seller: supplier_id={supplier_id}")
            return {'success': True, 'result': {'supplier_id': int(supplier_id), 'brand': brand}}
        
        return {'success': False, 'error': 'Не удалось определить продавца'}
        
    except Exception as e:
        add_log('ERROR', f"Error adding seller: {e}")
        return {'success': False, 'error': str(e)}


def toggle_seller(supplier_id, enabled):
    """Enable/disable seller."""
    try:
        db_execute("UPDATE sellers SET enabled = ? WHERE supplier_id = ?",
            (1 if enabled else 0, int(supplier_id)))
        add_log('INFO', f"Toggle seller: id={supplier_id}, enabled={enabled}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def delete_seller(supplier_id):
    """Delete seller."""
    try:
        db_execute("DELETE FROM sellers WHERE supplier_id = ?", (int(supplier_id),))
        add_log('INFO', f"Deleted seller: id={supplier_id}")
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def get_products():
    """Load products from new_products.json."""
    products_file = DATA_DIR / 'new_products.json'
    return read_json(products_file, [])


def run_check():
    """Run manual check for new products."""
    try:
        try:
            from src.engine.engine import Engine
            from src.config import Config
            
            cfg = Config()
            engine = Engine(cfg)
            
            def check_thread():
                try:
                    add_log('INFO', 'Starting manual check...')
                    result = engine.run()
                    add_log('INFO', f"Check completed: {len(result) if result else 0} products found")
                except Exception as e:
                    add_log('ERROR', f"Check failed: {e}")
            
            t = threading.Thread(target=check_thread, daemon=True)
            t.start()
            return {'success': True, 'message': 'Проверка запущена'}
            
        except ImportError:
            add_log('INFO', 'Engine not available, skipping check')
            return {'success': True, 'message': 'Модуль проверки недоступен'}
            
    except Exception as e:
        add_log('ERROR', f"Run check error: {e}")
        return {'success': False, 'error': str(e)}


import traceback as tb_module


def publish_products(articles, preview_card_path=None, post_text=None):
    """Publish selected products.
    
    Args:
        articles: List of article numbers to publish
        preview_card_path: Path to already-generated card image from preview (skip re-rendering)
        post_text: Pre-formatted post text from preview (skip re-formatting)
    """
    try:
        products = get_products()
        articles_normalized = [str(a) for a in articles]
        selected_dicts = [p for p in products if str(p.get('article')) in articles_normalized]
        
        if not selected_dicts:
            return {'success': False, 'error': 'Товары не найдены'}
        
        selected = [ProductObj(d) for d in selected_dicts]
        
        try:
            from src.telegram.publisher import TelegramPublisher
            
            # Используем текст из превью или генерируем
            category = 'Одежда'
            text = post_text
            if not text:
                try:
                    from src.content.formatter import PostFormatter
                    formatter = PostFormatter()
                    category = selected[0].get('category', 'Одежда')
                    text = formatter.format(category, selected)
                except ImportError:
                    lines = [f"{len(selected)} товаров", ""]
                    for p in selected:
                        name = p.get('name', '?')
                        art = p.get('article', '')
                        price = p.get('sale_price') or p.get('price', 0)
                        brand = p.get('brand', '')
                        lines.append(f"• {brand} — {name} (арт. {art}) — {price}₽")
                    text = "\n".join(lines)
                    category = 'Одежда'
            
            # Определяем карточку: используем готовую из превью или генерируем заново
            card_path = preview_card_path
            if not card_path:
                try:
                    from src.image.renderer import ImageRenderer
                    renderer = ImageRenderer()
                    card_path = renderer.render(selected)
                    log.info(f"Card rendered fresh: {card_path}")
                except Exception as e:
                    log.warning(f"Card render failed: {e}")
                    tb_module.print_exc()
            
            # Публикуем с карточкой
            publisher = TelegramPublisher()
            publisher.publish(category, selected, existing_photos=[card_path] if card_path else [])
            add_log('INFO', f"Published {len(selected)} products")
            
            remaining = [p for p in products if str(p.get('article')) not in articles_normalized]
            write_json(DATA_DIR / 'new_products.json', remaining)
            
            return {'success': True, 'published': len(selected)}
            
        except ImportError as ie:
            add_log('INFO', f"Would publish {len(selected)} products (publisher unavailable)")
            return {'success': True, 'published': len(selected), 'note': 'Publisher module not loaded'}
            
    except Exception as e:
        add_log('ERROR', f"Publish error: {e}")
        tb_module.print_exc()
        return {'success': False, 'error': str(e)}


def generate_preview(articles):
    """Generate preview post with text and optional card image.
    
    Оптимизация: кэшируем готовые карточки по sorted hash артикулов.
    Если те же товары уже рендерились — возвращаем сохранённую карточку мгновенно.
    """
    import traceback as tb_module
    import hashlib
    
    overall_start = time.time()
    
    log.info("")
    log.info("=" * 70)
    log.info("📋 PREVIEW GENERATION STARTED")
    log.info(f"   Articles: {articles}")
    log.info(f"   Count: {len(articles)} products")
    log.info("=" * 70)
    log.info("")
    
    try:
        products = get_products()
        articles_normalized = [str(a) for a in articles]
        selected_dicts = [p for p in products if str(p.get('article')) in articles_normalized]
        
        if not selected_dicts:
            return {'success': False, 'error': 'Товары не найдены'}
        
        selected = [ProductObj(d) for d in selected_dicts]
        
        # Generate text
        try:
            from src.content.formatter import PostFormatter
            formatter = PostFormatter()
            category = selected[0].category or 'Одежда'
            text = formatter.format(category, selected)
        except ImportError:
            lines = [f"{len(selected)} товаров", ""]
            for p in selected:
                name = p.get('name', '?')
                art = p.get('article', '')
                price = p.get('sale_price') or p.get('price', 0)
                brand = p.get('brand', '')
                lines.append(f"• {brand} — {name} (арт. {art}) — {price}₽")
            text = "\n".join(lines)
        
        # === КЭШИРОВАНИЕ КАРТОЧЕК (оптимизация скорости) ===
        cache_key = hashlib.md5(",".join(sorted(articles_normalized)).encode()).hexdigest()[:12]
        preview_cache_dir = DATA_DIR / 'preview_cache'
        preview_cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Проверяем кэш
        cached_card = preview_cache_dir / f"{cache_key}.webp"
        if cached_card.exists():
            elapsed = time.time() - overall_start
            card_size = cached_card.stat().st_size // 1024
            log.info("")
            log.info("-" * 70)
            log.info("✅ STAGE TEXT: Done")
            log.info("💾 STAGE CARD: CACHE HIT!")
            log.info(f"   Card: {cached_card.name} ({card_size}KB)")
            log.info(f"   ⏱️  TOTAL TIME: {elapsed:.1f}s")
            log.info("=" * 70)
            log.info("")
            
            return {
                'success': True,
                'text': text,
                'card_path': str(cached_card),
                'card_cached': True,
                'articles': list(articles),
                'products': [{'article': p.get('article'), 'name': p.get('name'), 'price': p.get('sale_price') or p.get('price')} for p in selected]
            }
        
        # Генерируем карточку
        card_path = None
        render_success = False
        
        log.info("")
        log.info("-" * 70)
        log.info("💾 STAGE CARD: Rendering fresh card...")
        
        try:
            from src.image.renderer import ImageRenderer
            renderer = ImageRenderer()
            card_path = renderer.render(selected)
            if card_path:
                # Копируем в кэш
                import shutil
                cached_card_path = preview_cache_dir / f"{cache_key}.webp"
                shutil.copy2(card_path, cached_card_path)
                render_success = True
                log.info(f"💾 Card saved to cache: {cached_card_path.name}")
        except (ImportError, Exception) as e:
            log.warning(f"Card rendering failed: {e}")
        
        elapsed = time.time() - overall_start
        log.info("")
        log.info("=" * 70)
        if render_success:
            card_size = Path(card_path).stat().st_size // 1024
            log.info("✅ PREVIEW COMPLETE")
            log.info(f"   Card: {card_size}KB")
            log.info(f"   Cached: {cached_card.name}")
        else:
            log.info("⚠️  PREVIEW COMPLETE (no card)")
        log.info(f"   ⏱️  TOTAL TIME: {elapsed:.1f}s")
        log.info("=" * 70)
        log.info("")
        
        result = {
            'success': True,
            'text': text,
            'card_path': card_path,
            'articles': list(articles),
            'products': [{'article': p.get('article'), 'name': p.get('name'), 'price': p.get('sale_price') or p.get('price')} for p in selected]
        }
        
        return result
        
    except Exception as e:
        elapsed = time.time() - overall_start
        log.error("")
        log.error("=" * 70)
        log.error(f"❌ PREVIEW FAILED after {elapsed:.1f}s")
        log.error(f"   Error: {e}")
        log.error(f"   Traceback:\n{tb_module.format_exc()}")
        log.error("=" * 70)
        log.error("")
        
        add_log('ERROR', f"Preview error: {e}")
        return {'success': False, 'error': str(e)}


def get_statistics():
    """Get dashboard statistics."""
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


def get_settings():
    """Get application settings from database."""
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


def save_settings(new_settings):
    """Save settings to database."""
    try:
        for key, value in new_settings.items():
            db_execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (key, str(value)))
        add_log('INFO', f"Settings saved: {list(new_settings.keys())}")
        return {'success': True}
    except Exception as e:
        add_log('ERROR', f"Save settings error: {e}")
        return {'success': False, 'error': str(e)}


def start_scheduler(interval=60):
    """Start scheduler thread."""
    if state.scheduler_running:
        return {'success': False, 'error': 'Планировщик уже запущен'}
    
    state.scheduler_interval = interval
    
    def scheduler_loop():
        add_log('INFO', f"Scheduler started (interval: {interval} min)")
        while state.scheduler_running:
            time.sleep(60)
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
    """Stop scheduler thread."""
    if not state.scheduler_running:
        return {'success': False, 'error': 'Планировщик остановлен'}
    
    state.scheduler_running = False
    if state.scheduler_thread:
        state.scheduler_thread.join(timeout=5)
    add_log('INFO', 'Scheduler stopped by user')
    return {'success': True}


# ============================================================
# Photo Download API (ML Dataset) — Using NEW reliable image_finder
# ============================================================
ANNOTATIONS_FILE = DATA_DIR / 'photo_annotations.json'
ANNOTATOR_IMAGES_DIR = DATA_DIR / 'images' / 'annotator_articles'
BASKET_CACHE_FILE = DATA_DIR / 'images' / 'basket_cache.json'

# Import new reliable image finder module
from src.wb.image_finder import WBImageService, PhotoSize


def download_photos_reliable(articles_list, max_indexes=15):
    """100% надёжное скачивание через existing collect_photos.py скрипт."""
    import subprocess
    
    if isinstance(articles_list, str):
        articles_list = [a.strip() for a in articles_list.split(',') if a.strip()]
    
    if not articles_list:
        return {'success': False, 'error': 'Нет артикулов'}
    
    # Создаём временный файл с артикулами
    import tempfile
    tmp_file = None
    try:
        tmp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
        for art in articles_list[:50]:  # макс 50 статей за раз
            tmp_file.write(art.strip() + '\n')
        tmp_file.close()
        
        # Запускаем collect_photos.py
        script_path = Path(__file__).parent.parent / 'scripts' / 'collect_photos.py'
        
        result = subprocess.run(
            ['python', str(script_path), '--from-file', tmp_file.name, '--max-indexes', str(max_indexes)],
            cwd=Path(__file__).parent.parent,
            capture_output=True,
            text=True,
            timeout=300  # 5 минут таймаут
        )
        
        # Парсим вывод
        output = result.stdout + result.stderr
        
        # Считаем скачанные файлы после запуска
        downloaded = len(list(ANNOTATOR_IMAGES_DIR.glob('*.webp')))
        
        return {
            'success': True,
            'downloaded': downloaded,
            'total_articles': len(articles_list),
            'stdout': result.stdout[-500:] if result.stdout else '',
            'stderr': result.stderr[-500:] if result.stderr else ''
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        if tmp_file and tmp_file.name:
            try:
                import os
                os.unlink(tmp_file.name)
            except:
                pass


def download_photos_from_wb(data):
    """Надежное скачивание фото с WB через новый модуль image_finder (wbbasket.ru)."""
    import asyncio
    
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
    
    async def run_download():
        service = WBImageService(cache_file=BASKET_CACHE_FILE, output_dir=ANNOTATOR_IMAGES_DIR)
        all_photos = {}
        total_count = 0
        
        try:
            for article in articles_list:
                photos = await service.downloader.download_article_photos(
                    article=article,
                    max_indexes=max_indexes,
                    max_baskets=3,
                    sizes=['big', 'large']
                )
                all_photos[article] = [str(p) for p in photos]
                total_count += len(photos)
        finally:
            await service.shutdown()
        
        return {
            'success': True,
            'downloaded': total_count,
            'articles_processed': len(articles_list),
            'per_article': all_photos,
            'cache_entries': len(service.cache._cache),
            'saved_to': str(ANNOTATOR_IMAGES_DIR)
        }
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(run_download())
    finally:
        loop.close()


def start_photo_download(data):
    """Start async photo download from catalog or manual articles."""
    import asyncio
    import aiohttp
    from PIL import Image
    from io import BytesIO
    
    articles_input = data.get('articles', [])
    max_indexes = data.get('max_indexes', 15)
    
    # Get articles
    if isinstance(articles_input, dict) and articles_input.get('source') == 'catalog':
        count = articles_input.get('count', 50)
        # Load from new_products.json
        try:
            with open(DATA_DIR / 'new_products.json', 'r', encoding='utf-8') as f:
                products = json.load(f)
            articles_list = [str(p['article']) for p in products[:count]]
        except Exception as e:
            return {'success': False, 'error': str(e)}
    elif isinstance(articles_input, list):
        articles_list = articles_input
    else:
        return {'success': False, 'error': 'Invalid articles format'}
    
    if not articles_list:
        return {'success': False, 'error': 'No articles to download'}
    
    ANNOTATOR_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    
    basket = data.get('basket', 'first')
    
    async def download_article(article_str):
        article = int(article_str)
        vol = article // 100000
        part = article // 1000
        
        # Get baskets
        try:
            from src.wb.catalog import _estimate_baskets
            bs = _estimate_baskets(article)[:1] if basket == 'first' else _estimate_baskets(article)
        except Exception:
            bs = [25]
        
        downloaded = 0
        for idx in range(1, max_indexes + 1):
            for b in bs:
                path_img = f"/vol{vol}/part{part}/{article}/images/big/{idx}.webp"
                urls = [
                    f"https://basket-{b}.wb.ru{path_img}",
                    f"https://basket-{b}.wbbasket.ru{path_img}",
                    f"https://basket-{b}.wildberries.ru{path_img}",
                ]
                
                for url in urls:
                    try:
                        timeout = aiohttp.ClientTimeout(total=10)
                        async with aiohttp.ClientSession(timeout=timeout) as sess:
                            async with sess.get(url, raise_for_status=False) as resp:
                                if resp.status != 200:
                                    continue
                                data_bytes = bytearray()
                                while True:
                                    chunk = await asyncio.wait_for(resp.content.read(8192), timeout=3.0)
                                    if not chunk:
                                        break
                                    data_bytes.extend(chunk)
                                    if 10000 <= len(data_bytes) <= 5000000:
                                        try:
                                            test = Image.open(BytesIO(bytes(data_bytes)))
                                            test.verify()
                                            break
                                        except Exception:
                                            pass
                                data_bytes = bytes(data_bytes)
                                if 10000 <= len(data_bytes) <= 5000000:
                                    try:
                                        img = Image.open(BytesIO(data_bytes))
                                        img.verify()
                                        out_name = f"{article}_idx{idx}_{b}.webp"
                                        out_path = ANNOTATOR_IMAGES_DIR / out_name
                                        if not out_path.exists():
                                            out_path.write_bytes(data_bytes)
                                        downloaded += 1
                                        return article, downloaded, None
                                    except Exception:
                                        pass
                    except Exception:
                        continue
        return article, downloaded, "No valid photos found"
    
    async def run_all():
        total_downloaded = 0
        errors = []
        tasks = [download_article(a) for a in articles_list]
        for coro in asyncio.as_completed(tasks):
            try:
                art, cnt, err = await coro
                if err:
                    errors.append(f"{art}: {err}")
                else:
                    total_downloaded += cnt
            except Exception as e:
                errors.append(str(e))
        return total_downloaded, errors
    
    # Run async
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        total, errs = loop.run_until_complete(run_all())
        return {
            'success': True,
            'message': f'Downloaded {total} photos',
            'errors': errs[:5]
        }
    finally:
        loop.close()


def _load_annotations():
    """Load photo annotations from JSON file."""
    if ANNOTATIONS_FILE.exists():
        try:
            with open(ANNOTATIONS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def _save_annotations(data):
    """Save photo annotations to JSON file."""
    ANNOTATIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ANNOTATIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def list_annotator_photos():
    """List all photos from annotator_articles directory."""
    if not ANNOTATOR_IMAGES_DIR.exists():
        return []
    
    photos = []
    for f in ANNOTATOR_IMAGES_DIR.glob('*.webp'):
        # Extract article number from filename like "445436608_idx1_25.webp"
        name = f.stem  # e.g., "445436608_idx1_25"
        article = name.split('_')[0]
        idx = name.split('_')[1].replace('idx', '') if 'idx' in name else '1'
        photos.append({
            'filename': f.name,
            'article': article,
            'index': idx,
            'url': f'/images/annotator_articles/{f.name}'
        })
    
    # Group by article
    by_article = {}
    for p in photos:
        art = p['article']
        if art not in by_article:
            by_article[art] = []
        by_article[art].append(p)
    
    return list(by_article.keys())


def clear_cache():
    """Clear cache and photos."""
    try:
        images_dir = DATA_DIR / 'images'
        if images_dir.exists():
            import shutil
            for item in images_dir.iterdir():
                if item.is_file():
                    item.unlink()
                else:
                    shutil.rmtree(item)
        
        checked = DATA_DIR / 'checked_articles.json'
        if checked.exists():
            write_json(checked, [])
        
        blacklist = DATA_DIR / 'blacklist.json'
        if blacklist.exists():
            write_json(blacklist, [])
        
        add_log('INFO', 'Cache cleared')
        return {'success': True}
    except Exception as e:
        add_log('ERROR', f"Clear cache error: {e}")
        return {'success': False, 'error': str(e)}


# ============================================================
# HTTP Request Handler
# ============================================================
class GUIHandler(BaseHTTPRequestHandler):
    """HTTP request handler with API routes."""
    
    def log_message(self, format, *args):
        """Override to use our logger."""
        log.info(f"{self.client_address[0]} - {format % args}")
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests."""
        parsed = urlparse(self.path)
        path = parsed.path.rstrip('/')
        
        if path == '' or path == '/':
            path = '/index.html'
        
        if path.startswith('/static/'):
            file_path = STATIC_DIR / Path(path).name
            if file_path.exists() and file_path.is_file():
                self._serve_file(file_path)
                return
        elif path.startswith('/static'):
            file_path = STATIC_DIR / path.lstrip('/')
            if file_path.exists() and file_path.is_file():
                self._serve_file(file_path)
                return
        
        # Раздача карточек из data/images/cards/, src/data/images/cards/ и data/preview_cache/
        elif path.startswith('/cards/'):
            card_filename = path[len('/cards/'):]
            # Пробуем несколько директорий в порядке приоритета
            search_dirs = [
                DATA_DIR / 'images' / 'cards',
                Path(__file__).parent.parent / 'src' / 'data' / 'images' / 'cards',
                DATA_DIR / 'preview_cache',  # Preview cache (используется при генерации превью)
            ]
            for card_dir in search_dirs:
                card_path = card_dir / card_filename
                if card_path.exists() and card_path.is_file():
                    self._serve_file(card_path)
                    return
        
        # Раздача фото из data/images/
        elif path.startswith('/images/'):
            img_filename = path[len('/images/'):]
            img_path = DATA_DIR / 'images' / img_filename
            if img_path.exists() and img_path.is_file():
                self._serve_file(img_path)
                return
            # Also try annotator_articles subfolder
            for subdir in ['annotator_articles', 'original']:
                alt_path = DATA_DIR / 'images' / subdir / img_filename
                if alt_path.exists() and alt_path.is_file():
                    self._serve_file(alt_path)
                    return
        
        try:
            if path == '/api/statistics':
                json_response(self, get_statistics())
            elif path == '/api/sellers':
                json_response(self, get_sellers())
            elif path == '/api/products':
                add_log('INFO', 'GET /api/products requested')
                result = get_products()
                add_log('INFO', f'GET /api/products returning {len(result) if result else 0} products')
                json_response(self, result)
            elif path == '/api/settings':
                json_response(self, get_settings())
            elif path == '/api/scheduler/status':
                json_response(self, {'running': state.scheduler_running})
            elif path == '/api/logs':
                json_response(self, state.logs[-100:])
            elif path == '/favicon.ico':
                self.send_response(404)
                self.end_headers()
            # Photo annotation GET endpoints
            elif path == '/api/photos/list':
                photos = list_annotator_photos()
                json_response(self, {'photos': photos})
            elif path == '/api/annotations':
                ann = _load_annotations()
                json_response(self, {'annotations': ann})
            else:
                file_path = STATIC_DIR / path.lstrip('/')
                if file_path.exists() and file_path.is_file():
                    self._serve_file(file_path)
                else:
                    json_response(self, {'error': 'Not found'}, 404)
        except Exception as e:
            add_log('ERROR', f"GET error: {e}")
            json_response(self, {'error': str(e)}, 500)
    
    def do_POST(self):
        """Handle POST requests."""
        parsed = urlparse(self.path)
        path = parsed.path.rstrip('/')
        
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else b'{}'
            
            try:
                data = json.loads(body) if body else {}
            except json.JSONDecodeError:
                data = {}
            
            if path == '/api/sellers/add':
                result = add_seller(data.get('input', ''))
                json_response(self, result)
            elif path == '/api/sellers/toggle':
                result = toggle_seller(data.get('id'), data.get('enabled'))
                json_response(self, result)
            elif path.startswith('/api/sellers/') and path.endswith('/delete'):
                sid = path.split('/')[-2]
                result = delete_seller(sid)
                json_response(self, result)
            elif path == '/api/check':
                result = run_check()
                json_response(self, result)
            elif path == '/api/publish':
                # Передаём готовую карточку из превью и текст поста — избегаем повторной генерации
                result = publish_products(
                    articles=data.get('articles', []),
                    preview_card_path=data.get('preview_card_path'),
                    post_text=data.get('text')
                )
                json_response(self, result)
            elif path == '/api/preview':
                add_log('INFO', f'POST /api/preview articles={data.get("articles", [])}')
                result = generate_preview(data.get('articles', []))
                add_log('INFO', f'POST /api/preview result={result}')
                json_response(self, result)
            elif path == '/api/settings':
                result = save_settings(data)
                json_response(self, result)
            elif path == '/api/scheduler/start':
                result = start_scheduler(data.get('interval', 60))
                json_response(self, result)
            elif path == '/api/scheduler/stop':
                result = stop_scheduler()
                json_response(self, result)
            elif path == '/api/scheduler/settings':
                if 'interval' in data:
                    state.scheduler_interval = data['interval']
                json_response(self, {'success': True})
            elif path == '/api/logs/clear':
                state.logs.clear()
                json_response(self, {'success': True})
            
            # НОВЫЙ: Чтение последних N строк из bot_debug.txt
            elif path == '/api/logs/raw':
                limit = int(data.get('limit', 500))
                try:
                    if LOG_FILE.exists():
                        with open(LOG_FILE, 'r', encoding='utf-8') as f:
                            all_lines = f.read()
                        # Разбиваем на строки и берём последние limit
                        lines = all_lines.strip().split('\n') if all_lines.strip() else []
                        last_lines = lines[-limit:] if len(lines) > limit else lines
                        json_response(self, {'lines': last_lines, 'total': len(lines)})
                    else:
                        json_response(self, {'lines': [], 'total': 0})
                except Exception as e:
                    json_response(self, {'lines': [f'Ошибка чтения логов: {e}'], 'total': 0})
            # Photo annotation endpoints
            elif path == '/api/photos/list':
                photos = list_annotator_photos()
                json_response(self, {'photos': photos})
            elif path == '/api/annotations':
                ann = _load_annotations()
                json_response(self, {'annotations': ann})
            elif path == '/api/annotations/save':
                article = data.get('article')
                label = data.get('label')  # 1 = good, 0 = bad
                if article and label is not None:
                    ann = _load_annotations()
                    ann[str(article)] = int(label)
                    _save_annotations(ann)
                    json_response(self, {'success': True})
                else:
                    json_response(self, {'success': False, 'error': 'Missing article or label'}, 400)
            elif path == '/api/annotations/export':
                ann = _load_annotations()
                export_data = {
                    'version': '1.0',
                    'created': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'total': len(ann),
                    'good': sum(1 for v in ann.values() if v == 1),
                    'bad': sum(1 for v in ann.values() if v == 0),
                    'data': ann
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Disposition', f'attachment; filename="photo_dataset_{int(time.time())}.json"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(export_data, ensure_ascii=False, indent=2).encode('utf-8'))
            # Скачать фото
            elif path == '/api/photos/download/start':
                result = start_photo_download(data)
                json_response(self, result)
            
            elif path == '/api/photos/remove':
                article = data.get('article')
                import shutil
                target_dir = ANNOTATOR_IMAGES_DIR / str(article)
                if target_dir.exists():
                    shutil.rmtree(target_dir)
                add_log('INFO', f'Removed article {article}')
                json_response(self, {'success': True})
            
            # Скачать фото с WB (POST)
            elif path == '/api/photos/download':
                result = download_photos_from_wb(data)
                json_response(self, result)
            
            elif path == '/api/annotations/clear':
                _save_annotations({})
                add_log('INFO', 'All annotations cleared')
                json_response(self, {'success': True})
            
            elif path == '/api/cache/clear':
                result = clear_cache()
                json_response(self, result)
            else:
                json_response(self, {'error': 'Not found'}, 404)
        except Exception as e:
            add_log('ERROR', f"POST error: {e}")
            json_response(self, {'error': str(e)}, 500)
    
    def do_DELETE(self):
        """Handle DELETE requests."""
        parsed = urlparse(self.path)
        path = parsed.path.rstrip('/')
        
        try:
            if path.startswith('/api/sellers/'):
                parts = path.split('/')
                if len(parts) >= 4 and parts[3] != 'toggle':
                    sid = parts[3]
                    result = delete_seller(sid)
                    json_response(self, result)
                else:
                    json_response(self, {'error': 'Not found'}, 404)
            else:
                json_response(self, {'error': 'Not found'}, 404)
        except Exception as e:
            add_log('ERROR', f"DELETE error: {e}")
            json_response(self, {'error': str(e)}, 500)
    
    def _serve_file(self, file_path):
        """Serve a static file."""
        ext = file_path.suffix.lower()
        content_types = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
        }
        
        content_type = content_types.get(ext, 'application/octet-stream')
        
        try:
            with open(file_path, 'rb') as f:
                data = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', len(data))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except IOError as e:
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(f"Error reading file: {e}".encode())


# ============================================================
# Main
# ============================================================
def main():
    """Start the web GUI server."""
    server = HTTPServer(('0.0.0.0', PORT), GUIHandler)
    log.info("=" * 60)
    log.info("WB Up Web GUI Server")
    log.info(f"URL: http://localhost:{PORT}")
    log.info(f"Static dir: {STATIC_DIR}")
    log.info(f"Data dir: {DATA_DIR}")
    log.info("=" * 60)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Server stopped")
        stop_scheduler()
        server.server_close()


if __name__ == '__main__':
    main()