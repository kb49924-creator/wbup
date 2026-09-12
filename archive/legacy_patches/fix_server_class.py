with open("web_gui/server.py", "r") as f:
    content = f.read()
    
# Extract class ArticleRequest(BaseModel):
#     article: int
class_def = "class ArticleRequest(BaseModel):\n    article: int\n"
content = content.replace(class_def, "")
content = content.replace("@app.post(\"/api/ai/test\")", class_def + "\n@app.post(\"/api/ai/test\")")

with open("web_gui/server.py", "w") as f:
    f.write(content)
