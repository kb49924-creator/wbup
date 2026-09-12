import re

with open("web_gui/server.py", "r") as f:
    content = f.read()

# We want to move everything from `from src.wb.local_ai_ranker import local_ai` up to `app = FastAPI(...)` to the end of the file.
start_idx = content.find("from src.wb.local_ai_ranker import local_ai")
end_idx = content.find("app = FastAPI(")

if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
    patch = content[start_idx:end_idx]
    
    # Check if we also have the /api/ai/test patch at the bottom
    # Wait, the patch for /api/ai/test was appended to the end of the file already.
    # So we just need to move `patch` to the end of the file.
    
    new_content = content[:start_idx] + content[end_idx:] + "\n" + patch
    
    with open("web_gui/server.py", "w") as f:
        f.write(new_content)

