import unittest
from src.engine.selector import Selector
from src.wb.models import Product

class TestSelector(unittest.TestCase):
    def setUp(self):
        self.selector = Selector()

    def test_is_valid_rejects_empty_article(self):
        p = Product(article=None, name="Платье", price=1000)
        self.assertFalse(self.selector.is_valid(p))

    def test_is_valid_rejects_empty_name(self):
        p = Product(article=123456, name="", price=1000)
        self.assertFalse(self.selector.is_valid(p))

    def test_is_valid_rejects_zero_price(self):
        p = Product(article=123456, name="Футболка", price=0, sale_price=0)
        self.assertFalse(self.selector.is_valid(p))

    def test_scoring_rating_boost(self):
        p_high = Product(article=1001, name="Куртка", price=2000, rating=4.9, feedbacks=50)
        p_low = Product(article=1002, name="Куртка", price=2000, rating=4.6, feedbacks=50)

        score_high = self.selector.score(p_high, mode="mixed")
        score_low = self.selector.score(p_low, mode="mixed")
        self.assertGreater(score_high, score_low)

    def test_scoring_new_mode_favors_novelties(self):
        p_new = Product(article=2001, name="Новинка", price=1500, rating=4.8, feedbacks=5)
        p_old = Product(article=2002, name="Хит", price=1500, rating=4.8, feedbacks=5000)

        score_new = self.selector.score(p_new, mode="new")
        score_old = self.selector.score(p_old, mode="new")
        self.assertGreater(score_new, score_old)

    def test_scoring_popular_mode_favors_high_feedback(self):
        p_few = Product(article=3001, name="Товар А", price=1500, rating=4.8, feedbacks=15)
        p_many = Product(article=3002, name="Товар Б", price=1500, rating=4.8, feedbacks=4000)

        score_few = self.selector.score(p_few, mode="popular")
        score_many = self.selector.score(p_many, mode="popular")
        self.assertGreater(score_many, score_few)

if __name__ == "__main__":
    unittest.main()
