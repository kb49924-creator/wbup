with open("web_gui/server.py", "r") as f:
    lines = f.readlines()
    
# Remove everything after "# Entry Point"
idx = -1
for i, line in enumerate(lines):
    if line.startswith("# Entry Point"):
        idx = i
        break
        
if idx != -1:
    clean_lines = lines[:idx+2]
    with open("web_gui/server.py", "w") as f:
        f.write("".join(clean_lines) + """
if __name__ == '__main__':
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
        log_level="info",
        app_dir=str(STATIC_DIR)
    )
""")
