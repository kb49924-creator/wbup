import re

with open("web_gui/server.py", "r") as f:
    content = f.read()

patch = """
from src.wb.local_ai_ranker import local_ai

class LabelRequest(BaseModel):
    article: int
    url: str
    path: str
    label: int

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

class ArticleRequest(BaseModel):
    article: int

@app.post("/api/ai/fetch")
def ai_fetch(req: ArticleRequest):
    # Download photos for this article to show in UI
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

"""

if "def ai_status" not in content:
    new_content = content.replace("app = FastAPI(", patch + "\napp = FastAPI(")
    with open("web_gui/server.py", "w") as f:
        f.write(new_content)
