import re

with open("src/wb/photo_ranker.py", "r") as f:
    content = f.read()

patch = """        if local_ai.is_trained:
            logger.info("Using trained Local AI to score photos...")
            for r in results:
                r.composite_score = local_ai.predict_score(str(r.path))
            results.sort(key=lambda r: r.composite_score, reverse=True)
        else:
            results.sort(key=lambda r: (r.index != 1, -r.composite_score))"""

content = content.replace("        results.sort(key=lambda r: (r.index != 1, -r.composite_score))", patch)

with open("src/wb/photo_ranker.py", "w") as f:
    f.write(content)
