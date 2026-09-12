import re

with open("web_gui/server.py", "r") as f:
    content = f.read()

# We have stuff after `if __name__ == '__main__':`
# Let's split on `if __name__ == '__main__':`
parts = content.split("if __name__ == '__main__':")
main_code = parts[0]
tail = parts[1]

# Now, tail contains `uvicorn.run(...)` and then the appended AI endpoints.
# Let's extract the uvicorn call.
uvicorn_pattern = re.compile(r"(\s*uvicorn\.run\([^)]+\))", re.DOTALL)
match = uvicorn_pattern.search(tail)
if match:
    uvicorn_code = match.group(1)
    other_stuff = tail.replace(uvicorn_code, "")
    
    # other_stuff contains the AI endpoints.
    # Let's append other_stuff to main_code, THEN put `if __name__ == '__main__':` and `uvicorn_code`.
    new_content = main_code + "\n" + other_stuff + "\nif __name__ == '__main__':" + uvicorn_code
    
    with open("web_gui/server.py", "w") as f:
        f.write(new_content)
