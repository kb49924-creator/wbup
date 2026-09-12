"""
Скрипт для проверки Engine 2.0 (Асинхронный сбор).
"""
import asyncio
import logging
from src.engine.engine import Engine
from src.database import db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger("test_engine")

async def test_engine():
    engine = Engine()
    
    # Берём первых 5 продавцов из БД
    from src.config.sellers import get_enabled_sellers
    sellers = get_enabled_sellers()[:5]
    logger.info("Testing with %d sellers...", len(sellers))
    
    # Запускаем сбор
    products = await engine._process_all_sellers_async(sellers)
    
    logger.info("Total new products found: %d", len(products))
    if products:
        logger.info("Top product: %s (article %s) - price %s, feedbacks %s", 
                    products[0].name, products[0].article, products[0].price, products[0].feedbacks)
        
if __name__ == "__main__":
    asyncio.run(test_engine())
