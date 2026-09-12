import unittest
from pathlib import Path
from fastapi.testclient import TestClient
from src.database import db
from src.wb.ai_card_service import ai_card_service
from web_gui.server import app


class TestAICard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        db.init()

    def test_db_ai_card_lifecycle(self):
        art = 88888001
        saved = db.save_ai_rating(
            article=art,
            best_path="data/images/test_art.webp",
            best_index=4,
            best_score=0.985,
            has_card=True,
            total_photos=6
        )
        self.assertEqual(saved["article"], art)
        self.assertEqual(saved["best_index"], 4)
        self.assertEqual(saved["best_score"], 98.5)
        self.assertTrue(saved["has_card"])

        # Fetch
        got = db.get_ai_rating(art)
        self.assertIsNotNone(got)
        self.assertEqual(got["best_index"], 4)
        self.assertEqual(got["best_score"], 98.5)
        self.assertTrue(got["has_card"])

        # Stats
        stats = db.get_ai_ratings_stats()
        self.assertGreaterEqual(stats["total_evaluated"], 1)
        self.assertGreaterEqual(stats["with_card"], 1)

        # Cleanup
        conn = db._get_conn()
        conn.execute("DELETE FROM ai_card_ratings WHERE article = ?", (art,))
        conn.commit()
        conn.close()

    def test_api_products_includes_ai_card_metadata(self):
        resp = self.client.get("/api/products")
        self.assertEqual(resp.status_code, 200)
        items = resp.json()
        self.assertIsInstance(items, list)
        if items:
            first = items[0]
            self.assertIn("ai_card", first)
            ai = first["ai_card"]
            self.assertIn("status", ai)
            self.assertIn(ai["status"], ["ok", "rejected", "pending"])
            self.assertIn("has_card", ai)

    def test_api_ai_card_stats(self):
        resp = self.client.get("/api/ai/card_stats")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("total_evaluated", data)
        self.assertIn("with_card", data)
        self.assertIn("without_card", data)
        self.assertIn("total_products", data)


if __name__ == "__main__":
    unittest.main()
