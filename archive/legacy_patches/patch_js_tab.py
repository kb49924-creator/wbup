import re

with open("web_gui/app.js", "r") as f:
    js = f.read()

# find switchTab
if "this.fetchLocalAIStatus();" not in js:
    js = js.replace("if (tabId === 'photo') {", "if (tabId === 'photo') {\n      this.fetchLocalAIStatus();")
    with open("web_gui/app.js", "w") as f:
        f.write(js)
