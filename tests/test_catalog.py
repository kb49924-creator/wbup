import unittest
from src.wb.catalog import _estimate_baskets
from src.wb.category import detect_category, detect_gender

class TestCatalog(unittest.TestCase):
    def test_estimate_baskets_returns_candidates(self):
        article = 101130291
        baskets = _estimate_baskets(article)
        self.assertIsInstance(baskets, list)
        self.assertGreater(len(baskets), 0)
        self.assertTrue(all(1 <= b <= 99 for b in baskets))

    def test_detect_category_women_clothing(self):
        cat = detect_category("Платье женское вечернее праздничное")
        self.assertEqual(cat, "Платье")

    def test_detect_category_footwear(self):
        cat = detect_category("Кроссовки мужские дышащие спортивные")
        self.assertEqual(cat, "Кроссовки")

    def test_detect_gender(self):
        self.assertEqual(detect_gender("Брюки женские летние"), "female")
        self.assertEqual(detect_gender("Рубашка мужская деловая"), "male")
        self.assertEqual(detect_gender("Рюкзак городской унисекс"), "unisex")

if __name__ == "__main__":
    unittest.main()
