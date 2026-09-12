"""
База данных SQLite для проекта.

Таблицы:
    - sellers: продавцы (supplier_id, brand, enabled, created_at)
    - products: товары (article, supplier_id, name, price, rating, feedbacks)
    - publications: история публикаций (article, supplier_id, status, published_at)
    - settings: настройки (key, value)
    - cache: кэш (key, data, expires_at)
"""

from __future__ import annotations
import sqlite3
import json
import time
from pathlib import Path
from src.utils.logger import get_logger

logger = get_logger("db")

import threading

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "database.db"
_local = threading.local()


class PooledConnection(sqlite3.Connection):
    """Потокобезопасное постоянное подключение SQLite."""
    def close(self):
        # Откатываем незавершенные транзакции и оставляем соединение открытым в пуле потока
        if self.in_transaction:
            try:
                self.rollback()
            except Exception:
                pass

    def force_close(self):
        super().close()


def _get_conn() -> PooledConnection:
    """Возвращает оптимизированное потокобезопасное подключение к SQLite."""
    conn = getattr(_local, "conn", None)
    if conn is not None:
        try:
            conn.execute("SELECT 1")
            return conn
        except Exception:
            try:
                conn.force_close()
            except Exception:
                pass
            _local.conn = None

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(
        str(DB_PATH),
        timeout=10.0,
        check_same_thread=False,
        factory=PooledConnection,
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-64000")      # 64MB RAM page cache
    conn.execute("PRAGMA temp_store=MEMORY")      # Сортировки и временные таблицы в RAM
    conn.execute("PRAGMA mmap_size=268435456")    # 256MB memory-mapped I/O
    conn.execute("PRAGMA busy_timeout=5000")      # 5s таймаут при параллельных запросах
    conn.execute("PRAGMA foreign_keys=ON")
    _local.conn = conn
    return conn


def close_connections():
    """Принудительно закрывает подключение текущего потока (для тестов и shutdown)."""
    conn = getattr(_local, "conn", None)
    if conn is not None:
        try:
            conn.force_close()
        except Exception:
            pass
        _local.conn = None


def optimize():
    """Выполняет PRAGMA optimize и контрольную точку WAL для максимального быстродействия."""
    conn = _get_conn()
    try:
        conn.execute("PRAGMA optimize")
        conn.execute("PRAGMA wal_checkpoint(PASSIVE)")
        logger.info("SQLite database optimized: PRAGMA optimize & wal_checkpoint executed")
    except Exception as e:
        logger.warning(f"DB optimize warning: {e}")


def init():
    """Создаёт таблицы и вторичные индексы, если их нет."""
    conn = _get_conn()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS sellers (
                supplier_id INTEGER PRIMARY KEY,
                brand TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS products (
                article INTEGER PRIMARY KEY,
                supplier_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                price REAL DEFAULT 0,
                sale_price REAL DEFAULT 0,
                rating REAL DEFAULT 0,
                feedbacks INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (supplier_id) REFERENCES sellers(supplier_id)
            );

            CREATE TABLE IF NOT EXISTS publications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                article INTEGER NOT NULL,
                supplier_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                published_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (article) REFERENCES products(article),
                FOREIGN KEY (supplier_id) REFERENCES sellers(supplier_id)
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                expires_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS publication_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                articles TEXT NOT NULL,
                post_text TEXT,
                preview_card_path TEXT,
                scheduled_at TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                error_message TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS ai_card_ratings (
                article INTEGER PRIMARY KEY,
                best_path TEXT,
                best_index INTEGER,
                best_score REAL,
                has_card INTEGER DEFAULT 0,
                total_photos INTEGER DEFAULT 0,
                updated_at TEXT DEFAULT (datetime('now'))
            );

            -- Вторичные индексы для ускорения поиска O(log N)
            CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
            CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating DESC);
            CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_publications_article ON publications(article);
            CREATE INDEX IF NOT EXISTS idx_publications_supplier ON publications(supplier_id);
            CREATE INDEX IF NOT EXISTS idx_publications_published ON publications(published_at DESC);
            CREATE INDEX IF NOT EXISTS idx_queue_status_created ON publication_queue(status, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_ai_ratings_has_card ON ai_card_ratings(has_card, best_score DESC);
            CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
        """)
        conn.commit()

        # Миграция: check_interval_hours → check_interval_minutes
        try:
            row = conn.execute(
                "SELECT value FROM settings WHERE key = ?", ("check_interval_hours",)
            ).fetchone()
            if row:
                old_hours = int(row["value"])
                new_minutes = old_hours * 60
                conn.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                    ("check_interval_minutes", str(new_minutes)),
                )
                conn.execute("DELETE FROM settings WHERE key = ?", ("check_interval_hours",))
                conn.commit()
                logger.info("Migrated check_interval_hours=%sh to check_interval_minutes=%smin", old_hours, new_minutes)
        except Exception as e:
            logger.warning("Migration check_interval_hours skipped: %s", e)

        logger.info("Database initialized with indexes & high-performance PRAGMAs: %s", DB_PATH)
    finally:
        conn.close()


# =============================================
# SELLERS
# =============================================

def get_all_sellers():
    """Возвращает всех продавцов."""
    conn = _get_conn()
    try:
        rows = conn.execute(
            "SELECT supplier_id, brand, enabled FROM sellers ORDER BY brand"
        ).fetchall()
        return [
            {
                "supplier_id": row["supplier_id"],
                "brand": row["brand"],
                "enabled": bool(row["enabled"]),
            }
            for row in rows
        ]
    finally:
        conn.close()


def get_enabled_sellers():
    """Возвращает активных продавцов."""
    conn = _get_conn()
    try:
        rows = conn.execute(
            "SELECT supplier_id, brand, enabled FROM sellers WHERE enabled = 1 ORDER BY brand"
        ).fetchall()
        return [
            {
                "supplier_id": row["supplier_id"],
                "brand": row["brand"],
                "enabled": True,
            }
            for row in rows
        ]
    finally:
        conn.close()


def add_seller(supplier_id: int, brand: str):
    """Добавляет продавца."""
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO sellers (supplier_id, brand) VALUES (?, ?)",
            (supplier_id, brand),
        )
        conn.commit()
        logger.info("Seller added: %s (%s)", brand, supplier_id)
    finally:
        conn.close()


def toggle_seller(supplier_id: int):
    """Переключает enabled у продавца."""
    conn = _get_conn()
    try:
        conn.execute(
            "UPDATE sellers SET enabled = CASE WHEN enabled THEN 0 ELSE 1 END WHERE supplier_id = ?",
            (supplier_id,),
        )
        conn.commit()
    finally:
        conn.close()


def delete_seller(supplier_id: int):
    """Удаляет продавца и все связанные записи."""
    conn = _get_conn()
    try:
        # Сначала удаляем связанные записи (из-за FOREIGN KEY)
        conn.execute("DELETE FROM publications WHERE supplier_id = ?", (supplier_id,))
        conn.execute("DELETE FROM products WHERE supplier_id = ?", (supplier_id,))
        conn.execute("DELETE FROM sellers WHERE supplier_id = ?", (supplier_id,))
        conn.commit()
        logger.info("Seller deleted: %s", supplier_id)
    finally:
        conn.close()


def seller_exists(supplier_id: int) -> bool:
    """Проверяет, существует ли продавец."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT 1 FROM sellers WHERE supplier_id = ?", (supplier_id,)
        ).fetchone()
        return row is not None
    finally:
        conn.close()


# =============================================
# SETTINGS
# =============================================

_DEFAULT_SETTINGS = {
    "min_rating": "4.7",
    "max_price": "3500",
    "products_per_seller": "2",
    "mode": "mixed",
    "check_interval_minutes": "60",
}


def get_setting(key: str, default: str = "") -> str:
    """Возвращает значение настройки."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT value FROM settings WHERE key = ?", (key,)
        ).fetchone()
        if row:
            return row["value"]
        return _DEFAULT_SETTINGS.get(key, default)
    finally:
        conn.close()


def set_setting(key: str, value: str):
    """Устанавливает значение настройки."""
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            (key, value),
        )
        conn.commit()
        logger.info("Setting updated: %s = %s", key, value)
    finally:
        conn.close()


def get_all_settings() -> dict:
    """Возвращает все настройки."""
    settings = dict(_DEFAULT_SETTINGS)
    conn = _get_conn()
    try:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        for row in rows:
            settings[row["key"]] = row["value"]
    finally:
        conn.close()
    return settings


# =============================================
# CACHE
# =============================================

def cache_get(key: str) -> dict | None:
    """Возвращает данные из кэша, если не истекли."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT data, expires_at FROM cache WHERE key = ?", (key,)
        ).fetchone()
        if row and row["expires_at"] > time.time():
            return json.loads(row["data"])
        return None
    finally:
        conn.close()


