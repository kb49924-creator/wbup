import unittest
from fastapi.testclient import TestClient
from web_gui.server import app

class TestAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("uptime_seconds", data)

    def test_system_info(self):
        resp = self.client.get("/api/system/info")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("version", data)
        self.assertIn("python_version", data)
        self.assertIn("os", data)

    def test_statistics(self):
        resp = self.client.get("/api/statistics")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("sellers", data)
        self.assertIn("products", data)

    def test_queue_endpoints(self):
        # 1. Add to queue
        post_data = {
            "articles": [99999001, 99999002],
            "post_text": "API Test Queue Post",
        }
        res_add = self.client.post("/api/queue/add", json=post_data)
        self.assertEqual(res_add.status_code, 201)
        qid = res_add.json()["id"]

        # 2. Get list
        res_list = self.client.get("/api/queue")
        self.assertEqual(res_list.status_code, 200)
        items = res_list.json()
        self.assertTrue(any(x["id"] == qid for x in items))

        # 3. Delete from queue
        res_del = self.client.delete(f"/api/queue/{qid}")
        self.assertEqual(res_del.status_code, 200)

    def test_system_diagnostics(self):
        resp = self.client.get("/api/system/diagnostics")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("checks", data)
        self.assertIn("database", data["checks"])
        self.assertEqual(data["checks"]["database"]["status"], "ok")

if __name__ == "__main__":
    unittest.main()
