import time
import tempfile
import shutil
import asyncio

from playwright.sync_api import sync_playwright, Error as PlaywrightError
from playwright.async_api import async_playwright

from src.utils.logger import get_logger

logger = get_logger("session")


class WBSession:
    """Управляет сессией Playwright для обхода антибота Wildberries (Синхронно)."""
    def __init__(self):
        self.playwright = None
        self.context = None
        self.page = None
        self._temp_dir = None

    def start(self, retries: int = 3):
        for attempt in range(1, retries + 1):
            try:
                self._temp_dir = tempfile.mkdtemp(prefix="wb_session_")
                logger.debug("Created temp profile dir: %s", self._temp_dir)

                self.playwright = sync_playwright().start()

                self.context = self.playwright.chromium.launch_persistent_context(
                    user_data_dir=self._temp_dir,
                    headless=False,
                    args=[
                        "--disable-gpu",
                        "--no-sandbox",
                        "--disable-software-rasterizer",
                        "--disable-dev-shm-usage",
                    ],
                )

                self.page = self.context.new_page()
                self.page.set_default_timeout(60000)

                return self.page

            except PlaywrightError as e:
                logger.warning("Session start failed (attempt %s/%s): %s", attempt, retries, e)
                self._cleanup()
                if attempt < retries:
                    time.sleep(min(attempt * 2, 10))
                else:
                    raise

    def ensure_alive(self) -> bool:
        try:
            if self.page and self.context:
                _ = self.page.url
                return True
        except Exception:
            pass
        try:
            self._cleanup()
            self.start(retries=2)
            return True
        except Exception as e:
            logger.error("Failed to recreate session: %s", e)
            return False

    def _cleanup(self):
        if self.page:
            try:
                if not self.page.is_closed():
                    self.page.close()
            except Exception:
                pass
            self.page = None

        if self.context:
            try:
                self.context.close()
            except Exception:
                pass
            self.context = None

        if self.playwright:
            try:
                self.playwright.stop()
            except Exception:
                pass
            self.playwright = None

        if self._temp_dir:
            try:
                shutil.rmtree(self._temp_dir, ignore_errors=True)
            except Exception:
                pass
            self._temp_dir = None

    def stop(self):
        self._cleanup()
        logger.info("Session stopped")


class AsyncWBSession:
    """Управляет асинхронной сессией Playwright для обхода антибота Wildberries.
    
    Использует постоянную папку профиля (data/browser_profile), чтобы 
    сохранять cookies и токены Qrator между перезапусками.
    """

    def __init__(self):
        self.playwright = None
        self.context = None
        self._profile_dir = None
        self._start_lock = asyncio.Lock()

    def _get_persistent_profile_dir(self) -> str:
        """Возвращает путь к постоянной папке профиля браузера."""
        import os
        # Ищем корень проекта (где лежит папка data/)
        base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        profile_dir = os.path.join(base, "data", "browser_profile")
        os.makedirs(profile_dir, exist_ok=True)
        return profile_dir

    async def start(self, retries: int = 3):
        async with self._start_lock:
            if self.context:
                return self.context

            for attempt in range(1, retries + 1):
                try:
                    self._profile_dir = self._get_persistent_profile_dir()
                    logger.info("Using persistent profile dir: %s", self._profile_dir)

                    self.playwright = await async_playwright().start()

                    self.context = await self.playwright.chromium.launch_persistent_context(
                        user_data_dir=self._profile_dir,
                        headless=False,
                        args=[
                            "--disable-gpu",
                            "--no-sandbox",
                            "--disable-software-rasterizer",
                            "--disable-dev-shm-usage",
                        ],
                        # Реалистичный viewport и user-agent
                        viewport={"width": 1366, "height": 768},
                        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        locale="ru-RU",
                        timezone_id="Europe/Moscow",
                    )

                    logger.info("AsyncSession started (attempt %s/%s)", attempt, retries)
                    return self.context

                except Exception as e:
                    logger.warning("AsyncSession start failed (attempt %s/%s): %s", attempt, retries, e)
                    await self._cleanup()

                    if attempt < retries:
                        await asyncio.sleep(min(attempt * 2, 10))
                    else:
                        raise

    async def ensure_alive(self):
        if self.context:
            try:
                pages = self.context.pages
                return self.context
            except Exception as e:
                logger.warning("Context check failed (%s), recreating...", e)

        await self._cleanup()
        return await self.start(retries=2)

    async def _cleanup(self):
        if self.context:
            try:
                await self.context.close()
            except Exception:
                pass
            self.context = None

        if self.playwright:
            try:
                await self.playwright.stop()
            except Exception:
                pass
            self.playwright = None
        
        # НЕ удаляем profile_dir — он постоянный!

    async def stop(self):
        await self._cleanup()
        logger.info("AsyncSession stopped")