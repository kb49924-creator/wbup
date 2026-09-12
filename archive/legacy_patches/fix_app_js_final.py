import re

with open("web_gui/app.js", "r") as f:
    js = f.read()

# I want to find where `const app = { ... };` is supposed to end.
# Look for:
#   },
# };
# 
# // Глобальная ссылка
# window.app = app;

# We will split on "window.app = app;"
if "window.app = app;" in js:
    # Get everything before the FIRST occurrence of "window.app = app;"
    parts = js.split("window.app = app;")
    main_part = parts[0].rstrip()
    
    # We expect main_part to end with "};" or something like that.
    # Let's just remove the trailing "};" from main_part to inject our methods.
    
    if main_part.endswith("};"):
        main_part = main_part[:-2].rstrip()
        if not main_part.endswith(","):
            main_part += ","
            
    # Then we add our methods.
    ai_methods = """
  // --- AI Trainer Methods ---

  async fetchLocalAIStatus() {
    const result = await this.api('/api/ai/status');
    if (result) {
      document.getElementById('ai-model-status').textContent = result.is_trained ? 'Обучена' : 'Не обучена';
      document.getElementById('ai-model-status').style.color = result.is_trained ? 'var(--green)' : 'var(--fg-primary)';
      document.getElementById('ai-model-accuracy').textContent = result.accuracy + '%';
      document.getElementById('ai-labeled-count').textContent = result.labeled_count;
    }
  },

  async fetchArticleForLabeling(article) {
    if (!article) {
      article = document.getElementById('ai-article-input').value.trim();
    }
    if (!article) return;
    
    document.getElementById('ai-labeling-empty').style.display = 'none';
    const container = document.getElementById('ai-labeling-container');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 20px;"><div class="spinner"></div><br>Скачиваем фото...</div>';
    
    const result = await this.api('/api/ai/fetch', {
      method: 'POST',
      body: JSON.stringify({ article: parseInt(article) })
    });
    
    if (result && result.success && result.photos) {
      container.innerHTML = '';
      result.photos.forEach(p => {
        const url = '/images/' + p.path.split('/images/')[1]; // Serve via static
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div style="height:250px; background:url('${url}') center/cover no-repeat;"></div>
          <div class="card__body" style="padding:12px; display:flex; gap:8px;">
            <button class="btn btn--success" style="flex:1; padding: 4px;" onclick="app.labelPhoto(${article}, '${p.url}', '${p.path}', 1, this.parentElement.parentElement)">
              <span class="material-symbols-outlined" style="font-size:18px;">check</span>
            </button>
            <button class="btn btn--danger" style="flex:1; padding: 4px;" onclick="app.labelPhoto(${article}, '${p.url}', '${p.path}', 0, this.parentElement.parentElement)">
              <span class="material-symbols-outlined" style="font-size:18px;">close</span>
            </button>
          </div>
        `;
        container.appendChild(card);
      });
    } else {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:var(--red);">Ошибка скачивания</div>';
    }
  },

  async fetchRandomArticlesForLabeling() {
    const products = await this.api('/api/products');
    if (products && products.length > 0) {
      const p = products[Math.floor(Math.random() * products.length)];
      document.getElementById('ai-article-input').value = p.article;
      this.fetchArticleForLabeling(p.article);
    }
  },

  async labelPhoto(article, url, path, label, cardEl) {
    cardEl.style.opacity = '0.5';
    cardEl.style.pointerEvents = 'none';
    const result = await this.api('/api/ai/label', {
      method: 'POST',
      body: JSON.stringify({ article, url, path, label })
    });
    if (result && result.success) {
      document.getElementById('ai-labeled-count').textContent = result.count;
    }
  },

  async trainLocalAI() {
    const btn = document.getElementById('btn-train-ai');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<div class="spinner spinner--sm"></div> Обучение...';
    btn.disabled = true;
    
    const result = await this.api('/api/ai/train', { method: 'POST' });
    if (result && result.success) {
      this.showNotification('ИИ успешно обучен! Точность: ' + result.accuracy + '%', 'success');
      this.fetchLocalAIStatus();
    } else {
      this.showNotification('Ошибка обучения', 'error');
    }
    
    btn.innerHTML = oldHtml;
    btn.disabled = false;
  },

  async testLocalAI() {
    const article = document.getElementById('ai-test-input').value.trim();
    if (!article) return;
    
    const container = document.getElementById('ai-test-results');
    container.innerHTML = '<div class="spinner spinner--sm"></div> Проверка...';
    
    const result = await this.api('/api/ai/test', {
      method: 'POST',
      body: JSON.stringify({ article: parseInt(article) })
    });
    
    if (result && result.success) {
      container.innerHTML = '<div style="display:flex; gap:16px; overflow-x:auto;">' + 
        result.photos.map(p => `
          <div class="card" style="min-width:150px; text-align:center;">
            <div style="height:150px; background:url('/images/${p.path.split('/images/')[1]}') center/cover no-repeat; border-radius:8px 8px 0 0;"></div>
            <div class="card__body" style="padding:8px;">
              <div style="font-weight:600; font-size:16px; color: ${p.score > 0.5 ? 'var(--green)' : 'var(--fg-secondary)'}">${(p.score * 100).toFixed(1)}%</div>
            </div>
          </div>
        `).join('') + '</div>';
    } else {
      container.innerHTML = '<div style="color:var(--red);">Ошибка проверки</div>';
    }
  }
};

window.app = app;

document.addEventListener('DOMContentLoaded', () => app.init());

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) app.closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') app.closeModal();
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    app.refreshAll();
  }
});
"""

    with open("web_gui/app.js", "w") as f:
        f.write(main_part + "\n" + ai_methods)

