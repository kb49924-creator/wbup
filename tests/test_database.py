import unittest
import tempfile
import sqlite3
from pathlib import Path
from src.database import db

class TestDatabase(unittest.TestCase):
    def setUp(self):
        # Verify db initialized
        db.init()

    def test_db_health(self):
        health = db.check_db_health()
        self.assertEqual(health["status"], "ok")
        self.assertEqual(health["integrity"], "ok")
        self.assertIn("latency_ms", health)
        self.assertIn("counts", health)

    def test_settings_get_set(self):
        key = "test_setting_key_123"
        val = "test_value_xyz"
        db.set_setting(key, val)
        loaded = db.get_setting(key)
        self.assertEqual(loaded, val)

    def test_publication_queue_lifecycle(self):
        # Add to queue
        articles = [11111111, 22222222]
        post_text = "Тестовый пост для очереди"
        qid = db.queue_add(articles=articles, post_text=post_text, preview_card_path="/tmp/test.webp")
        self.assertIsInstance(qid, int)
        self.assertGreater(qid, 0)

        # Retrieve item
        item = db.queue_get(qid)
        self.assertIsNotNone(item)
        self.assertEqual(item["id"], qid)
        self.assertEqual(item["articles"], articles)
        self.assertEqual(item["post_text"], post_text)
        self.assertEqual(item["status"], "pending")

        # List items
        items = db.queue_list()
        found = any(x["id"] == qid for x in items)
        self.assertTrue(found)

        # Update status
        ok = db.queue_update_status(qid, "published")
        self.assertTrue(ok)
        updated = db.queue_get(qid)
        self.assertEqual(updated["status"], "published")

        # Delete
        del_ok = db.queue_delete(qid)
        self.assertTrue(del_ok)
        deleted = db.queue_get(qid)
        self.assertIsNone(deleted)

if __name__ == "__main__":
    unittest.main()
