import re

with open("web_gui/app.js", "r") as f:
    js = f.read()

new_methods = """
  // --- AI Trainer Methods ---

  async fetchLocalAIStatus() {
    const result = await this.api('/api/ai/status');
    if (result) {
      document.getElementById('ai-model-status').textContent = result.is_trained ? 'Обучена' : 'Не обучена';
      document.getElementById('ai-model-status').style.color = result.is_trained ? 'var(--green)' : 'var(--fg-primary)';
      document.getElementById('ai-model-accuracy').textContent = result.accuracy + '%';
      document.getElementById('ai-labeled-count').textContent = result.labeled_count;
    }
  }

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
  }

  async fetchRandomArticlesForLabeling() {
    const products = await this.api('/api/products');
    if (products && products.length > 0) {
      const p = products[Math.floor(Math.random() * products.length)];
      document.getElementById('ai-article-input').value = p.article;
      this.fetchArticleForLabeling(p.article);
    }
  }

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
  }

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
  }

  async testLocalAI() {
    this.showNotification('Раздел в разработке (Шаг 9)', 'info');
  }

"""

if "fetchLocalAIStatus" not in js:
    # Insert new methods before constructor ends or at the end
    # Actually, better to append them to the class.
    # Find the last closing brace of the class App
    last_brace_idx = js.rfind("}")
    if last_brace_idx != -1:
        new_js = js[:last_brace_idx] + new_methods + "\n}" + js[last_brace_idx+1:]
        with open("web_gui/app.js", "w") as f:
            f.write(new_js)

