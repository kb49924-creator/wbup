import unittest
from src.content.formatter import PostFormatter
from src.wb.models import Product

class TestFormatter(unittest.TestCase):
    def setUp(self):
        self.formatter = PostFormatter()

    def test_format_empty_products(self):
        self.assertEqual(self.formatter.format("Одежда", []), "")

    def test_format_single_product_contains_links_and_tags(self):
        prod = Product(
            article=12345678,
            name="Платье вечернее",
            category="Платья",
            brand="Zarina",
            price=3000,
            sale_price=1800,
            discount=40,
        )

        post = self.formatter.format("Платья", [prod], include_hashtags=True)
        self.assertIn("https://www.wildberries.ru/catalog/12345678/detail.aspx", post)
        self.assertIn("1 800", post)
        self.assertIn("-40%", post)
        self.assertIn("#wildberries", post)
        self.assertIn("#zarina", post)

    def test_format_respects_max_length(self):
        prods = [
            Product(
                article=100000 + i,
                name=f"Товар с очень длинным названием номер {i} " * 5,
                category="Одежда",
                brand="SuperBrand",
                price=2000,
                sale_price=1500,
            )
            for i in range(15)
        ]
        post = self.formatter.format("Одежда", prods, max_length=500)
        self.assertLessEqual(len(post), 500)

if __name__ == "__main__":
    unittest.main()
