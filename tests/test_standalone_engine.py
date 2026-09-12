import os
import re
import yaml
import subprocess
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

class TestStandaloneEngineAndCI(unittest.TestCase):

    def test_workflow_yaml_syntax(self):
        workflow_file = BASE_DIR / ".github" / "workflows" / "build_ios.yml"
        self.assertTrue(workflow_file.exists(), "build_ios.yml must exist")
        
        with open(workflow_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            
        self.assertIn("name", data)
        self.assertIn("build-ipa", data.get("jobs", {}))
        job = data["jobs"]["build-ipa"]
        self.assertEqual(job.get("runs-on"), "macos-14")
        
        steps = job.get("steps", [])
        step_names = [s.get("name") for s in steps]
        self.assertTrue(any("Xcode" in name for name in step_names if name))
        self.assertTrue(any("Archive" in name for name in step_names if name))
        self.assertTrue(any(".ipa" in name for name in step_names if name))
        self.assertTrue(any("Artifacts" in name for name in step_names if name))
        self.assertTrue(any("Release" in name for name in step_names if name))

    def test_app2_js_jsc_parse(self):
        js_file = BASE_DIR / "web_gui" / "app2.js"
        self.assertTrue(js_file.exists())
        
        jsc_code = """
        var window = { location: { protocol: "file:" }, addEventListener: function(){} };
        var document = {
          documentElement: { setAttribute: function(){}, getAttribute: function(){ return "dark"; } },
          addEventListener: function(){},
          getElementById: function(){ return null; },
          querySelectorAll: function(){ return []; },
          createElement: function(){ return { getContext: function(){ return {}; }, style: {} }; }
        };
        var localStorage = {
          _data: {},
          getItem: function(k){ return this._data[k] || null; },
          setItem: function(k, v){ this._data[k] = String(v); },
          removeItem: function(k){ delete this._data[k]; }
        };
        var navigator = { vibrate: function(){} };
        var fetch = function(){ return Promise.resolve({ ok: true, json: function(){ return Promise.resolve({}); } }); };
        var Image = function(){};

        load("web_gui/app2.js");

        if (typeof StandaloneEngine === 'undefined') throw new Error("StandaloneEngine is missing");
        if (typeof StandaloneEngine.getBasketNumber !== 'function') throw new Error("getBasketNumber missing");
        if (typeof StandaloneEngine.renderPoster !== 'function') throw new Error("renderPoster missing");
        if (typeof StandaloneEngine.publishToTelegram !== 'function') throw new Error("publishToTelegram missing");

        // Test basket algorithm
        var b1 = StandaloneEngine.getBasketNumber(10000000);
        var b2 = StandaloneEngine.getBasketNumber(1237216844);
        if (b1 < 1 || b1 > 35) throw new Error("Invalid basket for 10000000: " + b1);
        if (b2 < 1 || b2 > 35) throw new Error("Invalid basket for 1237216844: " + b2);
        """
        
        proc = subprocess.run(
            ["/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc", "-e", jsc_code],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True
        )
        self.assertEqual(proc.returncode, 0, f"JSC execution error: {proc.stderr}")

    def test_ios_assets_synced(self):
        web_app2 = (BASE_DIR / "web_gui" / "app2.js").read_bytes()
        ios_app2 = (BASE_DIR / "ios" / "WBUpStudio" / "www" / "app2.js").read_bytes()
        self.assertEqual(web_app2, ios_app2, "app2.js in web_gui and ios/WBUpStudio/www must be identical")
        
        web_index = (BASE_DIR / "web_gui" / "index.html").read_bytes()
        ios_index = (BASE_DIR / "ios" / "WBUpStudio" / "www" / "index.html").read_bytes()
        self.assertEqual(web_index, ios_index, "index.html in web_gui and ios/WBUpStudio/www must be identical")

    def test_xcode_project_structure(self):
        pbx_file = BASE_DIR / "ios" / "WBUpStudio.xcodeproj" / "project.pbxproj"
        self.assertTrue(pbx_file.exists())
        content = pbx_file.read_text(encoding="utf-8")
        self.assertIn("WBUpStudio", content)
        self.assertIn("CODE_SIGNING_ALLOWED = NO", content)
        self.assertIn("IPHONEOS_DEPLOYMENT_TARGET = 15.0", content)
        
        info_plist = BASE_DIR / "ios" / "WBUpStudio" / "Info.plist"
        self.assertTrue(info_plist.exists())
        
        icon = BASE_DIR / "ios" / "WBUpStudio" / "Assets.xcassets" / "AppIcon.appiconset" / "icon-1024.png"
        self.assertTrue(icon.exists())

    def test_usage_ios_documentation(self):
        doc = BASE_DIR / "USAGE_IOS.md"
        self.assertTrue(doc.exists())
        text = doc.read_text(encoding="utf-8")
        self.assertIn("Sideloadly", text)
        self.assertIn("AltStore", text)
        self.assertIn("TrollStore", text)
        self.assertIn(".ipa", text)

if __name__ == "__main__":
    unittest.main()
