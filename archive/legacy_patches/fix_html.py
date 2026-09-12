import re
with open("web_gui/index.html", "r") as f:
    html = f.read()

# The section to replace is from <!-- ---------- Tab: AI Trainer ---------- --> up to <!-- ---------- Tab: Preview ---------- -->
pattern = re.compile(r"<!-- ---------- Tab: AI Trainer ---------- -->.*?<!-- ---------- Tab: Preview ---------- -->", re.DOTALL)
replacement = """<!-- ---------- Tab: AI Trainer ---------- -->
      <div id="tab-photo" class="tab-panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
          <div>
            <h2 class="fw-semibold mb-1" style="display:flex; align-items:center; gap:8px;">
              <span class="material-symbols-outlined" style="color:var(--accent);">model_training</span>
              Локальный ИИ
            </h2>
            <div style="color:var(--fg-secondary); font-size:14px;">
              Обучите ИИ выбирать идеальные фото (плоская раскладка по центру, однородный фон).
            </div>
          </div>
          <button class="btn btn--primary" onclick="app.trainLocalAI()" id="btn-train-ai" style="gap:8px;">
            <span class="material-symbols-outlined">psychology</span> Обучить ИИ
          </button>
        </div>

        <!-- Training Status -->
        <div class="list-group mb-4" id="ai-status-card" style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:12px; color:var(--fg-tertiary); text-transform:uppercase; letter-spacing:0.5px; font-weight:600; margin-bottom:4px;">Статус модели</div>
              <div style="font-weight:600; font-size:18px; color:var(--fg-primary);" id="ai-model-status">Не обучена</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:12px; color:var(--fg-tertiary); text-transform:uppercase; letter-spacing:0.5px; font-weight:600; margin-bottom:4px;">Точность</div>
              <div style="font-weight:600; font-size:18px; color:var(--green);" id="ai-model-accuracy">0%</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:12px; color:var(--fg-tertiary); text-transform:uppercase; letter-spacing:0.5px; font-weight:600; margin-bottom:4px;">Размечено фото</div>
              <div style="font-weight:600; font-size:18px; color:var(--accent);" id="ai-labeled-count">0</div>
            </div>
          </div>
        </div>

        <!-- Dataset Collection -->
        <div class="list-group mb-4">
          <div class="card__header" style="display:flex; justify-content:space-between; align-items:center;">
            <div class="card__title">1. Сбор данных для обучения</div>
            <button class="btn btn--ghost" onclick="app.fetchRandomArticlesForLabeling()" style="font-size:13px; padding: 6px 12px;">
              <span class="material-symbols-outlined" style="font-size:16px;">shuffle</span> Случайные товары
            </button>
          </div>
          <div class="card__body">
            <div style="display:flex; gap:12px; margin-bottom:16px;">
              <input type="text" id="ai-article-input" class="input" placeholder="Артикул товара" style="flex:1;">
              <button class="btn btn--secondary" onclick="app.fetchArticleForLabeling()">Скачать фото</button>
            </div>
            
            <div id="ai-labeling-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top:20px;">
              <!-- Cards will be injected here -->
            </div>
            <div id="ai-labeling-empty" style="text-align:center; padding:32px 0; color:var(--fg-tertiary);">
              <span class="material-symbols-outlined" style="font-size:48px; opacity:0.3; margin-bottom:12px; display:block;">image_search</span>
              Скачайте фото товара, чтобы разметить их
            </div>
          </div>
        </div>

        <!-- Testing Sandbox -->
        <div class="list-group mb-4">
          <div class="card__header">
            <div class="card__title">2. Тестирование ИИ</div>
          </div>
          <div class="card__body">
            <div style="display:flex; gap:12px; margin-bottom:16px;">
              <input type="text" id="ai-test-input" class="input" placeholder="Артикул для проверки" style="flex:1;">
              <button class="btn btn--secondary" onclick="app.testLocalAI()">Проверить</button>
            </div>
            <div id="ai-test-results" style="margin-top:16px;"></div>
          </div>
        </div>
      </div>

      <!-- ---------- Tab: Preview ---------- -->"""
new_html = pattern.sub(replacement, html)
with open("web_gui/index.html", "w") as f:
    f.write(new_html)
