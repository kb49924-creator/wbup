import re

with open("web_gui/server.py", "r") as f:
    content = f.read()

endpoints = """
from src.wb.local_ai_ranker import local_ai
from pydantic import BaseModel

class LabelRequest(BaseModel):
    article: int
    url: str
    path: str
    label: int

class ArticleRequest(BaseModel):
    article: int

@app.get("/api/ai/status")
def ai_status():
    return local_ai.get_status()

@app.post("/api/ai/label")
def ai_label(req: LabelRequest):
    count = local_ai.add_label(req.article, req.url, req.path, req.label)
    return {"success": True, "count": count}

@app.post("/api/ai/train")
def ai_train():
    res = local_ai.train()
    return {"success": True, **res}

@app.post("/api/ai/fetch")
def ai_fetch(req: ArticleRequest):
    from src.wb.photo_ranker import SmartPhotoRanker
    import asyncio
    ranker = SmartPhotoRanker()
    
    async def fetch():
        photos = await ranker.service.downloader.download_article_photos(req.article, max_indexes=5, max_baskets=3, sizes=['large', 'big'])
        res = []
        for p in photos:
            if hasattr(p, 'path'):
                res.append({"url": p.url, "path": str(p.path), "index": p.index})
        return res
        
    try:
        photos_data = _run_blocking(fetch)
        return {"success": True, "photos": photos_data}
    except Exception as e:
        return {"success": False, "error": str(e)}

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

# Entry Point
"""

content = content.replace("# Entry Point", endpoints)

with open("web_gui/server.py", "w") as f:
    f.write(content)