def cache_set(key: str, data: dict, ttl_seconds: int = 3600):
    """Сохраняет данные в кэш."""
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO cache (key, data, expires_at) VALUES (?, ?, ?)",
            (key, json.dumps(data, ensure_ascii=False), time.time() + ttl_seconds),
        )
        conn.commit()
    finally:
        conn.close()


def cache_clean():
    """Удаляет истёкшие записи из кэша."""
    conn = _get_conn()
    try:
        conn.execute("DELETE FROM cache WHERE expires_at <= ?", (time.time(),))
        conn.commit()
    finally:
        conn.close()


# =============================================
# PUBLICATIONS HISTORY
# =============================================

def add_publication(article: int, supplier_id: int, status: str = "published"):
    """Записывает публикацию в историю."""
    conn = _get_conn()
    try:
        # Убеждаемся, что товар есть в таблице products (для FOREIGN KEY)
        conn.execute(
            "INSERT OR IGNORE INTO products (article, supplier_id, name) VALUES (?, ?, ?)",
            (article, supplier_id, f"article_{article}"),
        )
        conn.execute(
            "INSERT INTO publications (article, supplier_id, status) VALUES (?, ?, ?)",
            (article, supplier_id, status),
        )
        conn.commit()
    finally:
        conn.close()


def add_publications_batch(products: list, status: str = "published"):
    """Записывает несколько публикаций в одном соединении (быстрее)."""
    conn = _get_conn()
    try:
        for product in products:
            conn.execute(
                "INSERT OR IGNORE INTO products (article, supplier_id, name) VALUES (?, ?, ?)",
                (product.article, product.supplier_id, f"article_{product.article}"),
            )
            conn.execute(
                "INSERT INTO publications (article, supplier_id, status) VALUES (?, ?, ?)",
                (product.article, product.supplier_id, status),
            )
        conn.commit()
        logger.info("Batch inserted %s publications", len(products))
    finally:
        conn.close()


