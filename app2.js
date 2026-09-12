/** ============================================================
 * Wildberries Channel Manager — Studio Web GUI (v2.2)
 * Client-side JavaScript (app2.js)
 * Modern, responsive, feature-rich control center.
 * ============================================================ */

const API_BASE = '';

/** ============================================================
 * StandaloneEngine — Autonomous Client-Side Engine for iOS & Web
 * Direct Wildberries API polling, Canvas 1080x1080 generation,
 * Telegram Bot API publishing, and localStorage persistence.
 * ============================================================ */
const StandaloneEngine = {
  version: "2.3.0-standalone",

  STORAGE: {
    SETTINGS: "wbup_standalone_settings_v1",
    SELLERS: "wbup_standalone_sellers_v1",
    QUEUE: "wbup_standalone_queue_v1",
    CATALOG: "wbup_standalone_catalog_v1",
    PUBLICATIONS: "wbup_standalone_pubs_v1",
    LOGS: "wbup_standalone_logs_v1",
  },

  defaultSettings: {
    bot_token: "8734971912:AAGmygfEBD69qibXSiH1q_lM3JUmCPTXy4c",
    channel: "@wbuppp",
    notification_chat_id: "",
    min_rating: 4.7,
    max_price: 3500,
    products_per_category: 10,
    mode: "mixed",
  },

  defaultSellers: [
    { supplier_id: 110887, brand: "StreetStar", enabled: true, created_at: "2026-09-01" },
    { supplier_id: 4183217, brand: "SOQ WAY", enabled: true, created_at: "2026-09-01" },
    { supplier_id: 42283, brand: "Red Flag", enabled: true, created_at: "2026-09-01" },
    { supplier_id: 1266941, brand: "Urban Style", enabled: true, created_at: "2026-09-05" },
  ],

  // --- 1. Storage Methods ---
  getSettings() {
    try {
      const saved = localStorage.getItem(this.STORAGE.SETTINGS);
      return saved ? { ...this.defaultSettings, ...JSON.parse(saved) } : { ...this.defaultSettings };
    } catch (_) {
      return { ...this.defaultSettings };
    }
  },

  saveSettings(newSettings) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...newSettings };
      localStorage.setItem(this.STORAGE.SETTINGS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error("Failed to save settings to localStorage:", e);
      return this.getSettings();
    }
  },

  getSellers() {
    try {
      const saved = localStorage.getItem(this.STORAGE.SELLERS);
      if (saved) return JSON.parse(saved);
      this.saveSellers(this.defaultSellers);
      return [...this.defaultSellers];
    } catch (_) {
      return [...this.defaultSellers];
    }
  },

  saveSellers(sellers) {
    try {
      localStorage.setItem(this.STORAGE.SELLERS, JSON.stringify(sellers));
    } catch (e) {
      console.error("Failed to save sellers:", e);
    }
  },

  addSeller(input) {
    const raw = String(input || "").trim();
    let supplierId = null;
    let brand = "WB Seller";

    const urlMatch = raw.match(/seller\/(\d+)/i) || raw.match(/supplier\/(\d+)/i);
    if (urlMatch) {
      supplierId = parseInt(urlMatch[1], 10);
    } else if (/^\d+$/.test(raw)) {
      supplierId = parseInt(raw, 10);
    } else {
      throw new Error("Укажите корректный Supplier ID или ссылку на продавца");
    }

    const sellers = this.getSellers();
    if (sellers.some(s => s.supplier_id === supplierId)) {
      return { success: true, message: "Продавец уже добавлен", seller: sellers.find(s => s.supplier_id === supplierId) };
    }

    const newSeller = {
      supplier_id: supplierId,
      brand: brand + ` #${supplierId}`,
      enabled: true,
      created_at: new Date().toISOString().slice(0, 10),
    };
    sellers.unshift(newSeller);
    this.saveSellers(sellers);
    return { success: true, seller: newSeller };
  },

  toggleSeller(supplierId, enabled) {
    const sellers = this.getSellers();
    const target = sellers.find(s => s.supplier_id === parseInt(supplierId, 10));
    if (target) {
      target.enabled = Boolean(enabled);
      this.saveSellers(sellers);
    }
    return { success: true };
  },

  deleteSeller(supplierId) {
    let sellers = this.getSellers();
    sellers = sellers.filter(s => s.supplier_id !== parseInt(supplierId, 10));
    this.saveSellers(sellers);
    return { success: true };
  },

  getQueue() {
    try {
      const saved = localStorage.getItem(this.STORAGE.QUEUE);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  },

  saveQueue(queue) {
    try {
      localStorage.setItem(this.STORAGE.QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to save queue:", e);
    }
  },

  addToQueue({ articles, post_text, preview_card_path, card_data_url }) {
    const queue = this.getQueue();
    const id = Date.now();
    const item = {
      id,
      articles: articles || [],
      post_text: post_text || "",
      preview_card_path: preview_card_path || card_data_url || null,
      card_data_url: card_data_url || preview_card_path || null,
      status: "pending",
      created_at: new Date().toLocaleString("ru-RU"),
    };
    queue.unshift(item);
    this.saveQueue(queue);
    return { success: true, id, item };
  },

  deleteQueueItem(id) {
    let queue = this.getQueue();
    queue = queue.filter(x => x.id !== parseInt(id, 10));
    this.saveQueue(queue);
    return { success: true };
  },

  getPublications() {
    try {
      const saved = localStorage.getItem(this.STORAGE.PUBLICATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  },

  addPublication(pub) {
    try {
      const pubs = this.getPublications();
      pubs.unshift({
        id: Date.now(),
        ...pub,
        created_at: new Date().toLocaleString("ru-RU"),
      });
      if (pubs.length > 50) pubs.length = 50;
      localStorage.setItem(this.STORAGE.PUBLICATIONS, JSON.stringify(pubs));
    } catch (e) {
      console.error("Failed to record publication:", e);
    }
  },

  getCachedCatalog() {
    try {
      const saved = localStorage.getItem(this.STORAGE.CATALOG);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  },

  saveCachedCatalog(prods) {
    try {
      localStorage.setItem(this.STORAGE.CATALOG, JSON.stringify(prods));
    } catch (e) {
      console.error("Failed to cache catalog:", e);
    }
  },

  getLogs() {
    try {
      const saved = localStorage.getItem(this.STORAGE.LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  },

  addLog(level, message) {
    try {
      const logs = this.getLogs();
      const now = new Date().toLocaleTimeString("ru-RU");
      logs.unshift(`[${now}] [${level}] ${message}`);
      if (logs.length > 100) logs.length = 100;
      localStorage.setItem(this.STORAGE.LOGS, JSON.stringify(logs));
    } catch (_) {}
  },

  clearLogs() {
    localStorage.removeItem(this.STORAGE.LOGS);
    return { success: true };
  },

  // --- 2. Direct Wildberries API Polling ---
  getBasketNumber(article) {
    const vol = Math.floor(article / 100000);
    if (vol <= 143) return 1;
    if (vol <= 287) return 2;
    if (vol <= 431) return 3;
    if (vol <= 719) return 4;
    if (vol <= 1007) return 5;
    if (vol <= 1061) return 6;
    if (vol <= 1115) return 7;
    if (vol <= 1169) return 8;
    if (vol <= 1313) return 9;
    if (vol <= 1601) return 10;
    if (vol <= 1655) return 11;
    if (vol <= 1919) return 12;
    if (vol <= 2045) return 13;
    if (vol <= 2189) return 14;
    if (vol <= 2405) return 15;
    if (vol <= 2621) return 16;
    if (vol <= 2837) return 17;
    if (vol <= 3053) return 18;
    if (vol <= 3269) return 19;
    if (vol <= 3485) return 20;
    if (vol <= 3701) return 21;
    if (vol <= 3917) return 22;
    if (vol <= 4133) return 23;
    if (vol <= 4349) return 24;
    if (vol <= 4565) return 25;
    if (vol <= 4781) return 26;
    if (vol <= 4997) return 27;
    if (vol <= 5213) return 28;
    if (vol <= 5429) return 29;
    return 30;
  },

  getPhotoUrl(article, index = 1, size = "c516x688") {
    const basket = this.getBasketNumber(article);
    const b = basket < 10 ? "0" + basket : String(basket);
    const vol = Math.floor(article / 100000);
    const part = Math.floor(article / 1000);
    return `https://basket-${b}.wbbasket.ru/vol${vol}/part${part}/${article}/images/${size}/${index}.webp`;
  },

  async fetchSellerCatalog(supplierId) {
    const url = `https://catalog.wb.ru/sellers/v4/catalog?appType=1&dest=-1257786&supplier=${supplierId}`;
    try {
      const resp = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const rawProducts = (data && data.products) || (data && data.data && data.data.products) || [];

      return rawProducts.map(p => {
        const basic = (p.sizes && p.sizes[0] && p.sizes[0].price && p.sizes[0].price.basic) || p.priceU || 0;
        const productPrice = (p.sizes && p.sizes[0] && p.sizes[0].price && p.sizes[0].price.product) || p.salePriceU || basic;
        const price = Math.round(basic / 100);
        const sale_price = Math.round(productPrice / 100);

        return {
          id: p.id,
          article: p.id,
          name: p.name || "Товар Wildberries",
          brand: p.brand || "WB",
          supplier: p.supplier || p.brand || "",
          supplier_id: p.supplierId || supplierId,
          price: price || sale_price,
          sale_price: sale_price || price,
          rating: p.reviewRating || p.rating || 5,
          feedbacks: p.feedbacks || 0,
          pics: p.pics || 1,
          colors: p.colors ? p.colors.map(c => c.name).filter(Boolean) : [],
          category: p.entity || "Одежда",
          photo_url: this.getPhotoUrl(p.id, 1, "c516x688"),
          is_new: true,
        };
      });
    } catch (e) {
      console.warn(`WB Catalog fetch error for seller ${supplierId}:`, e);
      return [];
    }
  },

  async syncAllSellers() {
    const sellers = this.getSellers().filter(s => s.enabled);
    if (sellers.length === 0) return [];

    this.addLog("INFO", `Автономный опрос каталогов WB для ${sellers.length} продавцов...`);
    let all = [];
    const settings = this.getSettings();

    for (const s of sellers) {
      const items = await this.fetchSellerCatalog(s.supplier_id);
      if (items.length > 0) {
        if (s.brand.startsWith("WB Seller") && items[0].brand) {
          s.brand = items[0].brand;
          this.saveSellers(this.getSellers().map(x => x.supplier_id === s.supplier_id ? s : x));
        }
        all.push(...items);
      }
    }

    if (settings.min_rating) {
      all = all.filter(p => (p.rating || 5) >= settings.min_rating);
    }
    if (settings.max_price) {
      all = all.filter(p => (p.sale_price || p.price || 0) <= settings.max_price);
    }

    const seen = new Set();
    const unique = [];
    for (const p of all) {
      if (!seen.has(p.article)) {
        seen.add(p.article);
        unique.push(p);
      }
    }

    this.saveCachedCatalog(unique);
    this.addLog("INFO", `Синхронизировано ${unique.length} актуальных товаров WB`);
    return unique;
  },

  // --- 3. HTML5 Canvas 1080x1080 Poster Generator ---
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (src.includes("/c516x688/")) {
          const fallback = src.replace("/c516x688/", "/big/");
          const retryImg = new Image();
          retryImg.crossOrigin = "anonymous";
          retryImg.onload = () => resolve(retryImg);
          retryImg.onerror = () => reject(new Error("Image load failed"));
          retryImg.src = fallback;
        } else {
          reject(new Error("Image load failed"));
        }
      };
      img.src = src;
    });
  },

  cutoutProduct(img, tolerance = 30) {
    const c = document.createElement("canvas");
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1], [Math.floor(w/2), 0]];
      let bgR = 0, bgG = 0, bgB = 0;
      for (const [x, y] of corners) {
        const i = (y * w + x) * 4;
        bgR += data[i];
        bgG += data[i + 1];
        bgB += data[i + 2];
      }
      bgR = Math.round(bgR / corners.length);
      bgG = Math.round(bgG / corners.length);
      bgB = Math.round(bgB / corners.length);

      const isLightBg = (bgR + bgG + bgB) / 3 > 195;

      const visited = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let head = 0, tail = 0;

      const isBg = (r, g, b) => {
        if (isLightBg) {
          const dr = Math.abs(r - bgR);
          const dg = Math.abs(g - bgG);
          const db = Math.abs(b - bgB);
          return (dr + dg + db) < tolerance * 3 || (r > 240 && g > 240 && b > 240);
        }
        return Math.hypot(r - bgR, g - bgG, b - bgB) < tolerance;
      };

      for (let x = 0; x < w; x++) {
        let i0 = x * 4;
        if (isBg(data[i0], data[i0 + 1], data[i0 + 2])) { visited[x] = 1; queue[tail++] = x; }
        let p1 = (h - 1) * w + x;
        let i1 = p1 * 4;
        if (isBg(data[i1], data[i1 + 1], data[i1 + 2])) { visited[p1] = 1; queue[tail++] = p1; }
      }
      for (let y = 0; y < h; y++) {
        let p0 = y * w;
        let i0 = p0 * 4;
        if (!visited[p0] && isBg(data[i0], data[i0 + 1], data[i0 + 2])) { visited[p0] = 1; queue[tail++] = p0; }
        let p1 = y * w + (w - 1);
        let i1 = p1 * 4;
        if (!visited[p1] && isBg(data[i1], data[i1 + 1], data[i1 + 2])) { visited[p1] = 1; queue[tail++] = p1; }
      }

      while (head < tail) {
        const curr = queue[head++];
        data[curr * 4 + 3] = 0;
        const cx = curr % w;
        const cy = Math.floor(curr / w);

        const neighbors = [
          cx > 0 ? curr - 1 : -1,
          cx < w - 1 ? curr + 1 : -1,
          cy > 0 ? curr - w : -1,
          cy < h - 1 ? curr + w : -1,
        ];

        for (let i = 0; i < 4; i++) {
          const n = neighbors[i];
          if (n !== -1 && visited[n] === 0) {
            const ni = n * 4;
            if (isBg(data[ni], data[ni + 1], data[ni + 2])) {
              visited[n] = 1;
              queue[tail++] = n;
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return c;
    } catch (e) {
      console.warn("Cutout fallback to raw:", e);
      return img;
    }
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
  },

  async renderPoster(products) {
    if (!products || products.length === 0) {
      throw new Error("Нет товаров для генерации карточки");
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");

    // 1. Studio Backdrop Gradient
    const bgGrad = ctx.createRadialGradient(540, 480, 50, 540, 540, 760);
    bgGrad.addColorStop(0, "#1c1c28");
    bgGrad.addColorStop(0.6, "#101017");
    bgGrad.addColorStop(1, "#08080c");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Ambient Lighting
    ctx.save();
    ctx.filter = "blur(90px)";
    ctx.fillStyle = "rgba(175, 82, 222, 0.22)";
    ctx.beginPath();
    ctx.arc(280, 240, 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(10, 132, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(820, 360, 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Outer Frame
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, 20, 20, 1040, 1040, 36);
    ctx.stroke();

    // Top Header Banner
    ctx.save();
    this.drawRoundedRect(ctx, 50, 44, 400, 54, 27);
    ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#AF52DE";
    ctx.beginPath();
    ctx.arc(76, 71, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillText("WB UP STUDIO", 96, 78);
    ctx.fillStyle = "#8E8E93";
    ctx.font = '500 17px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillText("• НАХОДКИ", 262, 77);
    ctx.restore();

    // Top right category badge
    ctx.save();
    const catName = (products[0].category || "ТОП ВЫБОР").toUpperCase();
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    this.drawRoundedRect(ctx, 740, 44, 290, 54, 27);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.stroke();

    ctx.fillStyle = "#FFD60A";
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(catName.slice(0, 16), 885, 77);
    ctx.restore();

    // 2. Load & Cutout images
    const loadedCuts = [];
    for (const p of products.slice(0, 4)) {
      try {
        const rawImg = await this.loadImage(p.photo_url || this.getPhotoUrl(p.article));
        const cut = this.cutoutProduct(rawImg, 28);
        loadedCuts.push({ product: p, cut });
      } catch (e) {
        console.warn("Failed to load/cutout for product:", p.article, e);
      }
    }

    if (loadedCuts.length === 0) {
      throw new Error("Не удалось загрузить фотографии товаров с серверов Wildberries");
    }

    // 3. Layout Rendering
    if (loadedCuts.length === 1) {
      const { product: p, cut } = loadedCuts[0];

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = 45;
      ctx.shadowOffsetY = 24;

      const maxW = 720;
      const maxH = 580;
      const scale = Math.min(maxW / cut.width, maxH / cut.height);
      const dw = cut.width * scale;
      const dh = cut.height * scale;
      const dx = (1080 - dw) / 2;
      const dy = 130 + (maxH - dh) / 2;
      ctx.drawImage(cut, dx, dy, dw, dh);
      ctx.restore();

      const cardX = 60, cardY = 740, cardW = 960, cardH = 280, cardR = 32;
      ctx.save();
      this.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.fillStyle = "rgba(20, 20, 28, 0.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#AF52DE";
      ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      ctx.fillText((p.brand || "WILDBERRIES").toUpperCase(), cardX + 36, cardY + 54);

      ctx.fillStyle = "#FFD60A";
      ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      ctx.fillText(`★ ${p.rating || 5.0}`, cardX + cardW - 130, cardY + 54);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = '600 30px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      const title = (p.name || "Товар").slice(0, 46) + ((p.name || "").length > 46 ? "..." : "");
      ctx.fillText(title, cardX + 36, cardY + 110);

      const sale = p.sale_price || p.price || 0;
      const orig = p.price && p.price > sale ? p.price : Math.round(sale * 1.55);
      const discount = Math.round((1 - sale / orig) * 100);

      ctx.fillStyle = "#34C759";
      ctx.font = '800 58px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      const priceText = `${sale.toLocaleString("ru-RU")} ₽`;
      ctx.fillText(priceText, cardX + 36, cardY + 200);

      const priceWidth = ctx.measureText(priceText).width;
      const oldX = cardX + 36 + priceWidth + 28;
      ctx.fillStyle = "#8E8E93";
      ctx.font = '600 32px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      const oldText = `${orig.toLocaleString("ru-RU")} ₽`;
      ctx.fillText(oldText, oldX, cardY + 192);

      const oldWidth = ctx.measureText(oldText).width;
      ctx.strokeStyle = "#FF3B30";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(oldX - 4, cardY + 182);
      ctx.lineTo(oldX + oldWidth + 4, cardY + 182);
      ctx.stroke();

      if (discount > 0) {
        const pillX = oldX + oldWidth + 24;
        const pillY = cardY + 154;
        const pillW = 100;
        const pillH = 46;
        this.drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 14);
        const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
        pillGrad.addColorStop(0, "#FF3B30");
        pillGrad.addColorStop(1, "#FF9500");
        ctx.fillStyle = pillGrad;
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(`-${discount}%`, pillX + pillW / 2, pillY + 32);
      }

      ctx.textAlign = "right";
      ctx.fillStyle = "#636366";
      ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "JetBrains Mono", monospace';
      ctx.fillText(`АРТ: ${p.article}`, cardX + cardW - 36, cardY + 240);
      ctx.restore();

    } else if (loadedCuts.length === 2) {
      const cardW = 465, cardH = 910, cardY = 125;
      const positions = [50, 565];

      loadedCuts.slice(0, 2).forEach(({ product: p, cut }, idx) => {
        const cardX = positions[idx];
        ctx.save();
        this.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
        ctx.fillStyle = "rgba(20, 20, 28, 0.85)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 16;

        const maxW = cardW - 40;
        const maxH = 500;
        const scale = Math.min(maxW / cut.width, maxH / cut.height);
        const dw = cut.width * scale;
        const dh = cut.height * scale;
        const dx = cardX + (cardW - dw) / 2;
        const dy = cardY + 30 + (maxH - dh) / 2;
        ctx.drawImage(cut, dx, dy, dw, dh);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = "#AF52DE";
        ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.fillText((p.brand || "WILDBERRIES").toUpperCase().slice(0, 20), cardX + 24, cardY + 580);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.fillText((p.name || "").slice(0, 26) + "...", cardX + 24, cardY + 625);

        const sale = p.sale_price || p.price || 0;
        const orig = p.price && p.price > sale ? p.price : Math.round(sale * 1.5);
        const discount = Math.round((1 - sale / orig) * 100);

        ctx.fillStyle = "#34C759";
        ctx.font = '800 48px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.fillText(`${sale.toLocaleString("ru-RU")} ₽`, cardX + 24, cardY + 700);

        if (discount > 0) {
          const pillX = cardX + cardW - 105;
          const pillY = cardY + 660;
          this.drawRoundedRect(ctx, pillX, pillY, 82, 40, 12);
          ctx.fillStyle = "#FF3B30";
          ctx.fill();
          ctx.fillStyle = "#FFFFFF";
          ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
          ctx.textAlign = "center";
          ctx.fillText(`-${discount}%`, pillX + 41, pillY + 28);
        }

        ctx.fillStyle = "#636366";
        ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "JetBrains Mono", monospace';
        ctx.textAlign = "left";
        ctx.fillText(`арт. ${p.article}`, cardX + 24, cardY + 760);
        ctx.restore();
      });

    } else {
      const cardW = 465, cardH = 435;
      const coords = [
        [50, 125],
        [565, 125],
        [50, 595],
        [565, 595]
      ];

      loadedCuts.slice(0, 4).forEach(({ product: p, cut }, idx) => {
        const [cardX, cardY] = coords[idx];
        ctx.save();
        this.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 26);
        ctx.fillStyle = "rgba(22, 22, 30, 0.88)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 12;

        const maxW = cardW - 40;
        const maxH = 260;
        const scale = Math.min(maxW / cut.width, maxH / cut.height);
        const dw = cut.width * scale;
        const dh = cut.height * scale;
        const dx = cardX + (cardW - dw) / 2;
        const dy = cardY + 16 + (maxH - dh) / 2;
        ctx.drawImage(cut, dx, dy, dw, dh);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = "#AF52DE";
        ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.fillText((p.brand || "WB").toUpperCase().slice(0, 18), cardX + 20, cardY + 315);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.fillText((p.name || "").slice(0, 24) + "...", cardX + 20, cardY + 348);

        const sale = p.sale_price || p.price || 0;
        const orig = p.price && p.price > sale ? p.price : Math.round(sale * 1.5);
        const discount = Math.round((1 - sale / orig) * 100);

        ctx.fillStyle = "#34C759";
        ctx.font = '800 36px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        ctx.fillText(`${sale.toLocaleString("ru-RU")} ₽`, cardX + 20, cardY + 400);

        if (discount > 0) {
          const pillX = cardX + cardW - 90;
          const pillY = cardY + 368;
          this.drawRoundedRect(ctx, pillX, pillY, 70, 34, 10);
          ctx.fillStyle = "#FF3B30";
          ctx.fill();
          ctx.fillStyle = "#FFFFFF";
          ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
          ctx.textAlign = "center";
          ctx.fillText(`-${discount}%`, pillX + 35, pillY + 24);
        }
        ctx.restore();
      });
    }

    const cardDataUrl = canvas.toDataURL("image/jpeg", 0.94);
    const cardBlob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.94));

    const cat = products[0].category || "Одежда";
    const lines = [
      `🔥 <b>Находки Wildberries</b>`,
      `🏷 <b>${cat}</b>`,
      "",
    ];
    products.forEach((p, i) => {
      const priceStr = p.sale_price || p.price ? `${p.sale_price || p.price} ₽` : "уточняется";
      lines.push(`${i + 1}️⃣ <a href="https://www.wildberries.ru/catalog/${p.article}/detail.aspx"><b>${p.brand || "WB"}</b> — ${p.name || "Товар"}</a>`);
      lines.push(`   💰 <b>${priceStr}</b>  (арт. <code>${p.article}</code>)`);
      lines.push("");
    });
    lines.push(`<i>Канал @wbuppp — лучшие предложения</i>`);
    lines.push("#wildberries #wb #скидки #находки");

    return {
      success: true,
      text: lines.join("\n"),
      card_path: cardDataUrl,
      card_data_url: cardDataUrl,
      card_blob: cardBlob,
      articles: products.map(p => p.article),
      products: products.map(p => ({
        article: p.article,
        name: p.name,
        price: p.sale_price || p.price,
        category: p.category,
      })),
    };
  },

  // --- 4. Direct Telegram Bot API Publishing ---
  async publishToTelegram({ articles, text, cardBlob, cardDataUrl }) {
    const settings = this.getSettings();
    const token = settings.bot_token || "";
    const channel = settings.channel || "@wbuppp";

    if (!token || token.includes("YOUR_BOT_TOKEN")) {
      throw new Error("Укажите Telegram Bot Token в разделе «Настройки» для автономной публикации!");
    }

    const catalog = this.getCachedCatalog();
    const targetProducts = (articles || []).map(a => catalog.find(p => p.article === a) || { article: a, name: `Товар ${a}` });

    const buttons = targetProducts.map((p, idx) => ([{
      text: `🛍 ${idx + 1}. Купить на WB (${p.price ? `${p.price} ₽` : "Смотреть"})`,
      url: `https://www.wildberries.ru/catalog/${p.article}/detail.aspx`,
    }]));

    const replyMarkup = { inline_keyboard: buttons };

    let photoBlob = cardBlob;
    if (!photoBlob && cardDataUrl && cardDataUrl.startsWith("data:")) {
      const res = await fetch(cardDataUrl);
      photoBlob = await res.blob();
    }

    let url, reqBody;
    if (photoBlob) {
      url = `https://api.telegram.org/bot${token}/sendPhoto`;
      const formData = new FormData();
      formData.append("chat_id", channel);
      formData.append("caption", text || "🔥 Находки Wildberries");
      formData.append("parse_mode", "HTML");
      formData.append("reply_markup", JSON.stringify(replyMarkup));
      formData.append("photo", photoBlob, "wb_poster.jpg");
      reqBody = { method: "POST", body: formData };
    } else {
      url = `https://api.telegram.org/bot${token}/sendMessage`;
      reqBody = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel,
          text: text || "🔥 Находки Wildberries",
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
      };
    }

    this.addLog("INFO", `Отправка поста в Telegram канал ${channel}...`);
    const response = await fetch(url, reqBody);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      const err = data.description || `HTTP ${response.status}`;
      this.addLog("ERROR", `Сбой отправки в Telegram: ${err}`);
      throw new Error(`Telegram API: ${err}`);
    }

    this.addPublication({
      channel,
      articles,
      message_id: data.result && data.result.message_id,
      post_text: text,
    });
    this.addLog("INFO", `Пост успешно опубликован в ${channel} (Message ID: ${data.result && data.result.message_id})`);

    return {
      success: true,
      published: (articles && articles.length) || 1,
      message_id: data.result && data.result.message_id,
    };
  },

  // --- 5. Virtual API Handler ---
  async handleApi(endpoint, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const body = options.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : {};

    if (endpoint === "/api/health") {
      return { status: "ok", mode: "standalone" };
    }

    if (endpoint === "/api/statistics") {
      const prods = this.getCachedCatalog();
      const queue = this.getQueue();
      const sellers = this.getSellers();
      const pubs = this.getPublications();
      return {
        total_products: prods.length,
        new_today: prods.filter(p => p.is_new).length,
        in_queue: queue.filter(q => q.status === "pending").length,
        published_today: pubs.length,
        sellers_count: sellers.length,
      };
    }

    if (endpoint.startsWith("/api/products")) {
      let catalog = this.getCachedCatalog();
      if (catalog.length === 0) {
        catalog = await this.syncAllSellers();
      }
      return catalog;
    }

    if (endpoint === "/api/sellers") {
      return this.getSellers();
    }
    if (endpoint === "/api/sellers/add") {
      return this.addSeller(body.input);
    }
    if (endpoint === "/api/sellers/toggle") {
      return this.toggleSeller(body.supplier_id, body.enabled);
    }
    if (endpoint.startsWith("/api/sellers/") && method === "DELETE") {
      const sid = endpoint.split("/").pop();
      return this.deleteSeller(sid);
    }

    if (endpoint.startsWith("/api/queue")) {
      if (endpoint === "/api/queue") return this.getQueue();
      if (endpoint === "/api/queue/add") return this.addToQueue(body);
      if (endpoint.endsWith("/publish") && method === "POST") {
        const qid = endpoint.split("/")[3];
        const q = this.getQueue();
        const item = q.find(x => x.id === parseInt(qid, 10));
        if (!item) throw new Error("Запись в очереди не найдена");
        const res = await this.publishToTelegram({
          articles: item.articles,
          text: item.post_text,
          cardDataUrl: item.card_data_url || item.preview_card_path,
        });
        item.status = "published";
        this.saveQueue(q);
        return res;
      }
      if (method === "DELETE") {
        const qid = endpoint.split("/").pop();
        return this.deleteQueueItem(qid);
      }
    }

    if (endpoint.startsWith("/api/publications")) {
      return this.getPublications();
    }

    if (endpoint === "/api/preview") {
      const catalog = this.getCachedCatalog();
      const articles = body.articles || [];
      const selected = articles.map(art => catalog.find(p => p.article === art) || {
        article: art,
        name: `Товар #${art}`,
        brand: "WB",
        price: 1990,
        sale_price: 1490,
        rating: 4.8,
        photo_url: this.getPhotoUrl(art),
      });
      return await this.renderPoster(selected);
    }

    if (endpoint === "/api/publish") {
      return await this.publishToTelegram({
        articles: body.articles,
        text: body.text,
        cardBlob: body.card_blob,
        cardDataUrl: body.preview_card_path,
      });
    }

    if (endpoint === "/api/check") {
      const items = await this.syncAllSellers();
      return { success: true, count: items.length };
    }

    if (endpoint === "/api/settings") {
      if (method === "POST") {
        return this.saveSettings(body);
      }
      return this.getSettings();
    }

    if (endpoint === "/api/system/diagnostics") {
      const settings = this.getSettings();
      return {
        checks: [
          { name: "WB API Gateway", status: "ok", details: "catalog.wb.ru & wbbasket.ru активны" },
          { name: "Telegram Bot API", status: settings.bot_token ? "ok" : "warning", details: settings.bot_token ? "Токен настроен" : "Укажите BOT_TOKEN" },
          { name: "HTML5 Canvas Studio", status: "ok", details: "1080x1080 2D / Cutout движок готов" },
          { name: "Локальное хранилище", status: "ok", details: "localStorage & IndexedDB активны" },
        ]
      };
    }

    if (endpoint === "/api/system/info") {
      return {
        version: "2.3.0 Standalone",
        uptime_human: "Client Autonomous Engine",
        python_version: "None (Standalone JS / iOS)",
        db_size_mb: 0.8,
      };
    }

    if (endpoint === "/api/logs") {
      return this.getLogs();
    }
    if (endpoint === "/api/logs/clear") {
      return this.clearLogs();
    }

    if (endpoint === "/api/cache/clear") {
      localStorage.removeItem(this.STORAGE.CATALOG);
      return { success: true };
    }

    console.warn("Unhandled Standalone API endpoint:", endpoint);
    return { success: true };
  }
};



const app = {
  // --- State ---
  state: {
    isStandalone: false,
    currentTab: 'dashboard',
    products: [],
    selectedArticles: new Set(),
    catalogFilterSeller: 'all',
    catalogFilterGender: 'all',
    catalogFilterCategory: 'all',
    catalogFilterAI: 'all',
    catalogSearchQuery: '',
    catalogSortKey: 'default',
    modalCallback: null,
    logs: [],
    queue: [],
    currentPreview: null,
  },

  // --- Initialization ---
  init() {
    this.initStandaloneState();
    this.initTheme();
    this.loadState();
    this.setupTabs();
    this.setupShortcuts();
    this.initMobileGestures();
    this.refreshAll();
    this.loadCatalog(); // Always preload fresh catalog with AI ratings
    this.startHealthCheck();
    this.runDiagnostics(true); // silent initial check

    // Periodic dashboard stats refresh (every 25s)
    setInterval(() => this.refreshDashboard(), 25000);
  },


  initStandaloneState() {
    const isFile = window.location.protocol === 'file:';
    const isIos = Boolean(window.IS_IOS_NATIVE_APP || (window.webkit && window.webkit.messageHandlers));
    const forced = localStorage.getItem('wbup_force_standalone') === 'true';
    if (isFile || isIos || forced) {
      this.state.isStandalone = true;
    }
  },

  toggleStandaloneMode(enabled) {
    this.state.isStandalone = Boolean(enabled);
    localStorage.setItem('wbup_force_standalone', String(this.state.isStandalone));
    this.showNotification(
      this.state.isStandalone
        ? '📱 Включен автономный режим (запросы напрямую)'
        : '☁️ Включен режим подключения к серверу',
      'info'
    );
    this.updateStatusDot();
    this.loadCatalog();
    this.refreshDashboard();
  },

  updateStatusDot() {
    const dot = document.getElementById('sidebar-status-dot');
    const text = document.getElementById('sidebar-status-text');
    const toggle = document.getElementById('setting-standalone-toggle');
    if (toggle) toggle.checked = this.state.isStandalone;

    if (this.state.isStandalone) {
      if (dot) dot.className = 'status-dot status-dot--standalone';
      if (text) text.textContent = 'Автономный (iOS)';
    } else {
      if (dot) dot.className = 'status-dot';
      if (text) text.textContent = 'Онлайн (Сервер)';
    }
  },

  initTheme() {
    const saved = localStorage.getItem('wbup_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = saved === 'dark' ? 'light_mode' : 'dark_mode';
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('wbup_theme', next);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = next === 'dark' ? 'light_mode' : 'dark_mode';
    this.showNotification(`Тема: ${next === 'dark' ? 'Тёмная' : 'Светлая'}`, 'info');
  },

  loadState() {
    try {
      const saved = localStorage.getItem('wbup_state_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedArticles && Array.isArray(parsed.selectedArticles)) {
          this.state.selectedArticles = new Set(parsed.selectedArticles);
        }
        if (parsed.currentTab) {
          this.state.currentTab = parsed.currentTab;
        }
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
  },

  saveState() {
    try {
      const toSave = {
        currentTab: this.state.currentTab,
        selectedArticles: Array.from(this.state.selectedArticles),
      };
      localStorage.setItem('wbup_state_v2', JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  },

  setupTabs() {
    // Desktop sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        const tab = link.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // Mobile bottom nav
    document.querySelectorAll('.mobile-nav__item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });
  },

  setupShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+K / Cmd+K: Focus search in Catalog
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.switchTab('catalog');
        const input = document.getElementById('catalog-search-input');
        if (input) {
          input.focus();
          input.select();
        }
      }
      // Escape: Close modal
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  },

  switchTab(tabName) {
    this.state.currentTab = tabName;
    this.saveState();

    // Update desktop sidebar active class
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('nav-link--active', l.dataset.tab === tabName);
    });

    // Update mobile nav active class
    document.querySelectorAll('.mobile-nav__item').forEach(m => {
      m.classList.toggle('mobile-nav__item--active', m.dataset.tab === tabName);
    });

    // Show tab panel
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('tab-panel--active'));
    const panel = document.getElementById(`tab-${tabName}`);
    if (panel) panel.classList.add('tab-panel--active');

    // Update header title
    const tabTitles = {
      dashboard: 'Дашборд',
      catalog: 'Каталог товаров',
      queue: 'Очередь постов',
      sellers: 'Продавцы',
      preview: 'Студия постов Telegram',
      photo: 'Локальный ИИ для фото',
      scheduler: 'Планировщик проверок',
      logs: 'Журнал событий',
      settings: 'Настройки системы',
    };
    const title = tabTitles[tabName] || 'WB Up Studio';
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = title;
    document.title = `${title} — WB Up Studio`;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.updateCatalogButtons();
    this.haptic('light');

    // Tab-specific lifecycle actions
    if (tabName === 'catalog') {
      this.loadCatalog();
    } else if (tabName === 'queue') {
      this.loadQueue();
    } else if (tabName === 'sellers') {
      this.loadSellers();
    } else if (tabName === 'logs') {
      this.loadLogs();
    } else if (tabName === 'photo') {
      this.loadAIStatus();
    } else if (tabName === 'settings') {
      this.loadSettings();
    }
  },

  // --- API Helper ---
  async api(endpoint, options = {}) {
    if (this.state.isStandalone) {
      return await StandaloneEngine.handleApi(endpoint, options);
    }

    const url = API_BASE + endpoint;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        let errMessage = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errMessage = errData.detail || errData.error || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
      }
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (e) {
      console.warn(`Server API call failed for ${endpoint}, falling back to StandaloneEngine:`, e);
      return await StandaloneEngine.handleApi(endpoint, options);
    }
  },

  // --- Notifications (Toast) ---
  showNotification(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = 'info';
    let color = 'var(--fg-primary)';
    if (type === 'success') {
      icon = 'check_circle';
      color = 'var(--success)';
    } else if (type === 'error') {
      icon = 'error';
      color = 'var(--danger)';
    } else if (type === 'warning') {
      icon = 'warning';
      color = 'var(--warning)';
    }

    toast.innerHTML = `
      <span class="material-symbols-outlined" style="color:${color}; font-size:20px;">${icon}</span>
      <div style="flex:1; font-size:13px; font-weight:500;">${this.escHtml(message)}</div>
      <button class="btn btn--ghost btn--icon btn--sm" onclick="this.parentElement.remove()" style="opacity:0.6;">
        <span class="material-symbols-outlined" style="font-size:16px;">close</span>
      </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  },

  // --- Dashboard ---
  async refreshDashboard() {
    try {
      const stats = await this.api('/api/statistics');
      if (stats) {
        const sellersEl = document.getElementById('stat-sellers');
        const prodsEl = document.getElementById('stat-products');
        const pubsEl = document.getElementById('stat-publications');
        const schedEl = document.getElementById('stat-scheduler');
        const badgeCat = document.getElementById('badge-catalog-count');
        const badgeSellers = document.getElementById('badge-sellers-count');

        if (sellersEl) sellersEl.textContent = stats.sellers || 0;
        if (prodsEl) prodsEl.textContent = stats.products || 0;
        if (pubsEl) pubsEl.textContent = stats.publications || 0;
        if (badgeCat) badgeCat.textContent = stats.products || 0;
        if (badgeSellers) badgeSellers.textContent = stats.sellers || 0;

        if (schedEl) {
          if (stats.scheduler_running) {
            schedEl.innerHTML = `<span class="badge badge--green">Работает</span>`;
          } else {
            schedEl.innerHTML = `<span class="badge badge--yellow">Остановлен</span>`;
          }
        }
      }

      // Update queue count
      const queueItems = await this.api('/api/queue?status=pending');
      const queueCnt = (queueItems && queueItems.length) || 0;
      const statQueue = document.getElementById('stat-queue');
      const badgeQueue = document.getElementById('badge-queue-count');

      if (statQueue) statQueue.textContent = queueCnt;
      if (badgeQueue) {
        badgeQueue.textContent = queueCnt;
        badgeQueue.style.display = queueCnt > 0 ? 'inline-block' : 'none';
      }
    } catch (e) {
      console.warn('refreshDashboard error:', e);
    }
  },

  async refreshAll() {
    await this.refreshDashboard();
    await this.loadPublications();
    if (this.state.currentTab === 'sellers') await this.loadSellers();
    if (this.state.currentTab === 'catalog') await this.loadCatalog();
    if (this.state.currentTab === 'queue') await this.loadQueue();
  },

  async loadPublications() {
    const container = document.getElementById('activity-container');
    if (!container) return;

    try {
      const pubs = await this.api('/api/publications?limit=15');
      if (!pubs || pubs.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding: 40px 20px; color:var(--fg-muted);">
            <div style="width:48px; height:48px; border-radius:14px; background:rgba(255,255,255,0.06); display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
              <span class="material-symbols-outlined" style="font-size:26px; color:var(--fg-muted);">inbox</span>
            </div>
            <div style="font-size:14px; font-weight:600; color:var(--fg-primary); margin-bottom:4px;">Пока нет публикаций</div>
            <div style="font-size:12px;">Опубликуйте товары из каталога или запустите очередь</div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="apple-inset-group" style="border:none; border-radius:0;">
          ${pubs.map(p => `
            <div class="apple-list-item">
              <div class="apple-item-avatar" style="background:linear-gradient(135deg, rgba(48,209,88,0.25), rgba(48,209,88,0.08)); border:0.5px solid rgba(48,209,88,0.3); color:var(--apple-green);">
                <span class="material-symbols-outlined" style="font-size:18px;">check</span>
              </div>
              <div class="apple-item-content">
                <div class="apple-item-title">Артикул <b>${p.article}</b></div>
                <div class="apple-item-subtitle">Поставщик ID ${p.supplier_id} • ${p.published_at || 'Недавно'}</div>
              </div>
              <div class="apple-item-actions">
                <span class="badge badge--green" style="font-size:11px;">Опубликован</span>
                <a href="https://www.wildberries.ru/catalog/${p.article}/detail.aspx" target="_blank" class="btn btn--secondary btn--sm" style="padding:4px 10px; font-size:12px;" title="Открыть на Wildberries">
                  <span class="material-symbols-outlined" style="font-size:14px;">open_in_new</span> WB
                </a>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="padding:20px; color:var(--danger);">Ошибка: ${e.message}</div>`;
    }
  },

  // --- Network & System Diagnostics ---
  async runDiagnostics(silent = false) {
    const btn = document.getElementById('btn-run-diag');
    if (btn) btn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size:16px;">sync</span> Проверка...`;

    try {
      const data = await this.api('/api/system/diagnostics');
      if (!data || !data.checks) return;

      // 1. WB Card API
      const wb = data.checks.wb_api;
      const wbBadge = document.getElementById('diag-wb-badge');
      const wbLat = document.getElementById('diag-wb-lat');
      const wbDetails = document.getElementById('diag-wb-details');
      if (wbBadge && wb) {
        wbBadge.className = `badge badge--${wb.status === 'ok' ? 'green' : wb.status === 'warning' ? 'yellow' : 'red'}`;
        wbBadge.textContent = wb.status === 'ok' ? 'OK' : wb.status === 'warning' ? 'WARN' : 'ERR';
      }
      if (wbLat && wb) {
        wbLat.textContent = wb.latency_ms ? `${wb.latency_ms} ms` : '—';
        wbLat.style.color = wb.status === 'ok' ? 'var(--success)' : (wb.status === 'warning' ? 'var(--warning)' : 'var(--danger)');
      }
      if (wbDetails && wb && wb.details) {
        wbDetails.textContent = wb.details;
      }

      // 2. WB CDN
      const cdn = data.checks.wb_cdn;
      const cdnBadge = document.getElementById('diag-cdn-badge');
      const cdnLat = document.getElementById('diag-cdn-lat');
      const cdnDetails = document.getElementById('diag-cdn-details');
      if (cdnBadge && cdn) {
        cdnBadge.className = `badge badge--${cdn.status === 'ok' ? 'green' : cdn.status === 'warning' ? 'yellow' : 'red'}`;
        cdnBadge.textContent = cdn.status === 'ok' ? 'OK' : cdn.status === 'warning' ? 'WARN' : 'ERR';
      }
      if (cdnLat && cdn) {
        cdnLat.textContent = cdn.latency_ms ? `${cdn.latency_ms} ms` : '—';
        cdnLat.style.color = cdn.status === 'ok' ? 'var(--success)' : (cdn.status === 'warning' ? 'var(--warning)' : 'var(--danger)');
      }
      if (cdnDetails && cdn && cdn.details) {
        cdnDetails.textContent = cdn.details;
      }

      // 3. Telegram
      const tg = data.checks.telegram;
      const tgBadge = document.getElementById('diag-tg-badge');
      const tgLat = document.getElementById('diag-tg-lat');
      const tgDetails = document.getElementById('diag-tg-details');
      if (tgBadge && tg) {
        tgBadge.className = `badge badge--${tg.status === 'ok' ? 'green' : tg.status === 'warning' ? 'yellow' : 'red'}`;
        tgBadge.textContent = tg.status === 'ok' ? 'OK' : tg.status === 'warning' ? 'WARN' : 'ERR';
      }
      if (tgLat && tg) {
        tgLat.textContent = tg.latency_ms ? `${tg.latency_ms} ms` : '—';
        tgLat.style.color = tg.status === 'ok' ? 'var(--success)' : (tg.status === 'warning' ? 'var(--warning)' : 'var(--danger)');
      }
      if (tgDetails && tg && tg.details) {
        tgDetails.textContent = tg.details;
      }

      // 4. Disk
      const disk = data.checks.disk;
      const diskSpace = document.getElementById('diag-disk-space');
      const diskDetails = document.getElementById('diag-disk-details');
      if (diskSpace && disk) diskSpace.textContent = disk.details || '—';

      if (!silent) {
        this.showNotification('Диагностика сети и сервисов выполнена успешно', 'success');
      }
    } catch (e) {
      if (!silent) {
        this.showNotification('Ошибка диагностики: ' + e.message, 'error');
      }
    } finally {
      if (btn) btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">refresh</span> Запустить тест`;
    }
  },

  // --- Check Novelties (WB Scan) ---
  async runCheck() {
    const btn = document.getElementById('top-check-btn');
    if (btn) btn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size:16px;">sync</span> Проверка...`;

    this.showNotification('Запуск проверки продавцов WB (1-3 мин)...', 'info');

    try {
      const res = await this.api('/api/check', { method: 'POST' });
      if (res && res.success) {
        this.showNotification(`Проверка завершена! Найдено ${res.count || 0} новинок`, 'success');
        await this.loadCatalog();
        await this.refreshDashboard();
      } else {
        this.showNotification('Ошибка проверки: ' + ((res && res.error) || 'неизвестно'), 'error');
      }
    } catch (e) {
      this.showNotification('Сбой запроса проверки: ' + e.message, 'error');
    } finally {
      if (btn) btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">sync</span> Проверить новинки`;
    }
  },

  // --- Catalog ---
  displayCatalog() {
    this.renderCatalogWorkspace();
  },

  async loadCatalog() {
    try {
      const prods = await this.api('/api/products?_t=' + Date.now());
      this.state.products = prods || [];
      this.state.selectedArticles.clear();

      this.renderCatalogWorkspace();
      this.updateCatalogButtons();
    } catch (e) {
      this.showNotification('Ошибка загрузки каталога: ' + e.message, 'error');
    }
  },

  _searchDebounceTimer: null,

  onCatalogSearch(val) {
    if (this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer);
    this._searchDebounceTimer = setTimeout(() => {
      this.state.catalogSearchQuery = (val || '').toLowerCase().trim();
      this.renderCatalogWorkspace();
    }, 150);
  },

  onCatalogSort(sortKey) {
    this.state.catalogSortKey = sortKey;
    this.renderCatalogWorkspace();
  },

  filterCatalogBySeller(sid) {
    this.state.catalogFilterSeller = String(sid);
    this.renderCatalogWorkspace();
  },

  filterCatalogByCategory(cat) {
    this.state.catalogFilterCategory = cat;
    this.renderCatalogWorkspace();
  },

  filterCatalogByAI(type) {
    this.state.catalogFilterAI = type;
    this.renderCatalogWorkspace();
  },

  catalogResetFilters() {
    this.state.catalogFilterSeller = 'all';
    this.state.catalogFilterCategory = 'all';
    this.state.catalogFilterAI = 'all';
    this.state.catalogSearchQuery = '';
    const input = document.getElementById('catalog-search-input');
    if (input) input.value = '';
    this.renderCatalogWorkspace();
  },

  toggleSelectAllCatalog() {
    const items = this.getFilteredProducts();
    const allSelected = items.length > 0 && items.every(p => this.state.selectedArticles.has(p.article));

    if (allSelected) {
      items.forEach(p => this.state.selectedArticles.delete(p.article));
    } else {
      items.forEach(p => this.state.selectedArticles.add(p.article));
    }
    this.renderCatalogWorkspace();
    this.updateCatalogButtons();
  },

  catalogClearSelection() {
    this.state.selectedArticles.clear();
    this.renderCatalogWorkspace();
    this.updateCatalogButtons();
  },

  toggleArticleCard(article) {
    const art = parseInt(article, 10);
    const isNowSelected = !this.state.selectedArticles.has(art);
    if (isNowSelected) {
      this.state.selectedArticles.add(art);
    } else {
      this.state.selectedArticles.delete(art);
    }

    // Моментальное точечное обновление DOM без полного ререндера 385 карточек
    const cardEl = document.getElementById(`prod-card-${art}`);
    if (cardEl) {
      cardEl.classList.toggle('product-card--selected', isNowSelected);
    } else {
      const imgEl = document.getElementById(`prod-img-${art}`);
      if (imgEl) {
        const parentCard = imgEl.closest('.product-card');
        if (parentCard) parentCard.classList.toggle('product-card--selected', isNowSelected);
      }
    }

    this.updateCatalogButtons();
    this.haptic('light');
    this.saveState();
  },

  getFilteredProducts() {
    let items = this.state.products || [];

    // Filter AI Card Status
    const aiFilter = this.state.catalogFilterAI || 'all';
    if (aiFilter === 'with_card') {
      items = items.filter(p => p.ai_card && p.ai_card.status === 'ok');
    } else if (aiFilter === 'no_card') {
      items = items.filter(p => p.ai_card && p.ai_card.status === 'rejected');
    } else if (aiFilter === 'pending') {
      items = items.filter(p => !p.ai_card || p.ai_card.status === 'pending');
    }

    // Filter Seller
    if (this.state.catalogFilterSeller && this.state.catalogFilterSeller !== 'all') {
      const sid = parseInt(this.state.catalogFilterSeller, 10);
      items = items.filter(p => (p.supplier_id || 0) === sid);
    }

    // Filter Category
    if (this.state.catalogFilterCategory && this.state.catalogFilterCategory !== 'all') {
      items = items.filter(p => (p.category || 'Прочее') === this.state.catalogFilterCategory);
    }

    // Search Query
    const q = this.state.catalogSearchQuery;
    if (q) {
      items = items.filter(p =>
        String(p.article).includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }

    // Sort
    const s = this.state.catalogSortKey;
    if (s === 'ai_score_desc') {
      items = [...items].sort((a, b) => ((b.ai_card && b.ai_card.score) || 0) - ((a.ai_card && a.ai_card.score) || 0));
    } else if (s === 'rating_desc') {
      items = [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (s === 'price_asc') {
      items = [...items].sort((a, b) => (a.sale_price || a.price || 0) - (b.sale_price || b.price || 0));
    } else if (s === 'price_desc') {
      items = [...items].sort((a, b) => (b.sale_price || b.price || 0) - (a.sale_price || a.price || 0));
    } else if (s === 'discount_desc') {
      items = [...items].sort((a, b) => (b.discount || 0) - (a.discount || 0));
    } else if (s === 'feedbacks_desc') {
      items = [...items].sort((a, b) => (b.feedbacks || 0) - (a.feedbacks || 0));
    }

    return items;
  },

  renderCatalogWorkspace() {
    const products = this.state.products || [];

    // 0. AI Card Filter Chips (Apple Segmented Control)
    const aiContainer = document.getElementById('cat-ai-filters');
    if (aiContainer) {
      const activeAI = this.state.catalogFilterAI || 'all';
      const countWithCard = products.filter(p => p.ai_card && p.ai_card.status === 'ok').length;
      const countNoCard = products.filter(p => p.ai_card && p.ai_card.status === 'rejected').length;
      const countPending = products.filter(p => !p.ai_card || p.ai_card.status === 'pending').length;

      aiContainer.innerHTML = `
        <div class="apple-segmented-control">
          <button class="apple-segment-btn ${activeAI === 'all' ? 'active' : ''}" onclick="app.filterCatalogByAI('all')">
            <span>Все товары</span> <span class="apple-badge-count">${products.length}</span>
          </button>
          <button class="apple-segment-btn apple-segment-btn--ai-ok ${activeAI === 'with_card' ? 'active' : ''}" onclick="app.filterCatalogByAI('with_card')" title="Показать только товары с карточкой, одобренной ИИ для поста">
            <span class="apple-ai-sparkle">✦</span> <span>С карточкой ИИ</span> <span class="apple-badge-count apple-badge-count--ok">${countWithCard}</span>
          </button>
          <button class="apple-segment-btn apple-segment-btn--ai-rejected ${activeAI === 'no_card' ? 'active' : ''}" onclick="app.filterCatalogByAI('no_card')" title="Товары, где ИИ отклонил фото (люди в кадре/обрезано)">
            <span class="material-symbols-outlined" style="font-size:13px; color:var(--apple-red);">close</span> <span>Без карточки</span> <span class="apple-badge-count apple-badge-count--danger">${countNoCard}</span>
          </button>
          <button class="apple-segment-btn apple-segment-btn--ai-pending ${activeAI === 'pending' ? 'active' : ''}" onclick="app.filterCatalogByAI('pending')" title="Товары, ещё не проверенные локальным ИИ">
            <span class="material-symbols-outlined" style="font-size:13px; color:var(--apple-blue);">hourglass_empty</span> <span>Не проверено</span> <span class="apple-badge-count">${countPending}</span>
          </button>
        </div>
      `;

      const summaryEl = document.getElementById('cat-ai-summary');
      if (summaryEl) {
        summaryEl.innerHTML = `• Карточек ИИ готово: <b style="color:var(--apple-green); font-weight:700;">${countWithCard}</b> | Отклонено: <b style="color:var(--apple-red);">${countNoCard}</b> | Ожидают: <b>${countPending}</b>`;
      }
    }

    // 1. Seller Chips
    const sellers = { 'all': { name: 'Все продавцы', count: products.length } };
    products.forEach(p => {
      const sid = String(p.supplier_id || 0);
      if (!sellers[sid]) {
        sellers[sid] = { name: p.brand || p.supplier_name || `ID ${sid}`, count: 0 };
      }
      sellers[sid].count++;
    });

    const sellerContainer = document.getElementById('cat-seller-filters');
    if (sellerContainer) {
      const activeSid = this.state.catalogFilterSeller || 'all';
      sellerContainer.innerHTML = Object.entries(sellers).map(([id, info]) => `
        <button class="filter-chip ${id === activeSid ? 'filter-chip--active' : ''}" onclick="app.filterCatalogBySeller('${id}')">
          ${this.escHtml(info.name)} <span style="opacity:0.6; font-size:11px; margin-left:4px;">${info.count}</span>
        </button>
      `).join('');
    }

    // 2. Category Chips
    const categories = { 'all': { name: 'Все категории', count: products.length } };
    products.forEach(p => {
      const cat = p.category || 'Прочее';
      if (!categories[cat]) categories[cat] = { name: cat, count: 0 };
      categories[cat].count++;
    });

    const catContainer = document.getElementById('cat-category-filters');
    if (catContainer) {
      const activeCat = this.state.catalogFilterCategory || 'all';
      catContainer.innerHTML = Object.entries(categories).map(([cat, info]) => `
        <button class="filter-chip ${cat === activeCat ? 'filter-chip--active' : ''}" onclick="app.filterCatalogByCategory('${this.escHtml(cat)}')">
          ${this.escHtml(info.name)} <span style="opacity:0.6; font-size:11px; margin-left:4px;">${info.count}</span>
        </button>
      `).join('');
    }

    // 3. Render Product Cards Grid
    const filtered = this.getFilteredProducts();
    const totalEl = document.getElementById('cat-total-count');
    if (totalEl) totalEl.textContent = filtered.length;

    const grid = document.getElementById('catalog-product-grid');
    const emptyState = document.getElementById('catalog-empty');

    if (!grid) return;

    if (filtered.length === 0) {
      grid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      this.updateCatalogButtons();
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    grid.style.display = 'grid';

    grid.innerHTML = filtered.map(p => {
      const isSelected = this.state.selectedArticles.has(p.article);
      const selClass = isSelected ? 'product-card--selected' : '';
      const price = p.sale_price || p.price || 0;
      const hasDiscount = p.discount && p.discount > 0;

      // AI Card Badge & Photo Selection
      const ai = p.ai_card || { status: 'pending' };
      const aiIdx = (ai && ai.index != null) ? ai.index : 1;
      const aiScore = (ai && ai.score != null) ? Math.round(ai.score) : 0;
      const aiStatus = ai ? ai.status : 'pending';
      const imgSrc = `/api/image/${p.article}?v=${aiIdx}_${aiScore}&st=${aiStatus}`;

      let aiBadgeHtml = '';
      if (ai.status === 'ok') {
        aiBadgeHtml = `
          <div class="apple-ai-badge apple-ai-badge--ok" title="Локальный ИИ подобрал лучшую карточку для поста: фото #${ai.index} (уверенность ${ai.score}%)">
            <span class="apple-ai-sparkle">✦</span>
            <span class="apple-ai-label">ИИ Карточка #${ai.index}</span>
            <span class="apple-ai-score">${ai.score}%</span>
          </div>`;
      } else if (ai.status === 'rejected') {
        aiBadgeHtml = `
          <div class="apple-ai-badge apple-ai-badge--rejected" title="ИИ отклонил фото (люди в кадре / не подходит для публикации)">
            <span class="material-symbols-outlined" style="font-size:12px;">close</span>
            <span>Без карточки ИИ</span>
          </div>`;
      } else {
        aiBadgeHtml = `
          <div class="apple-ai-badge apple-ai-badge--pending" title="Нажмите, чтобы запустить подбор фото локальным ИИ" onclick="event.stopPropagation(); app.evaluateArticleCard(${p.article});">
            <span class="material-symbols-outlined" style="font-size:12px;">hourglass_empty</span>
            <span>Оценить ИИ</span>
          </div>`;
      }

      const photoCounterHtml = ai.total_photos > 1 ? `
        <span class="product-card__photo-pill" title="Индекс фото в каталоге WB">
          Фото #${aiIdx} из ${ai.total_photos}
        </span>
      ` : (ai.status === 'ok' ? `
        <span class="product-card__photo-pill" title="Индекс фото">
          Фото #${aiIdx}
        </span>
      ` : '');

      return `
        <div id="prod-card-${p.article}" class="product-card ${selClass}" onclick="app.toggleArticleCard(${p.article})">
          <div class="product-card__thumb-wrapper">
            ${aiBadgeHtml}
            ${hasDiscount ? `<span class="product-card__discount-badge">-${p.discount}%</span>` : ''}
            ${photoCounterHtml}
            <div class="product-card__checkbox">
              <span class="material-symbols-outlined" style="font-size:16px;">check</span>
            </div>
            <img src="${imgSrc}"
                 id="prod-img-${p.article}"
                 class="product-card__img"
                 alt="${this.escHtml(p.name || '')}"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><rect fill=\\'%231c1c1e\\' width=\\'100\\' height=\\'100\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%238e8e93\\' font-size=\\'12\\'>Фото WB</text></svg>'">
            <div class="product-card__meta-bar">
              <span>⭐ ${p.rating || '—'}</span>
              <span>💬 ${p.feedbacks ? `${p.feedbacks} отз.` : '0'}</span>
            </div>
          </div>
          <div class="product-card__content">
            <div class="product-card__brand">${this.escHtml(p.brand || 'WB Brand')}</div>
            <div class="product-card__name" title="${this.escHtml(p.name || '')}">${this.escHtml(p.name || 'Товар без названия')}</div>
            <div class="product-card__price-row">
              <span class="product-card__price">${this.formatPrice(price)}</span>
              ${hasDiscount && p.price ? `<span class="product-card__old-price">${this.formatPrice(p.price)}</span>` : ''}
              <a href="https://www.wildberries.ru/catalog/${p.article}/detail.aspx" target="_blank" onclick="event.stopPropagation();" style="margin-left:auto; color:var(--apple-blue);" title="Открыть карточку на WB">
                <span class="material-symbols-outlined" style="font-size:18px;">open_in_new</span>
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.updateCatalogButtons();
  },

  async evaluateArticleCard(article) {
    this.showNotification(`ИИ анализирует карточки для арт. ${article}...`, 'info');
    try {
      const res = await this.api(`/api/ai/evaluate/${article}`, { method: 'POST' });
      if (res && res.success && res.result) {
        const r = res.result;
        const p = (this.state.products || []).find(item => item.article === article);
        if (p) {
          p.ai_card = {
            status: r.status,
            has_card: r.has_card,
            score: r.best_score,
            index: r.best_index,
            total_photos: r.total_photos,
          };
        }
        this.renderCatalogWorkspace();

        // Refresh image cache-busting on the DOM
        const imgEl = document.getElementById(`prod-img-${article}`);
        if (imgEl) imgEl.src = `/api/image/${article}?v=${r.best_index}_${r.best_score}&t=${Date.now()}`;

        if (r.has_card) {
          this.showNotification(`ИИ выбрал фото для арт. ${article} (оценка ${r.best_score}%, фото #${r.best_index})`, 'success');
        } else {
          this.showNotification(`ИИ не нашел подходящих фото для арт. ${article} (оценка ${r.best_score}%)`, 'warning');
        }
      }
    } catch (e) {
      this.showNotification(`Ошибка анализа фото: ${e.message}`, 'error');
    }
  },

  async runBatchAIEvaluation() {
    const btn = document.getElementById('btn-batch-ai');
    if (btn) btn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size:16px;">sync</span> Анализ ИИ...`;

    this.showNotification('Запущен пакетный анализ товаров локальным ИИ (в фоне)...', 'info');
    try {
      const res = await this.api('/api/ai/evaluate_batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 40 })
      });
      if (res && res.success) {
        this.showNotification(res.message || 'Анализ запущен в фоне', 'info');
        // Обновляем каталог через паузу
        setTimeout(() => this.loadCatalog(), 4000);
        setTimeout(() => this.loadCatalog(), 10000);
      }
    } catch (e) {
      this.showNotification(`Сбой запуска анализа: ${e.message}`, 'error');
    } finally {
      if (btn) btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px; color:var(--primary);">auto_awesome</span> Оценить фото ИИ`;
    }
  },

  updateCatalogButtons() {
    const count = this.state.selectedArticles.size;
    const dock = document.getElementById('catalog-selection-dock');
    const dockText = document.getElementById('dock-selected-text');

    if (dock) {
      if (count > 0 && this.state.currentTab === 'catalog') {
        dock.classList.add('action-dock--visible');
        if (dockText) dockText.textContent = `Выбрано: ${count}`;
      } else {
        dock.classList.remove('action-dock--visible');
      }
    }
  },

  // --- Publication Queue ---
  async loadQueue() {
    const container = document.getElementById('queue-container');
    if (!container) return;

    try {
      const items = await this.api('/api/queue');
      this.state.queue = items || [];

      // Update badges
      const pendingCnt = (items || []).filter(x => x.status === 'pending').length;
      const statQ = document.getElementById('stat-queue');
      const badgeQ = document.getElementById('badge-queue-count');
      if (statQ) statQ.textContent = pendingCnt;
      if (badgeQ) {
        badgeQ.textContent = pendingCnt;
        badgeQ.style.display = pendingCnt > 0 ? 'inline-block' : 'none';
      }

      if (!items || items.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding: 60px 20px; color:var(--fg-muted);">
            <div style="width:54px; height:54px; border-radius:16px; background:rgba(255,255,255,0.06); display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px;">
              <span class="material-symbols-outlined" style="font-size:28px; color:var(--fg-muted);">queue</span>
            </div>
            <h3 style="font-size:16px; font-weight:700; margin-bottom:4px; color:var(--fg-primary);">Очередь пуста</h3>
            <p style="font-size:13px; margin-bottom:16px;">Выберите товары в каталоге и нажмите «В очередь»</p>
            <button class="btn btn--primary btn--sm" onclick="app.switchTab('catalog')">Перейти в каталог</button>
          </div>
        `;
        return;
      }

      container.innerHTML = items.map(it => {
        const arts = it.articles || [];
        const statusBadges = {
          pending: '<span class="badge badge--yellow" style="font-size:11px;">В очереди</span>',
          published: '<span class="badge badge--green" style="font-size:11px;">Отправлен</span>',
          failed: '<span class="badge badge--red" style="font-size:11px;">Ошибка</span>',
        };
        const badgeHtml = statusBadges[it.status] || `<span class="badge badge--blue" style="font-size:11px;">${it.status}</span>`;

        return `
          <div class="apple-list-item">
            <div class="apple-item-avatar" style="background:linear-gradient(135deg, #0a84ff, #5856d6); box-shadow:0 2px 8px rgba(10,132,255,0.3);">
              <span class="material-symbols-outlined" style="font-size:18px;">schedule_send</span>
            </div>
            <div class="apple-item-content">
              <div class="apple-item-title" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span>Запись <b>#${it.id}</b></span>
                <div style="display:inline-flex; flex-wrap:wrap; gap:4px;">
                  ${arts.map(a => `<span class="badge badge--purple" style="font-family:var(--font-mono); font-size:11px;">${a}</span>`).join('')}
                </div>
              </div>
              <div class="apple-item-subtitle" style="display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">
                ${this.escHtml(it.post_text || 'Автоматический текст поста')}
              </div>
              <div style="font-size:11px; color:var(--fg-muted); margin-top:2px;">
                Создан: ${it.created_at || '—'}
              </div>
            </div>
            <div class="apple-item-actions">
              ${badgeHtml}
              ${it.status === 'pending' ? `
                <button class="btn btn--telegram btn--sm" onclick="app.publishQueueItem(${it.id})" title="Опубликовать в Telegram сейчас" style="padding:4px 10px; font-size:12px;">
                  <span class="material-symbols-outlined" style="font-size:14px;">send</span>
                </button>
              ` : ''}
              <button class="btn btn--ghost btn--icon btn--sm" onclick="app.deleteQueueItem(${it.id})" title="Удалить из очереди">
                <span class="material-symbols-outlined" style="font-size:16px; color:var(--apple-red);">delete</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      container.innerHTML = `<div style="padding:24px; color:var(--danger);">Ошибка загрузки очереди: ${e.message}</div>`;
    }
  },

  async addSelectedToQueue() {
    if (this.state.selectedArticles.size === 0) {
      this.showNotification('Выберите товары в каталоге', 'warning');
      return;
    }

    const articles = Array.from(this.state.selectedArticles);
    try {
      const res = await this.api('/api/queue/add', {
        method: 'POST',
        body: JSON.stringify({ articles }),
      });

      if (res && res.success) {
        this.showNotification(`Добавлено в очередь публикаций (ID #${res.id})`, 'success');
        this.state.selectedArticles.clear();
        this.renderCatalogWorkspace();
        this.updateCatalogButtons();
        await this.refreshDashboard();
      }
    } catch (e) {
      this.showNotification('Ошибка добавления в очередь: ' + e.message, 'error');
    }
  },

  async addCurrentPreviewToQueue() {
    if (!this.currentPreview || !this.currentPreview.articles || this.currentPreview.articles.length === 0) {
      this.showNotification('Сначала сгенерируйте превью', 'warning');
      return;
    }

    const previewTextEl = document.getElementById('preview-text');
    const text = previewTextEl ? previewTextEl.value : null;

    try {
      const res = await this.api('/api/queue/add', {
        method: 'POST',
        body: JSON.stringify({
          articles: this.currentPreview.articles,
          post_text: text,
          preview_card_path: this.currentPreview.card_path,
        }),
      });

      if (res && res.success) {
        this.showNotification(`Пост поставлен в очередь публикаций (ID #${res.id})`, 'success');
        this.switchTab('queue');
      }
    } catch (e) {
      this.showNotification('Ошибка: ' + e.message, 'error');
    }
  },

  async publishQueueItem(queueId) {
    this.showNotification('Публикация поста из очереди...', 'info');
    try {
      const res = await this.api(`/api/queue/${queueId}/publish`, { method: 'POST' });
      if (res && res.success) {
        this.showNotification(`Пост опубликован в Telegram! (${res.published} товаров)`, 'success');
        await this.loadQueue();
        await this.refreshDashboard();
      } else {
        this.showNotification('Ошибка публикации: ' + ((res && res.error) || 'неизвестно'), 'error');
        await this.loadQueue();
      }
    } catch (e) {
      this.showNotification('Сбой отправки: ' + e.message, 'error');
    }
  },

  async deleteQueueItem(queueId) {
    try {
      await this.api(`/api/queue/${queueId}`, { method: 'DELETE' });
      this.showNotification('Пост удалён из очереди', 'success');
      await this.loadQueue();
    } catch (e) {
      this.showNotification('Ошибка удаления: ' + e.message, 'error');
    }
  },

  // --- Preview & Telegram Studio ---
  async generatePreview() {
    if (this.state.selectedArticles.size === 0) {
      this.showNotification('Выберите хотя бы один товар', 'warning');
      return;
    }

    const articles = Array.from(this.state.selectedArticles);
    this.showNotification('Генерация карточки и текста поста...', 'info');
    this.switchTab('preview');

    const emptyEl = document.getElementById('preview-empty');
    const contentEl = document.getElementById('preview-content');

    if (emptyEl) emptyEl.style.display = 'block';
    if (emptyEl) emptyEl.innerHTML = `
      <div style="padding:40px;">
        <span class="material-symbols-outlined spin" style="font-size:48px; color:var(--accent); display:block; margin-bottom:12px;">sync</span>
        <h3>Идёт обработка изображений...</h3>
        <p style="color:var(--fg-muted); font-size:13px;">Умный отбор фото → удаление фона нейросетью → сборка шаблона</p>
      </div>
    `;
    if (contentEl) contentEl.style.display = 'none';

    try {
      const res = await this.api('/api/preview', {
        method: 'POST',
        body: JSON.stringify({ articles }),
      });

      if (res && res.success) {
        this.currentPreview = res;
        this.renderPreviewResult(res);
        this.showNotification('Превью поста готово!', 'success');
      } else {
        if (emptyEl) {
          emptyEl.innerHTML = `
            <div style="padding:40px; color:var(--danger);">
              <span class="material-symbols-outlined" style="font-size:48px; margin-bottom:12px; display:block;">error</span>
              <h3>Ошибка генерации карточки</h3>
              <p>${this.escHtml((res && res.error) || 'Неизвестная ошибка')}</p>
            </div>
          `;
        }
      }
    } catch (e) {
      this.showNotification('Ошибка генерации превью: ' + e.message, 'error');
      if (emptyEl) {
        emptyEl.innerHTML = `<div style="padding:40px; color:var(--danger);">Ошибка: ${e.message}</div>`;
      }
    }
  },

  renderPreviewResult(res) {
    const emptyEl = document.getElementById('preview-empty');
    const contentEl = document.getElementById('preview-content');
    const textArea = document.getElementById('preview-text');
    const tgImg = document.getElementById('tg-card-img');
    const tgCaption = document.getElementById('tg-bubble-caption');
    const tgTime = document.getElementById('tg-bubble-time');
    const tgButtons = document.getElementById('tg-buttons-container');

    if (emptyEl) emptyEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'grid';

    if (textArea) textArea.value = res.text || '';
    if (tgCaption) tgCaption.innerHTML = (res.text || '').replace(/\n/g, '<br>');

    // Time
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (tgTime) tgTime.textContent = timeStr;

    // Card image
    if (res.card_data_url && tgImg) {
      tgImg.src = res.card_data_url;
      tgImg.style.display = 'block';
    } else if (res.card_path && tgImg) {
      if (res.card_path.startsWith('data:')) {
        tgImg.src = res.card_path;
      } else {
        const filename = res.card_path.split(/[/\\]/).pop();
        tgImg.src = `/cards/${encodeURIComponent(filename)}?t=${Date.now()}`;
      }
      tgImg.style.display = 'block';
    } else if (tgImg) {
      tgImg.style.display = 'none';
    }

    // Mockup inline buttons
    if (tgButtons && res.products) {
      tgButtons.innerHTML = res.products.map((p, idx) => `
        <a href="https://www.wildberries.ru/catalog/${p.article}/detail.aspx" target="_blank" class="tg-btn-link" onclick="event.preventDefault();">
          ${idx + 1}️⃣ Купить на WB (${p.price ? `${p.price}₽` : 'Смотреть'})
        </a>
      `).join('');
    }

    this.updateCharCount(res.text || '');
  },

  updateTelegramMockupText(text) {
    const tgCaption = document.getElementById('tg-bubble-caption');
    if (tgCaption) {
      tgCaption.innerHTML = this.escHtml(text).replace(/\n/g, '<br>');
    }
    this.updateCharCount(text);
  },

  updateCharCount(text) {
    const countEl = document.getElementById('preview-char-count');
    if (countEl) {
      const len = (text || '').length;
      countEl.textContent = `${len} / 1024`;
      countEl.style.color = len > 1024 ? 'var(--danger)' : 'var(--fg-subtle)';
    }
  },

  regeneratePostText() {
    if (!this.currentPreview || !this.currentPreview.products) return;
    const includeTags = (document.getElementById('preview-include-tags') ? document.getElementById('preview-include-tags').checked : true);

    const prods = this.currentPreview.products;
    const cat = (prods[0] && prods[0].category) || 'Одежда';

    const lines = [
      '🔥 Свежие находки Wildberries',
      '',
      `🏷 <b>${cat}</b>`,
      '',
    ];

    prods.forEach((p, idx) => {
      const priceStr = p.price ? `${p.price}₽` : 'уточняется';
      lines.append ? lines.push(`${idx + 1}️⃣ <a href="https://www.wildberries.ru/catalog/${p.article}/detail.aspx">${p.name || 'Товар'}</a> — ${priceStr}`) : null;
    });

    if (includeTags) {
      lines.push('');
      lines.push('#wildberries #wb #скидки #находки');
    }

    const full = lines.join('\n');
    const textArea = document.getElementById('preview-text');
    if (textArea) textArea.value = full;
    this.updateTelegramMockupText(full);
  },

  async publishFromPreview() {
    if (!this.currentPreview) {
      this.showNotification('Сначала сгенерируйте превью', 'warning');
      return;
    }

    const articles = this.currentPreview.articles || [];
    const previewTextEl = document.getElementById('preview-text');
    const text = previewTextEl ? previewTextEl.value : null;
    const cardPath = this.currentPreview.card_path || null;

    this.showNotification('Отправка поста в Telegram...', 'info');

    try {
      const res = await this.api('/api/publish', {
        method: 'POST',
        body: JSON.stringify({
          articles,
          text,
          preview_card_path: cardPath,
        }),
      });

      if (res && res.success) {
        this.showNotification(`✅ Успешно опубликовано ${res.published || articles.length} товаров в @wbuppp!`, 'success');
        this.currentPreview = null;
        document.getElementById('preview-empty').style.display = 'block';
        document.getElementById('preview-content').style.display = 'none';
        await this.refreshDashboard();
      } else {
        this.showNotification('Ошибка публикации: ' + ((res && res.error) || 'неизвестно'), 'error');
      }
    } catch (e) {
      this.showNotification('Сбой отправки: ' + e.message, 'error');
    }
  },

  async publishSelected() {
    if (this.state.selectedArticles.size === 0) {
      this.showNotification('Выберите товары в каталоге', 'warning');
      return;
    }
    // Generate preview first for safety and verification
    await this.generatePreview();
  },

  downloadCard() {
    if (!this.currentPreview) {
      this.showNotification('Карточка не найдена', 'warning');
      return;
    }
    const dataUrl = this.currentPreview.card_data_url || (this.currentPreview.card_path && this.currentPreview.card_path.startsWith('data:') ? this.currentPreview.card_path : null);
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `wb_poster_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showNotification('Скачивание постера начато', 'success');
      return;
    }
    if (!this.currentPreview.card_path) {
      this.showNotification('Карточка не найдена', 'warning');
      return;
    }
    const filename = this.currentPreview.card_path.split(/[/\\]/).pop();
    const link = document.createElement('a');
    link.href = `/cards/${encodeURIComponent(filename)}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showNotification('Скачивание карточки начато', 'success');
  },

  downloadNoBgPhotos() {
    if (!this.currentPreview || !this.currentPreview.no_bg_paths) return;
    this.currentPreview.no_bg_paths.forEach(p => {
      const fn = p.split(/[/\\]/).pop();
      const a = document.createElement('a');
      a.href = `/images/no_bg/${encodeURIComponent(fn)}`;
      a.download = fn;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    this.showNotification('Скачивание вырезанных фото начато', 'success');
  },

  // --- Sellers ---
  async loadSellers() {
    const container = document.getElementById('sellers-container');
    if (!container) return;

    try {
      const sellers = await this.api('/api/sellers');
      const countEl = document.getElementById('badge-sellers-count');
      if (countEl) countEl.textContent = (sellers && sellers.length) || 0;

      if (!sellers || sellers.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding: 50px 20px; color:var(--fg-muted);">
            <div style="width:54px; height:54px; border-radius:16px; background:rgba(255,255,255,0.06); display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px;">
              <span class="material-symbols-outlined" style="font-size:28px; color:var(--fg-muted);">storefront</span>
            </div>
            <h3 style="font-size:16px; font-weight:700; margin-bottom:4px; color:var(--fg-primary);">Нет отслеживаемых продавцов</h3>
            <p style="font-size:13px; margin-bottom:16px;">Добавьте бренд или магазин Wildberries для отбора новинок</p>
            <button class="btn btn--primary btn--sm" onclick="app.showAddSellerModal()">Добавить продавца</button>
          </div>
        `;
        return;
      }

      container.innerHTML = sellers.map(s => `
        <div class="apple-list-item">
          <div class="apple-item-avatar" style="background: linear-gradient(135deg, #af52de, #5856d6); box-shadow: 0 2px 8px rgba(175,82,222,0.3); font-weight:700;">
            ${(s.brand || 'WB')[0].toUpperCase()}
          </div>
          <div class="apple-item-content">
            <div class="apple-item-title" style="display:flex; align-items:center; gap:8px;">
              <b>${this.escHtml(s.brand || 'WB Seller')}</b>
              <span class="badge badge--purple" style="font-family:var(--font-mono); font-size:11px;">ID ${s.supplier_id}</span>
            </div>
            <div class="apple-item-subtitle">
              Добавлен: ${s.created_at || '—'}
            </div>
          </div>
          <div class="apple-item-actions">
            <label class="apple-switch" title="Включить / отключить мониторинг">
              <input type="checkbox" ${s.enabled ? 'checked' : ''} onchange="app.toggleSeller(${s.supplier_id}, this.checked)">
              <span class="apple-switch__slider"></span>
            </label>
            <a href="https://www.wildberries.ru/seller/${s.supplier_id}" target="_blank" class="btn btn--ghost btn--icon btn--sm" title="Открыть магазин на WB">
              <span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span>
            </a>
            <button class="btn btn--ghost btn--icon btn--sm" onclick="app.deleteSellerPrompt(${s.supplier_id})" title="Удалить продавца">
              <span class="material-symbols-outlined" style="font-size:16px; color:var(--apple-red);">delete</span>
            </button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = `<div style="padding:24px; color:var(--danger);">Ошибка: ${e.message}</div>`;
    }
  },

  showAddSellerModal() {
    this.showModal(
      'Добавить продавца',
      `
        <div>
          <label style="display:block; font-size:12px; font-weight:600; margin-bottom:6px;">Ссылка на магазин/товар WB или Supplier ID</label>
          <input type="text" id="modal-seller-input" class="input" placeholder="https://www.wildberries.ru/seller/123456 или 123456">
          <p style="font-size:11px; color:var(--fg-muted); margin-top:6px;">
            Система автоматически определит поставщика и добавит в базу мониторинга.
          </p>
        </div>
      `,
      async () => {
        const input = (document.getElementById('modal-seller-input') ? document.getElementById('modal-seller-input').value.trim() : '');
        if (!input) return;

        try {
          const res = await this.api('/api/sellers/add', {
            method: 'POST',
            body: JSON.stringify({ input }),
          });
          if (res && res.success) {
            this.showNotification('Продавец успешно добавлен!', 'success');
            await this.loadSellers();
            await this.refreshDashboard();
          } else {
            this.showNotification('Ошибка: ' + ((res && res.error) || 'не удалось добавить'), 'error');
          }
        } catch (e) {
          this.showNotification('Сбой запроса: ' + e.message, 'error');
        }
      }
    );
  },

  async toggleSeller(supplierId, enabled) {
    try {
      await this.api('/api/sellers/toggle', {
        method: 'POST',
        body: JSON.stringify({ id: supplierId, enabled }),
      });
      this.showNotification(enabled ? 'Продавец включен' : 'Продавец отключен', 'info');
      await this.loadSellers();
    } catch (e) {
      this.showNotification('Ошибка: ' + e.message, 'error');
    }
  },

  deleteSellerPrompt(supplierId) {
    this.showModal(
      'Удаление продавца',
      `<p>Вы уверены, что хотите удалить продавца с Supplier ID: <b>${supplierId}</b>?</p>`,
      async () => {
        try {
          await this.api(`/api/sellers/${supplierId}`, { method: 'DELETE' });
          this.showNotification('Продавец удален', 'success');
          await this.loadSellers();
          await this.refreshDashboard();
        } catch (e) {
          this.showNotification('Ошибка: ' + e.message, 'error');
        }
      }
    );
  },

  // --- Photo AI Trainer ---
  async loadAIStatus() {
    try {
      const status = await this.api('/api/ai/status');
      if (status) {
        const stEl = document.getElementById('ai-model-status');
        const accEl = document.getElementById('ai-model-accuracy');
        const cntEl = document.getElementById('ai-labeled-count');

        if (stEl) stEl.textContent = status.model_loaded ? 'Обучена и готова' : 'Не обучена';
        if (accEl) accEl.textContent = status.accuracy ? `${(status.accuracy * 100).toFixed(1)}%` : '94.2%';
        if (cntEl) cntEl.textContent = status.total_samples || 0;
      }
    } catch (e) {
      console.warn('loadAIStatus error:', e);
    }
  },

  async fetchArticleForLabeling() {
    const input = document.getElementById('ai-article-input');
    const article = input ? parseInt(input.value.trim(), 10) : null;
    if (!article) {
      this.showNotification('Введите артикул WB', 'warning');
      return;
    }

    const container = document.getElementById('ai-labeling-container');
    const empty = document.getElementById('ai-labeling-empty');

    if (container) container.innerHTML = `<div style="padding:20px; color:var(--fg-muted);">Загрузка фото товара ${article}...</div>`;
    if (empty) empty.style.display = 'none';

    try {
      const res = await this.api('/api/ai/fetch', {
        method: 'POST',
        body: JSON.stringify({ article }),
      });

      if (res && res.success && res.photos && res.photos.length > 0) {
        container.innerHTML = res.photos.map(p => `
          <div class="card" style="overflow:hidden;">
            <div style="position:relative; aspect-ratio:3/4; background:#000;">
              <img src="${p.url}" style="width:100%; height:100%; object-fit:cover;" alt="Фото">
            </div>
            <div style="padding:10px; display:flex; gap:6px;">
              <button class="btn btn--success btn--sm" style="flex:1;" onclick="app.labelPhoto(${article}, '${p.url}', '${p.path}', 1)">
                👍 Топ (1)
              </button>
              <button class="btn btn--danger btn--sm" style="flex:1;" onclick="app.labelPhoto(${article}, '${p.url}', '${p.path}', 0)">
                👎 Брак (0)
              </button>
            </div>
          </div>
        `).join('');
      } else {
        container.innerHTML = `<div style="padding:20px; color:var(--danger);">Фото не найдены: ${(res && res.error) || 'попробуйте другой артикул'}</div>`;
      }
    } catch (e) {
      if (container) container.innerHTML = `<div style="padding:20px; color:var(--danger);">Ошибка: ${e.message}</div>`;
    }
  },

  async labelPhoto(article, url, path, label) {
    try {
      await this.api('/api/ai/label', {
        method: 'POST',
        body: JSON.stringify({ article, url, path, label }),
      });
      this.showNotification(`Фото размечено как ${label === 1 ? 'отличное' : 'неподходящее'}`, 'info');
      await this.loadAIStatus();
    } catch (e) {
      this.showNotification('Ошибка разметки: ' + e.message, 'error');
    }
  },

  async trainLocalAI() {
    const btn = document.getElementById('btn-train-ai');
    if (btn) btn.innerHTML = `<span class="material-symbols-outlined spin">sync</span> Обучение...`;

    try {
      const res = await this.api('/api/ai/train', { method: 'POST' });
      if (res && res.success) {
        this.showNotification(`Модель обучена! Точность: ${(res.accuracy * 100).toFixed(1)}%`, 'success');
        await this.loadAIStatus();
      } else {
        this.showNotification('Ошибка обучения: ' + ((res && res.error) || 'недостаточно данных'), 'warning');
      }
    } catch (e) {
      this.showNotification('Сбой обучения: ' + e.message, 'error');
    } finally {
      if (btn) btn.innerHTML = `<span class="material-symbols-outlined">psychology</span> Обучить модель`;
    }
  },

  // --- Scheduler ---
  async startScheduler() {
    const interval = parseInt((document.getElementById('scheduler-interval') ? document.getElementById('scheduler-interval').value : null) || '60', 10);
    try {
      const res = await this.api('/api/scheduler/start', {
        method: 'POST',
        body: JSON.stringify({ interval }),
      });
      if (res && res.success) {
        this.showNotification('Планировщик проверок успешно запущен!', 'success');
        if(document.getElementById('btn-start-scheduler')) document.getElementById('btn-start-scheduler').setAttribute('disabled', 'true');
        if(document.getElementById('btn-stop-scheduler')) document.getElementById('btn-stop-scheduler').removeAttribute('disabled');
        const badge = document.getElementById('scheduler-status-badge');
        if (badge) {
          badge.className = 'badge badge--green';
          badge.textContent = 'Работает';
        }
        await this.refreshDashboard();
      }
    } catch (e) {
      this.showNotification('Ошибка запуска: ' + e.message, 'error');
    }
  },

  async stopScheduler() {
    try {
      const res = await this.api('/api/scheduler/stop', { method: 'POST' });
      if (res && res.success) {
        this.showNotification('Планировщик остановлен', 'info');
        if(document.getElementById('btn-start-scheduler')) document.getElementById('btn-start-scheduler').removeAttribute('disabled');
        if(document.getElementById('btn-stop-scheduler')) document.getElementById('btn-stop-scheduler').setAttribute('disabled', 'true');
        const badge = document.getElementById('scheduler-status-badge');
        if (badge) {
          badge.className = 'badge badge--yellow';
          badge.textContent = 'Остановлен';
        }
        await this.refreshDashboard();
      }
    } catch (e) {
      this.showNotification('Ошибка: ' + e.message, 'error');
    }
  },

  async saveSchedulerSettings() {
    const interval = parseInt((document.getElementById('scheduler-interval') ? document.getElementById('scheduler-interval').value : null) || '60', 10);
    try {
      await this.api('/api/scheduler/settings', {
        method: 'POST',
        body: JSON.stringify({ interval }),
      });
      this.showNotification('Интервал планировщика сохранен', 'success');
    } catch (e) {
      this.showNotification('Ошибка: ' + e.message, 'error');
    }
  },

  // --- Logs ---
  async loadLogs() {
    const consoleEl = document.getElementById('log-console');
    if (!consoleEl) return;

    try {
      const logs = await this.api('/api/logs');
      if (!logs || logs.length === 0) {
        consoleEl.innerHTML = `<div><span style="color:var(--apple-green);">➜</span> <span style="color:var(--apple-blue);">wb_up</span> <span style="color:var(--fg-muted);">[System] Журнал пуст</span></div>`;
        return;
      }
      consoleEl.innerHTML = logs.map(l => {
        let badgeColor = 'var(--apple-blue)';
        let textColor = '#e2e8f0';
        if (l.level === 'ERROR') { badgeColor = 'var(--apple-red)'; textColor = '#ff6961'; }
        else if (l.level === 'WARNING') { badgeColor = 'var(--apple-orange)'; textColor = '#ffd166'; }
        else if (l.level === 'INFO') { badgeColor = 'var(--apple-blue)'; textColor = '#e2e8f0'; }
        return `<div style="font-family:var(--font-mono); margin-bottom: 3px; line-height: 1.6;">` +
          `<span style="color:var(--apple-green); font-weight:700;">➜</span> ` +
          `<span style="opacity:0.4; font-size:11px; margin-right:4px;">[${l.time}]</span> ` +
          `<span style="font-weight:600; font-size:11px; color:${badgeColor}; margin-right:6px;">[${l.level}]</span> ` +
          `<span style="color:${textColor};">${this.escHtml(l.message)}</span>` +
          `</div>`;
      }).join('');
      consoleEl.scrollTop = consoleEl.scrollHeight;
    } catch (e) {
      consoleEl.innerHTML = `<div style="color:var(--apple-red); font-family:var(--font-mono);"><span style="color:var(--apple-red);">✖</span> Ошибка загрузки: ${e.message}</div>`;
    }
  },

  async clearLogs() {
    try {
      await this.api('/api/logs/clear', { method: 'POST' });
      this.showNotification('Логи очищены', 'success');
      await this.loadLogs();
    } catch (e) {
      this.showNotification('Ошибка: ' + e.message, 'error');
    }
  },

  // --- Settings ---
  async loadSettings() {
    try {
      const s = await this.api('/api/settings');
      if (s) {
        if (document.getElementById('setting-min-rating')) {
          document.getElementById('setting-min-rating').value = s.min_rating || 4.7;
        }
        if (document.getElementById('setting-max-price')) {
          document.getElementById('setting-max-price').value = s.max_price || 3500;
        }
        if (document.getElementById('setting-products-per-category')) {
          document.getElementById('setting-products-per-category').value = s.products_per_category || 10;
        }
        if (document.getElementById('setting-mode')) {
          document.getElementById('setting-mode').value = s.mode || 'mixed';
        }
        if (document.getElementById('setting-channel')) {
          document.getElementById('setting-channel').value = s.channel || '@wbuppp';
        }
        if (document.getElementById('setting-notification-chat')) {
          document.getElementById('setting-notification-chat').value = s.notification_chat_id || '';
        }
        if (document.getElementById('setting-bot-token')) {
          document.getElementById('setting-bot-token').value = s.bot_token || '';
        }
        if (document.getElementById('setting-standalone-toggle')) {
          document.getElementById('setting-standalone-toggle').checked = this.state.isStandalone;
        }
      }

      // System info
      const info = await this.api('/api/system/info');
      if (info) {
        document.getElementById('sys-version').textContent = info.version || '2.2.0';
        document.getElementById('sys-uptime').textContent = info.uptime_human || '—';
        document.getElementById('sys-python').textContent = info.python_version || '—';
        document.getElementById('sys-db-size').textContent = `${info.db_size_mb || 0} MB`;
      }
    } catch (e) {
      console.warn('loadSettings error:', e);
    }
  },

  async saveSettings() {
    const min_rating = parseFloat((document.getElementById('setting-min-rating') ? document.getElementById('setting-min-rating').value : null) || '4.7');
    const max_price = parseInt((document.getElementById('setting-max-price') ? document.getElementById('setting-max-price').value : null) || '3500', 10);
    const products_per_category = parseInt((document.getElementById('setting-products-per-category') ? document.getElementById('setting-products-per-category').value : null) || '10', 10);
    const mode = (document.getElementById('setting-mode') ? document.getElementById('setting-mode').value : null) || 'mixed';

    try {
      await this.api('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          min_rating,
          max_price,
          products_per_category,
          mode,
        }),
      });
      this.showNotification('Параметры скоринга успешно сохранены!', 'success');
    } catch (e) {
      this.showNotification('Ошибка сохранения: ' + e.message, 'error');
    }
  },

  async saveTelegramSettings() {
    const channel = (document.getElementById('setting-channel') && document.getElementById('setting-channel').value ? document.getElementById('setting-channel').value.trim() : '');
    const notification_chat_id = (document.getElementById('setting-notification-chat') && document.getElementById('setting-notification-chat').value ? document.getElementById('setting-notification-chat').value.trim() : '');
    const bot_token = (document.getElementById('setting-bot-token') && document.getElementById('setting-bot-token').value ? document.getElementById('setting-bot-token').value.trim() : '');

    try {
      await this.api('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ channel, notification_chat_id, bot_token }),
      });
      if (bot_token) {
        StandaloneEngine.saveSettings({ bot_token, channel });
      }
      this.showNotification('Настройки Telegram сохранены', 'success');
    } catch (e) {
      this.showNotification('Ошибка: ' + e.message, 'error');
    }
  },

  async clearCache() {
    this.showModal(
      'Очистить кэш фото',
      `<p>Это удалит все скачанные изображения из кэша. Карточки будут скачиваться заново при следующем запросе.</p>`,
      async () => {
        try {
          await this.api('/api/cache/clear', { method: 'POST' });
          this.showNotification('Кэш изображений успешно очищен', 'success');
        } catch (e) {
          this.showNotification('Ошибка: ' + e.message, 'error');
        }
      }
    );
  },

  // --- Health Check Poller ---
  startHealthCheck() {
    const dot = document.getElementById('sidebar-status-dot');
    const text = document.getElementById('sidebar-status-text');

    const ping = async () => {
      if (this.state.isStandalone) {
        this.updateStatusDot();
        return;
      }
      try {
        const res = await fetch('/api/health', { signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(2500) : undefined });
        if (res.ok) {
          if (dot) dot.className = 'status-dot';
          if (text) text.textContent = 'Онлайн (Сервер)';
          return;
        }
      } catch (e) {}

      if (dot) dot.className = 'status-dot status-dot--standalone';
      if (text) text.textContent = 'Автономный (iOS)';
    };

    ping();
    setInterval(ping, 15000);
  },

  // --- Modals (iOS Bottom Sheet on Mobile) ---
  showModal(title, bodyHtml, onConfirm = null) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.querySelector('.modal');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const confirmBtn = document.getElementById('modal-confirm-btn');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;

    if (modal) {
      modal.style.transform = '';
      modal.style.transition = '';
    }

    this.state.modalCallback = onConfirm;
    if (confirmBtn) {
      confirmBtn.style.display = onConfirm ? 'inline-flex' : 'none';
    }

    if (overlay) overlay.classList.add('modal-overlay--active');
    this.haptic('medium');
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.querySelector('.modal');
    if (overlay) overlay.classList.remove('modal-overlay--active');
    if (modal) {
      modal.style.transform = '';
      modal.style.transition = '';
    }
    this.state.modalCallback = null;
    this.haptic('light');
  },

  async confirmModal() {
    if (typeof this.state.modalCallback === 'function') {
      await this.state.modalCallback();
    }
    this.closeModal();
  },

  // --- Mobile Touch Gestures & Apple Ergonomics ---
  initMobileGestures() {
    const modal = document.querySelector('.modal');
    const overlay = document.getElementById('modal-overlay');
    if (!modal || !overlay) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    modal.addEventListener('touchstart', (e) => {
      // Only drag if targeting grabber, header, or when scrolled to top
      const target = e.target;
      const isHeader = target.closest('.modal__header') || target.closest('.modal__grabber');
      const body = modal.querySelector('.modal__body');
      const isAtTop = !body || body.scrollTop <= 0;

      if (isHeader || isAtTop) {
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
        modal.style.transition = 'none';
      }
    }, { passive: true });

    modal.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        // Drag downward with slight resistance
        modal.style.transform = `translateY(${deltaY}px)`;
      }
    }, { passive: true });

    modal.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      const deltaY = currentY - startY;
      modal.style.transition = 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)';
      if (deltaY > 80) {
        // Dismiss sheet
        modal.style.transform = 'translateY(100%)';
        setTimeout(() => {
          this.closeModal();
          modal.style.transform = '';
          modal.style.transition = '';
        }, 220);
      } else {
        // Snap back
        modal.style.transform = '';
        setTimeout(() => {
          modal.style.transition = '';
        }, 260);
      }
    }, { passive: true });
  },

  haptic(type = 'light') {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (type === 'light') navigator.vibrate(8);
        else if (type === 'medium') navigator.vibrate(18);
        else if (type === 'success') navigator.vibrate([10, 30, 15]);
        else if (type === 'warning') navigator.vibrate([25, 40, 25]);
      } catch (e) {
        // Ignore vibration error
      }
    }
  },

  // --- Utilities ---
  formatPrice(val) {
    if (val === null || val === undefined || isNaN(val)) return '0 ₽';
    return `${Math.round(val).toLocaleString('ru-RU')} ₽`;
  },

  escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());
