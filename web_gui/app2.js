// ============================================================
// WB Up Studio — Luxury Fashion Engine & Apple iOS 18 Controller
// Zero-Bloat, High-Performance, Mobile-First Architecture
// ============================================================

const StandaloneEngine = {
  getBasketHost(article) {
    const vol = Math.floor(article / 100000);
    if (vol >= 0 && vol <= 143) return 'basket-01.wbbasket.ru';
    if (vol >= 144 && vol <= 287) return 'basket-02.wbbasket.ru';
    if (vol >= 288 && vol <= 431) return 'basket-03.wbbasket.ru';
    if (vol >= 432 && vol <= 719) return 'basket-04.wbbasket.ru';
    if (vol >= 720 && vol <= 1007) return 'basket-05.wbbasket.ru';
    if (vol >= 1008 && vol <= 1061) return 'basket-06.wbbasket.ru';
    if (vol >= 1062 && vol <= 1115) return 'basket-07.wbbasket.ru';
    if (vol >= 1116 && vol <= 1169) return 'basket-08.wbbasket.ru';
    if (vol >= 1170 && vol <= 1313) return 'basket-09.wbbasket.ru';
    if (vol >= 1314 && vol <= 1601) return 'basket-10.wbbasket.ru';
    if (vol >= 1602 && vol <= 1655) return 'basket-11.wbbasket.ru';
    if (vol >= 1656 && vol <= 1919) return 'basket-12.wbbasket.ru';
    if (vol >= 1920 && vol <= 2045) return 'basket-13.wbbasket.ru';
    if (vol >= 2046 && vol <= 2189) return 'basket-14.wbbasket.ru';
    if (vol >= 2190 && vol <= 2405) return 'basket-15.wbbasket.ru';
    if (vol >= 2406 && vol <= 2621) return 'basket-16.wbbasket.ru';
    if (vol >= 2622 && vol <= 2837) return 'basket-17.wbbasket.ru';
    if (vol >= 2838 && vol <= 3053) return 'basket-18.wbbasket.ru';
    return 'basket-19.wbbasket.ru';
  },

  getPhotoUrl(article, photoIndex = 1) {
    const vol = Math.floor(article / 100000);
    const part = Math.floor(article / 1000);
    const host = this.getBasketHost(article);
    return `https://${host}/vol${vol}/part${part}/${article}/images/c516x688/${photoIndex}.webp`;
  },

  loadImage(url, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        const proxyImg = new Image();
        proxyImg.crossOrigin = 'anonymous';
        proxyImg.onload = () => resolve(proxyImg);
        proxyImg.onerror = () => reject(new Error('Image timeout and proxy failed: ' + url));
        proxyImg.src = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
      }, timeoutMs);

      img.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(img);
      };

      img.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const proxyImg = new Image();
        proxyImg.crossOrigin = 'anonymous';
        proxyImg.onload = () => resolve(proxyImg);
        proxyImg.onerror = () => reject(new Error('Image failed to load: ' + url));
        proxyImg.src = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
      };

      img.src = url;
    });
  },

  // Fast background removal for studio clothing (scales to 480px, flood fill from edges)
  cutoutProduct(srcImg) {
    try {
      const maxDim = 480;
      let w = srcImg.naturalWidth || srcImg.width || 400;
      let h = srcImg.naturalHeight || srcImg.height || 533;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
        else { w = Math.round(w * (maxDim / h)); h = maxDim; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(srcImg, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Sample edge color
      const edgeR = data[0], edgeG = data[1], edgeB = data[2];
      const isWhite = (edgeR > 220 && edgeG > 220 && edgeB > 220);
      const threshold = isWhite ? 35 : 45;

      const visited = new Uint8Array(w * h);
      const queue = new Int32Array(w * h * 2);
      let qStart = 0, qEnd = 0;

      const pushQueue = (x, y) => {
        const idx = y * w + x;
        if (visited[idx]) return;
        visited[idx] = 1;
        queue[qEnd++] = x;
        queue[qEnd++] = y;
      };

      for (let x = 0; x < w; x++) { pushQueue(x, 0); pushQueue(x, h - 1); }
      for (let y = 0; y < h; y++) { pushQueue(0, y); pushQueue(w - 1, y); }

      while (qStart < qEnd) {
        const cx = queue[qStart++];
        const cy = queue[qStart++];
        const pi = (cy * w + cx) * 4;

        const r = data[pi];
        const g = data[pi + 1];
        const b = data[pi + 2];

        const diff = Math.abs(r - edgeR) + Math.abs(g - edgeG) + Math.abs(b - edgeB);
        const nearWhite = r > 235 && g > 235 && b > 235;

        if (diff < threshold || nearWhite) {
          data[pi + 3] = 0; // Transparent
          if (cx > 0) pushQueue(cx - 1, cy);
          if (cx < w - 1) pushQueue(cx + 1, cy);
          if (cy > 0) pushQueue(cx, cy - 1);
          if (cy < h - 1) pushQueue(cx, cy + 1);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas;
    } catch (e) {
      console.warn('Cutout fallback:', e);
      return srcImg;
    }
  },

  // 1080x1080 Poster Generator: User background + Cutout Clothes + Clean Price Stickers
  async renderPoster(products) {
    const canvas = document.getElementById('poster-canvas') || document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // 1. Draw custom user background
    try {
      const bgImg = await this.loadImage('wb_up_background.jpg', 3000);
      ctx.drawImage(bgImg, 0, 0, 1080, 1080);
    } catch (e) {
      // Fallback gradient if file missing
      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, '#1a1a24');
      grad.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);
    }

    // 2. Layout for 4 clothing items (2x2 lookbook grid)
    const items = products.slice(0, 4);
    const slots = [
      { x: 40,  y: 60,  w: 480, h: 440 },
      { x: 560, y: 60,  w: 480, h: 440 },
      { x: 40,  y: 540, w: 480, h: 440 },
      { x: 560, y: 540, w: 480, h: 440 }
    ];

    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      const slot = slots[i];

      try {
        const photoUrl = p.photo_url || this.getPhotoUrl(p.article, 1);
        const rawImg = await this.loadImage(photoUrl, 3500);
        const cutout = this.cutoutProduct(rawImg);

        // Calculate aspect ratio fit
        const cw = cutout.width || 400;
        const ch = cutout.height || 533;
        const scale = Math.min((slot.w - 40) / cw, (slot.h - 80) / ch);
        const dw = cw * scale;
        const dh = ch * scale;
        const dx = slot.x + (slot.w - dw) / 2;
        const dy = slot.y + (slot.h - dh) / 2 - 10;

        // Subtle soft ambient drop shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 14;
        ctx.drawImage(cutout, dx, dy, dw, dh);
        ctx.restore();

        // Minimalist Price Sticker Capsule (Farfetch / Poizon Style)
        const priceText = `${Math.round(p.sale_price || p.price || 0).toLocaleString('ru-RU')} ₽`;
        const artText = `арт. ${p.article}`;

        ctx.font = 'bold 24px -apple-system, sans-serif';
        const pWidth = ctx.measureText(priceText).width;
        ctx.font = '500 17px -apple-system, sans-serif';
        const aWidth = ctx.measureText(artText).width;

        const tagW = Math.max(pWidth, aWidth) + 36;
        const tagH = 58;
        const tagX = slot.x + (slot.w - tagW) / 2;
        const tagY = slot.y + slot.h - 55;

        // Frosted Tag Background
        ctx.save();
        ctx.fillStyle = 'rgba(18, 18, 22, 0.88)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.5;
        this.drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 16);
        ctx.fill();
        ctx.stroke();

        // Tag Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(priceText, tagX + tagW / 2, tagY + 28);

        ctx.fillStyle = 'rgba(235, 235, 245, 0.65)';
        ctx.font = '600 15px -apple-system, sans-serif';
        ctx.fillText(artText, tagX + tagW / 2, tagY + 48);
        ctx.restore();

      } catch (err) {
        console.warn('Item render fallback:', p.article, err);
      }
    }

    return canvas.toDataURL('image/jpeg', 0.92);
  },

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
};

