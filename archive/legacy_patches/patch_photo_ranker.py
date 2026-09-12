import re

with open("src/wb/photo_ranker.py", "r") as f:
    content = f.read()

# First, import local_ai at the top
if "from src.wb.local_ai_ranker import local_ai" not in content:
    content = "from src.wb.local_ai_ranker import local_ai\n" + content

# Next, inside `rank_article_photos`, replace the sorting logic.
# Look for:
# results.sort(key=lambda r: (r.index != 1, -r.composite_score))
# Replace with:
# if local_ai.is_trained:
#     for r in results:
#         r.composite_score = local_ai.predict_score(str(r.path))
#     results.sort(key=lambda r: r.composite_score, reverse=True)
# else:
#     results.sort(key=lambda r: (r.index != 1, -r.composite_score))

patch = """            if local_ai.is_trained:
                logger.info("Using trained Local AI to score photos...")
                for r in results:
                    r.composite_score = local_ai.predict_score(str(r.path))
                results.sort(key=lambda r: r.composite_score, reverse=True)
            else:
                # Сортируем: всегда отдаем приоритет 1.webp (index 1), так как ИИ удален
                results.sort(key=lambda r: (r.index != 1, -r.composite_score))"""

content = content.replace("            # Сортируем: всегда отдаем приоритет 1.webp (index 1), так как ИИ удален\n            results.sort(key=lambda r: (r.index != 1, -r.composite_score))", patch)

with open("src/wb/photo_ranker.py", "w") as f:
    f.write(content)