def is_published(article: int) -> bool:
    """Проверяет, был ли товар уже опубликован."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM publications WHERE article = ?",
            (article,),
        ).fetchone()
        return row["cnt"] > 0 if row else False
    finally:
        conn.close()


def get_publications_count() -> int:
    """Возвращает количество публикаций."""
    conn = _get_conn()
    try:
        row = conn.execute("SELECT COUNT(*) as cnt FROM publications").fetchone()
        return row["cnt"] if row else 0
    finally:
        conn.close()


def get_publications_today() -> int:
    """Возвращает количество публикаций за сегодня."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM publications WHERE date(published_at) = date('now')"
        ).fetchone()
        return row["cnt"] if row else 0
    finally:
        conn.close()


def get_publications_by_seller() -> list[dict]:
    """Возвращает количество публикаций по каждому продавцу."""
    conn = _get_conn()
    try:
        rows = conn.execute("""
            SELECT
                p.supplier_id,
                COALESCE(s.brand, 'Unknown') as brand,
                COUNT(*) as count
            FROM publications p
            LEFT JOIN sellers s ON s.supplier_id = p.supplier_id
            GROUP BY p.supplier_id
            ORDER BY count DESC
        """).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_publications_by_day(days: int = 7) -> list[dict]:
    """Возвращает количество публикаций по дням за последние N дней."""
    conn = _get_conn()
    try:
        rows = conn.execute("""
            SELECT
                date(published_at) as day,
                COUNT(*) as count
            FROM publications
            WHERE published_at >= datetime('now', ? || ' days')
            GROUP BY date(published_at)
            ORDER BY day DESC
        """, (f"-{days}",)).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_stats_summary() -> dict:
    """Возвращает сводку статистики."""
    conn = _get_conn()
    try:
        total = conn.execute("SELECT COUNT(*) as cnt FROM publications").fetchone()["cnt"]
        today = conn.execute(
            "SELECT COUNT(*) as cnt FROM publications WHERE date(published_at) = date('now')"
        ).fetchone()["cnt"]
        this_week = conn.execute(
            "SELECT COUNT(*) as cnt FROM publications WHERE published_at >= datetime('now', '-7 days')"
        ).fetchone()["cnt"]
        this_month = conn.execute(
            "SELECT COUNT(*) as cnt FROM publications WHERE published_at >= datetime('now', '-30 days')"
        ).fetchone()["cnt"]
        unique_products = conn.execute(
            "SELECT COUNT(DISTINCT article) as cnt FROM publications"
        ).fetchone()["cnt"]
        return {
            "total": total,
            "today": today,
            "this_week": this_week,
            "this_month": this_month,
            "unique_products": unique_products,
        }
    finally:
        conn.close()