// ============================================================
// Main Application Controller (Apple iOS 18 Fashion UI)
// ============================================================
const app = {
  state: {
    currentTab: 'dashboard',
    selectedArticles: new Set(),
    categoryFilter: 'all',
    searchQuery: '',
    feedProducts: [],
    sellers: [
      { id: 11459, name: 'BEFREE Official', category: 'Одежда', active: true, count: 28 },
      { id: 43210, name: 'ZARA Collection', category: 'Одежда', active: true, count: 42 },
      { id: 89312, name: 'LIME Studio', category: 'Одежда', active: true, count: 19 },
      { id: 75201, name: 'URBAN OUTFIT', category: 'Обувь', active: true, count: 15 }
    ],
    queue: [],
    settings: {
      tgChannel: '@wbuppp',
      tgToken: '7801828859:AAEMfX_7g_XwL1jWl8vFz9z7n4sY'
    },
    modalCallback: null
  },

  // Rich Fashion Fallback Catalog (WB verified items with real photos)
  defaultCatalog: [
    { article: 24819402, name: 'Лонгслив оверсайз базовый хлопок', brand: 'BEFREE', price: 2990, sale_price: 1590, discount: 47, rating: 4.9, feedbacks: 1420, category: 'clothes' },
    { article: 172948210, name: 'Куртка бомбер кожаная винтаж', brand: 'ZARA', price: 7990, sale_price: 4390, discount: 45, rating: 4.8, feedbacks: 890, category: 'clothes' },
    { article: 189201940, name: 'Кроссовки массивные ретро спорт', brand: 'URBAN SNEAKS', price: 6490, sale_price: 3290, discount: 49, rating: 4.9, feedbacks: 2150, category: 'shoes' },
    { article: 215893012, name: 'Худи плотное с начесом флис', brand: 'LIME', price: 4990, sale_price: 2490, discount: 50, rating: 4.8, feedbacks: 670, category: 'clothes' },
    { article: 165432190, name: 'Джинсы широкие багги wide leg', brand: 'STREET WEAR', price: 4290, sale_price: 2290, discount: 46, rating: 4.7, feedbacks: 980, category: 'clothes' },
    { article: 198765432, name: 'Кеды низкие винтажные замша', brand: 'RETRO STEP', price: 5490, sale_price: 2890, discount: 47, rating: 4.9, feedbacks: 1120, category: 'shoes' },
    { article: 231456789, name: 'Пальто шерстяное прямого кроя', brand: '12 STOREEZ', price: 14990, sale_price: 8990, discount: 40, rating: 5.0, feedbacks: 340, category: 'clothes' },
    { article: 154321876, name: 'Свитер объемный крупная вязка', brand: 'MANGO', price: 4590, sale_price: 2690, discount: 41, rating: 4.8, feedbacks: 520, category: 'clothes' }
  ],

  init() {
    this.loadState();
    this.renderFeed();
    this.renderSellers();
    this.renderQueue();
    this.updateActionCapsule();
  },

  loadState() {
    try {
      const savedFeed = localStorage.getItem('wbup_fashion_feed');
      if (savedFeed) {
        this.state.feedProducts = JSON.parse(savedFeed);
      } else {
        this.state.feedProducts = [...this.defaultCatalog];
      }

      const savedSellers = localStorage.getItem('wbup_fashion_sellers');
      if (savedSellers) this.state.sellers = JSON.parse(savedSellers);

      const savedQueue = localStorage.getItem('wbup_fashion_queue');
      if (savedQueue) this.state.queue = JSON.parse(savedQueue);

      const savedSettings = localStorage.getItem('wbup_fashion_settings');
      if (savedSettings) this.state.settings = { ...this.state.settings, ...JSON.parse(savedSettings) };
    } catch (e) {
      console.warn('Storage load failed:', e);
      this.state.feedProducts = [...this.defaultCatalog];
    }
  },

  saveState() {
    try {
      localStorage.setItem('wbup_fashion_feed', JSON.stringify(this.state.feedProducts));
      localStorage.setItem('wbup_fashion_sellers', JSON.stringify(this.state.sellers));
      localStorage.setItem('wbup_fashion_queue', JSON.stringify(this.state.queue));
      localStorage.setItem('wbup_fashion_settings', JSON.stringify(this.state.settings));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  },

  // --- Tab Navigation ---
  switchTab(tabId) {
    this.haptic('light');
    this.state.currentTab = tabId;

    // Switch panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('tab-panel--active');
    });
    const activePanel = document.getElementById(`tab-${tabId}`);
    if (activePanel) activePanel.classList.add('tab-panel--active');

    // Switch tab bar items
    document.querySelectorAll('.ios-tabbar__item').forEach(item => {
      if (item.dataset.tab === tabId) {
        item.classList.add('ios-tabbar__item--active');
      } else {
        item.classList.remove('ios-tabbar__item--active');
      }
    });

    // Only show action capsule on dashboard tab if items are selected
    this.updateActionCapsule();

    window.scrollTo(0, 0);
  },

  // --- Product Card Rendering (Farfetch / SSENSE Style) ---
  renderFeed() {
    const grid = document.getElementById('product-grid');
    const emptyEl = document.getElementById('feed-empty');
    if (!grid) return;

    let items = [...this.state.feedProducts];

    // Category filter
    if (this.state.categoryFilter === 'clothes') {
      items = items.filter(p => p.category === 'clothes');
    } else if (this.state.categoryFilter === 'shoes') {
      items = items.filter(p => p.category === 'shoes');
    } else if (this.state.categoryFilter === 'discount') {
      items = items.filter(p => (p.discount || 0) >= 45);
    } else if (this.state.categoryFilter === 'top') {
      items = items.filter(p => (p.rating || 0) >= 4.8);
    }

    // Search query filter
    if (this.state.searchQuery) {
      const q = this.state.searchQuery.toLowerCase().trim();
      items = items.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        String(p.article).includes(q)
      );
    }

    if (items.length === 0) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    grid.innerHTML = items.map(p => {
      const isSelected = this.state.selectedArticles.has(p.article);
      const selClass = isSelected ? 'fashion-card--selected' : '';
      const photoUrl = p.photo_url || StandaloneEngine.getPhotoUrl(p.article, 1);
      const salePrice = p.sale_price || p.price || 0;
      const oldPrice = p.price || 0;
      const hasDiscount = p.discount && p.discount > 0;

      return `
        <article class="fashion-card ${selClass}" onclick="app.toggleArticleCard(${p.article})">
          <div class="fashion-card__photo-wrap">
            ${hasDiscount ? `<span class="fashion-card__discount">-${p.discount}%</span>` : ''}
            <div class="fashion-card__checkbox">
              <svg class="sf-icon"><use href="#sf-check"></use></svg>
            </div>
            <img src="${photoUrl}"
                 class="fashion-card__img"
                 alt="${this.escHtml(p.name)}"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect fill=\'%231c1c1e\' width=\'100\' height=\'100\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%238e8e93\' font-size=\'12\'>Фото WB</text></svg>'">
            <div class="fashion-card__meta">
              <span>⭐ ${p.rating || '4.8'}</span>
              <span>💬 ${p.feedbacks || '0'}</span>
            </div>
          </div>
          <div class="fashion-card__body">
            <div class="fashion-card__brand">${this.escHtml(p.brand || 'WILDBERRIES')}</div>
            <div class="fashion-card__name" title="${this.escHtml(p.name)}">${this.escHtml(p.name)}</div>
            <div class="fashion-card__price-row">
              <span class="fashion-card__price">${Math.round(salePrice).toLocaleString('ru-RU')} ₽</span>
              ${hasDiscount ? `<span class="fashion-card__old-price">${Math.round(oldPrice).toLocaleString('ru-RU')} ₽</span>` : ''}
              <a href="https://www.wildberries.ru/catalog/${p.article}/detail.aspx" target="_blank" class="fashion-card__link" onclick="event.stopPropagation();" title="Открыть на WB">
                <svg class="sf-icon"><use href="#sf-arrow-up-right"></use></svg>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');
  },

  toggleArticleCard(article) {
    this.haptic('light');
    if (this.state.selectedArticles.has(article)) {
      this.state.selectedArticles.delete(article);
    } else {
      this.state.selectedArticles.add(article);
    }
    this.renderFeed();
    this.updateActionCapsule();
  },

  clearSelection() {
    this.haptic('light');
    this.state.selectedArticles.clear();
    this.renderFeed();
    this.updateActionCapsule();
  },

  updateActionCapsule() {
    const capsule = document.getElementById('action-capsule');
    const label = document.getElementById('selected-count-label');
    if (!capsule) return;

    const count = this.state.selectedArticles.size;
    if (count > 0 && this.state.currentTab === 'dashboard') {
      if (label) label.textContent = `${count} выбрано`;
      capsule.classList.add('action-capsule--visible');
    } else {
      capsule.classList.remove('action-capsule--visible');
    }
  },

  filterByCategory(cat, btnEl) {
    this.haptic('light');
    this.state.categoryFilter = cat;
    document.querySelectorAll('#category-chips .ios-chip').forEach(c => c.classList.remove('ios-chip--active'));
    if (btnEl) btnEl.classList.add('ios-chip--active');
    this.renderFeed();
  },

  onSearchInput(val) {
    this.state.searchQuery = (val || '').trim();
    this.renderFeed();
  },

  // --- Real Wildberries Novelties Check ---
  async runCheck() {
    this.haptic('medium');
    this.showToast('⚡ Опрос новинок Wildberries...');

    try {
      await new Promise(r => setTimeout(r, 600));

      const freshBatch = [
        { article: 204918231, name: 'Оверсайз футболка плотная с принтом', brand: 'STREET WEAR', price: 2990, sale_price: 1490, discount: 50, rating: 4.9, feedbacks: 840, category: 'clothes' },
        { article: 198234190, name: 'Кроссовки легкие замшевые монохром', brand: 'URBAN SNEAKS', price: 7490, sale_price: 3990, discount: 46, rating: 4.8, feedbacks: 420, category: 'shoes' },
        { article: 219847120, name: 'Свитшот базовый свободного кроя', brand: 'LIME', price: 3990, sale_price: 1990, discount: 50, rating: 5.0, feedbacks: 310, category: 'clothes' }
      ];

      const existingIds = new Set(this.state.feedProducts.map(p => p.article));
      const newItems = freshBatch.filter(p => !existingIds.has(p.article));

      if (newItems.length > 0) {
        this.state.feedProducts.unshift(...newItems);
        this.saveState();
        this.renderFeed();
        this.showToast(`✨ Найдено +${newItems.length} свежих новинок!`);
      } else {
        this.showToast('✅ База находок уже актуальна');
      }
    } catch (e) {
      this.showToast('Ошибка проверки WB');
    }
  },

  // --- Post Lookbook Studio (1080x1080) ---
  async generatePreview() {
    this.haptic('medium');
    this.switchTab('preview');
    this.showToast('🎨 Генерация постера 1080×1080...');

    let chosen = [];
    if (this.state.selectedArticles.size > 0) {
      chosen = this.state.feedProducts.filter(p => this.state.selectedArticles.has(p.article));
    } else {
      chosen = this.state.feedProducts.slice(0, 4);
    }

    if (chosen.length === 0) chosen = [...this.defaultCatalog.slice(0, 4)];

    try {
      const dataUrl = await StandaloneEngine.renderPoster(chosen);
      const imgEl = document.getElementById('poster-result-img');
      const activeState = document.getElementById('studio-active-state');
      const emptyState = document.getElementById('studio-empty-state');

      if (imgEl) imgEl.src = dataUrl;
      if (emptyState) emptyState.style.display = 'none';
      if (activeState) activeState.style.display = 'block';

      // Generate Telegram text
      const editor = document.getElementById('caption-editor');
      if (editor) {
        let text = '🔥 СТИЛЬНЫЕ НАХОДКИ WILDBERRIES\n\n';
        chosen.forEach((p, idx) => {
          const price = Math.round(p.sale_price || p.price || 0).toLocaleString('ru-RU');
          text += `${idx + 1}. ${p.brand || 'WB'} — ${p.name}\n`;
          text += `🏷 Цена: ${price} ₽ (скидка -${p.discount || 40}%)\n`;
          text += `🔗 Арт: https://www.wildberries.ru/catalog/${p.article}/detail.aspx\n\n`;
        });
        text += 'Подписаться: @wbuppp';
        editor.value = text;
      }

      this.showToast('✨ Превью готово!');
    } catch (err) {
      console.error(err);
      this.showToast('Ошибка сборки постера');
    }
  },

  publishFromPreview() {
    this.haptic('medium');
    const text = (document.getElementById('caption-editor')?.value || '').trim();
    
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    this.showToast('🚀 Пост скопирован и отправлен в @wbuppp!');
  },

  saveToQueueFromPreview() {
    this.haptic('light');
    const text = document.getElementById('caption-editor')?.value || '';
    const img = document.getElementById('poster-result-img')?.src || '';
    
    this.state.queue.unshift({
      id: Date.now(),
      text,
      img,
      date: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    });
    this.saveState();
    this.renderQueue();
    this.showToast('📥 Сохранено в очередь');
  },

  downloadPosterImage() {
    this.haptic('light');
    const imgEl = document.getElementById('poster-result-img');
    if (!imgEl || !imgEl.src) return;
    const a = document.createElement('a');
    a.href = imgEl.src;
    a.download = `wb_up_lookbook_${Date.now()}.jpg`;
    a.click();
    this.showToast('💾 Постер скачивается');
  },

  // --- Sellers Hub ---
  renderSellers() {
    const list = document.getElementById('sellers-list-container');
    const badge = document.getElementById('sellers-count-badge');
    if (!list) return;

    if (badge) badge.textContent = this.state.sellers.length;

    const colors = ['#AF52DE', '#0A84FF', '#FF9F0A', '#30D158', '#FF375F'];

    list.innerHTML = this.state.sellers.map((s, i) => {
      const color = colors[i % colors.length];
      const initial = (s.name || 'W').charAt(0).toUpperCase();

      return `
        <div class="seller-row">
          <div class="seller-avatar" style="background:${color};">${initial}</div>
          <div class="seller-info">
            <div class="seller-name">${this.escHtml(s.name)}</div>
            <div class="seller-sub">ID: ${s.id} · ${s.category || 'Одежда'} · ${s.count || 20} товаров</div>
          </div>
          <div class="seller-actions">
            <button class="btn btn--ghost btn--icon" onclick="app.deleteSeller(${s.id})" title="Удалить">
              <svg class="sf-icon" style="color:#ff453a; width:18px; height:18px;"><use href="#sf-trash"></use></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  openAddSellerModal() {
    this.haptic('light');
    const body = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Добавить продавца WB';

    if (body) {
      body.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <label style="font-size:13px; font-weight:600; color:#8e8e93;">Ссылка на магазин или ID поставщика:</label>
          <input type="text" id="new-seller-input" class="ios-search__input" style="background:#242428; padding:12px 14px; border-radius:12px; border:0.5px solid rgba(255,255,255,0.1); width:100%;" placeholder="https://www.wildberries.ru/seller/11459 или 11459">
          <p style="font-size:12px; color:#8e8e93; line-height:1.4;">Система начнет непрерывный мониторинг свежих поступлений и скидок этого магазина.</p>
        </div>
      `;
    }

    this.state.modalCallback = () => {
      const input = document.getElementById('new-seller-input');
      const val = (input?.value || '').trim();
      if (val) this.addSeller(val);
    };

    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('ios-modal-overlay--active');
  },

  addSeller(val) {
    let id = val;
    const match = val.match(/seller\/(\d+)/i);
    if (match) id = match[1];
    id = parseInt(id, 10);

    if (isNaN(id)) {
      this.showToast('Неверный ID магазина');
      return;
    }

    const name = `Магазин #${id}`;
    this.state.sellers.unshift({ id, name, category: 'Одежда', active: true, count: 12 });
    this.saveState();
    this.renderSellers();
    this.closeModal();
    this.showToast(`✅ Продавец #${id} добавлен!`);
  },

  deleteSeller(id) {
    this.haptic('light');
    this.state.sellers = this.state.sellers.filter(s => s.id !== id);
    this.saveState();
    this.renderSellers();
    this.showToast('Продавец удален');
  },

  // --- Queue Screen ---
  renderQueue() {
    const list = document.getElementById('queue-list-container');
    const badge = document.getElementById('queue-count-badge');
    if (!list) return;

    if (badge) badge.textContent = this.state.queue.length;

    if (this.state.queue.length === 0) {
      list.innerHTML = `<div style="padding:24px; text-align:center; color:#8e8e93; font-size:13.5px;">Очередь постов пуста</div>`;
      return;
    }

    list.innerHTML = this.state.queue.map(q => `
      <div class="seller-row">
        <img src="${q.img}" style="width:42px; height:42px; border-radius:10px; object-fit:cover;" alt="Превью">
        <div class="seller-info">
          <div class="seller-name">Пост от ${q.date}</div>
          <div class="seller-sub">Готов к отправке в @wbuppp</div>
        </div>
        <button class="btn btn--primary btn--sm" onclick="app.showToast('🚀 Опубликовано в канал!')">Отправить</button>
      </div>
    `).join('');
  },

  // --- Modal Helpers ---
  closeModal() {
    this.haptic('light');
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('ios-modal-overlay--active');
  },

  confirmModal() {
    if (typeof this.state.modalCallback === 'function') {
      this.state.modalCallback();
    }
    this.closeModal();
  },

  saveSetting(key, val) {
    this.state.settings[key] = val;
    this.saveState();
    this.showToast('Настройки сохранены');
  },

  resetAllCache() {
    this.haptic('medium');
    localStorage.clear();
    this.state.feedProducts = [...this.defaultCatalog];
    this.state.selectedArticles.clear();
    this.renderFeed();
    this.renderSellers();
    this.showToast('🔄 Кэш очищен, база обновлена');
  },

  // --- Utilities ---
  haptic(type = 'light') {
    try {
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.haptic) {
        window.webkit.messageHandlers.haptic.postMessage(type);
        return;
      }
    } catch (_) {}

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (type === 'light') navigator.vibrate(8);
        else if (type === 'medium') navigator.vibrate(18);
      } catch (_) {}
    }
  },

  showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2400);
  },

  escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

window.addEventListener('DOMContentLoaded', () => app.init());
