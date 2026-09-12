import re

with open("web_gui/app.js", "r") as f:
    js = f.read()

new_test_method = """  async testLocalAI() {
    const article = document.getElementById('ai-test-input').value.trim();
    if (!article) return;
    
    const container = document.getElementById('ai-test-results');
    container.innerHTML = '<div class="spinner spinner--sm"></div> Проверка...';
    
    // Test logic uses the same fetch but then we can display scores if we want.
    // For now, let's just trigger a backend test endpoint or simulate it.
    // Wait, the backend doesn't have an endpoint that just returns scores.
    // We can add one!
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
  }"""

js = js.replace("""  async testLocalAI() {
    this.showNotification('Раздел в разработке (Шаг 9)', 'info');
  }""", new_test_method)

with open("web_gui/app.js", "w") as f:
    f.write(js)