# =============================================
# PUBLICATION QUEUE
# =============================================

def queue_add(
    articles: list[int | str],
    post_text: str | None = None,
    preview_card_path: str | None = None,
    scheduled_at: str | None = None,
) -> int:
    """Добавляет пост в очередь на публикацию."""
    conn = _get_conn()
    try:
        articles_json = json.dumps([int(a) for a in articles if str(a).isdigit()])
        cur = conn.execute(
            """
            INSERT INTO publication_queue (articles, post_text, preview_card_path, scheduled_at, status)
            VALUES (?, ?, ?, ?, 'pending')
            """,
            (articles_json, post_text, preview_card_path, scheduled_at),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def queue_list(status: str | None = None, limit: int = 50) -> list[dict]:
    """Возвращает список постов в очереди."""
    conn = _get_conn()
    try:
        if status:
            rows = conn.execute(
                "SELECT * FROM publication_queue WHERE status = ? ORDER BY id DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM publication_queue ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()

        items = []
        for r in rows:
            d = dict(r)
            try:
                d["articles"] = json.loads(d["articles"])
            except Exception:
                d["articles"] = []
            items.append(d)
        return items
    finally:
        conn.close()


def queue_get(queue_id: int) -> dict | None:
    """Возвращает элемент очереди по id."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM publication_queue WHERE id = ?", (queue_id,)
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        try:
            d["articles"] = json.loads(d["articles"])
        except Exception:
            d["articles"] = []
        return d
    finally:
        conn.close()


def queue_delete(queue_id: int) -> bool:
    """Удаляет элемент из очереди."""
    conn = _get_conn()
    try:
        cur = conn.execute("DELETE FROM publication_queue WHERE id = ?", (queue_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def queue_update_status(queue_id: int, status: str, error: str | None = None) -> bool:
    """Обновляет статус элемента очереди ('pending', 'published', 'failed', 'cancelled')."""
    conn = _get_conn()
    try:
        cur = conn.execute(
            "UPDATE publication_queue SET status = ?, error_message = ? WHERE id = ?",
            (status, error, queue_id),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def check_db_health() -> dict:
    """Проверяет состояние и целостность базы данных."""
    t0 = time.time()
    conn = _get_conn()
    try:
        integrity_row = conn.execute("PRAGMA integrity_check").fetchone()
        integrity = integrity_row[0] if integrity_row else "unknown"
        query_time_ms = round((time.time() - t0) * 1000, 2)

        sellers_cnt = conn.execute("SELECT COUNT(*) as c FROM sellers").fetchone()["c"]
        products_cnt = conn.execute("SELECT COUNT(*) as c FROM products").fetchone()["c"]
        pubs_cnt = conn.execute("SELECT COUNT(*) as c FROM publications").fetchone()["c"]
        queue_cnt = conn.execute("SELECT COUNT(*) as c FROM publication_queue WHERE status = 'pending'").fetchone()["c"]

        db_size_mb = 0.0
        if DB_PATH.exists():
            db_size_mb = round(DB_PATH.stat().st_size / (1024 * 1024), 2)

        return {
            "status": "ok" if integrity == "ok" else "error",
            "integrity": integrity,
            "latency_ms": query_time_ms,
            "db_size_mb": db_size_mb,
            "counts": {
                "sellers": sellers_cnt,
                "products": products_cnt,
                "publications": pubs_cnt,
                "pending_queue": queue_cnt,
            },
        }
    finally:
        conn.close()


# =============================================
# AI CARD RATINGS
# =============================================

def save_ai_rating(
    article: int,
    best_path: str,
    best_index: int,
    best_score: float,
    has_card: bool,
    total_photos: int = 1
) -> dict:
    """Сохраняет или обновляет результат оценки карточки товара от ИИ."""
    conn = _get_conn()
    try:
        conn.execute("""
            INSERT INTO ai_card_ratings (article, best_path, best_index, best_score, has_card, total_photos, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(article) DO UPDATE SET
                best_path = excluded.best_path,
                best_index = excluded.best_index,
                best_score = excluded.best_score,
                has_card = excluded.has_card,
                total_photos = excluded.total_photos,
                updated_at = datetime('now')
        """, (int(article), str(best_path), int(best_index), float(best_score), 1 if has_card else 0, int(total_photos)))
        conn.commit()
        return {
            "article": int(article),
            "best_path": str(best_path),
            "best_index": int(best_index),
            "best_score": round(float(best_score) * 100, 1),
            "has_card": bool(has_card),
            "total_photos": int(total_photos),
        }
    finally:
        conn.close()


def get_ai_rating(article: int) -> Optional[dict]:
    """Получает оценку ИИ для конкретного артикула."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT article, best_path, best_index, best_score, has_card, total_photos, updated_at FROM ai_card_ratings WHERE article = ?",
            (int(article),)
        ).fetchone()
        if not row:
            return None
        return {
            "article": row["article"],
            "best_path": row["best_path"],
            "best_index": row["best_index"],
            "best_score": round(row["best_score"] * 100, 1),
            "has_card": bool(row["has_card"]),
            "total_photos": row["total_photos"],
            "updated_at": row["updated_at"]
        }
    finally:
        conn.close()


def get_all_ai_ratings() -> dict[int, dict]:
    """Возвращает словарь всех оценок {article: rating_dict}."""
    conn = _get_conn()
    try:
        rows = conn.execute(
            "SELECT article, best_path, best_index, best_score, has_card, total_photos, updated_at FROM ai_card_ratings"
        ).fetchall()
        result = {}
        for r in rows:
            art = r["article"]
            result[art] = {
                "article": art,
                "best_path": r["best_path"],
                "best_index": r["best_index"],
                "best_score": round(r["best_score"] * 100, 1),
                "has_card": bool(r["has_card"]),
                "total_photos": r["total_photos"],
                "updated_at": r["updated_at"]
            }
        return result
    finally:
        conn.close()


def get_ai_ratings_stats() -> dict:
    """Возвращает статистику оценок ИИ по базе."""
    conn = _get_conn()
    try:
        total = conn.execute("SELECT COUNT(*) as cnt FROM ai_card_ratings").fetchone()["cnt"]
        with_card = conn.execute("SELECT COUNT(*) as cnt FROM ai_card_ratings WHERE has_card = 1").fetchone()["cnt"]
        without_card = total - with_card
        return {
            "total_evaluated": total,
            "with_card": with_card,
            "without_card": without_card,
        }
    finally:
        conn.close()


# =============================================
# MIGRATION from JSON
# =============================================

def _migrate_from_json():
    """Переносит продавцов из data/sellers.json в SQLite, если БД пуста."""
    json_path = Path(__file__).resolve().parent.parent.parent / "data" / "sellers.json"
    if not json_path.exists():
        return

    conn = _get_conn()
    try:
        count = conn.execute("SELECT COUNT(*) as cnt FROM sellers").fetchone()["cnt"]
        if count > 0:
            return  # уже есть данные

        with open(json_path, encoding="utf-8") as f:
            sellers = json.load(f)

        for seller in sellers:
            conn.execute(
                "INSERT OR IGNORE INTO sellers (supplier_id, brand, enabled) VALUES (?, ?, ?)",
                (seller["supplier_id"], seller["brand"], 1 if seller.get("enabled", True) else 0),
            )
        conn.commit()
        logger.info("Migrated %s sellers from sellers.json", len(sellers))
    finally:
        conn.close()


# Инициализация при импорте
init()
_migrate_from_json()