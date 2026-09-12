import re

with open("web_gui/server.py", "r") as f:
    content = f.read()

patch = """
@app.post("/api/ai/test")
def ai_test(req: ArticleRequest):
    from src.wb.photo_ranker import SmartPhotoRanker
    import asyncio
    ranker = SmartPhotoRanker()
    
    async def fetch():
        photos = await ranker.service.downloader.download_article_photos(req.article, max_indexes=5, max_baskets=3, sizes=['large', 'big'])
        res = []
        for p in photos:
            if hasattr(p, 'path'):
                score = local_ai.predict_score(str(p.path))
                res.append({"path": str(p.path), "score": score})
        res.sort(key=lambda x: x["score"], reverse=True)
        return res
        
    try:
        photos_data = _run_blocking(fetch)
        return {"success": True, "photos": photos_data}
    except Exception as e:
        return {"success": False, "error": str(e)}
"""

if "def ai_test" not in content:
    # Just append it before the end or something.
    content += patch
    with open("web_gui/server.py", "w") as f:
        f.write(content)
