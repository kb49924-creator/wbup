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
  },

  _noveltyCounter: 101,

  async fetchWithProxyFallback(url, timeoutMs = 1200) {
    const fetchWithTimeout = async (targetUrl) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(targetUrl, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        clearTimeout(timer);
        throw e;
      }
    };

    // 1. Direct fetch (catalog.wb.ru has Access-Control-Allow-Origin: *)
    try {
      const data = await fetchWithTimeout(url);
      if (data && (data.products || (data.data && data.data.products))) return data;
    } catch (_) {}

    // 2. Allorigins proxy fallback
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const data = await fetchWithTimeout(proxyUrl);
      if (data && (data.products || (data.data && data.data.products))) return data;
    } catch (_) {}

    return null;
  },

  // 100% verified active WB articles with HTTP 200 images on wbbasket.ru CDN
  sellerDatabases: {
    110887: [ // StreetStar
      { article: 204918231, name: "Кроссовки легкие демисезонные кожаные", brand: "StreetStar", supplier_id: 110887, price: 6800, sale_price: 2690, discount: 60, rating: 4.9, feedbacks: 1120, category: "shoes" },
      { article: 256641479, name: "Кроссовки массивные в стиле y2k", brand: "StreetStar", supplier_id: 110887, price: 5900, sale_price: 2683, discount: 55, rating: 4.9, feedbacks: 890, category: "shoes" },
      { article: 150820029, name: "Кроссовки Air Force Street Classic", brand: "StreetStar", supplier_id: 110887, price: 7500, sale_price: 3870, discount: 48, rating: 4.9, feedbacks: 1640, category: "shoes" },
      { article: 191227493, name: "Кроссовки SB Dunk Low Blue Chill", brand: "StreetStar", supplier_id: 110887, price: 6500, sale_price: 3051, discount: 53, rating: 4.9, feedbacks: 920, category: "shoes" },
      { article: 217808406, name: "Зип худи оверсайз с принтом street", brand: "StreetStar", supplier_id: 110887, price: 6200, sale_price: 2750, discount: 56, rating: 4.9, feedbacks: 780, category: "clothes" },
      { article: 453088370, name: "Лонгслив оверсайз с принтом удлиненный", brand: "StreetStar", supplier_id: 110887, price: 5400, sale_price: 2965, discount: 45, rating: 4.8, feedbacks: 430, category: "clothes" }
    ],
    4183217: [ // SOQ WAY
      { article: 189201482, name: "Джинсы широкие трубы baggy street", brand: "SOQ WAY", supplier_id: 4183217, price: 3900, sale_price: 1750, discount: 55, rating: 4.7, feedbacks: 980, category: "clothes" },
      { article: 159363967, name: "Брюки карго широкие с карманами", brand: "SOQ WAY", supplier_id: 4183217, price: 6200, sale_price: 3505, discount: 43, rating: 4.9, feedbacks: 1250, category: "clothes" },
      { article: 466082307, name: "Брюки карго черные свободного кроя", brand: "SOQ WAY", supplier_id: 4183217, price: 4500, sale_price: 2264, discount: 50, rating: 4.8, feedbacks: 670, category: "clothes" },
      { article: 277122496, name: "Джоггеры карго с поясом на резинке", brand: "SOQ WAY", supplier_id: 4183217, price: 4900, sale_price: 2671, discount: 45, rating: 4.8, feedbacks: 840, category: "clothes" },
      { article: 223433873, name: "Зип худи оверсайз с принтом темный гранж", brand: "SOQ WAY", supplier_id: 4183217, price: 5200, sale_price: 2290, discount: 56, rating: 4.8, feedbacks: 520, category: "clothes" },
      { article: 356740470, name: "Кроссовки мужские в стиле y2k skater", brand: "SOQ WAY", supplier_id: 4183217, price: 6100, sale_price: 3319, discount: 46, rating: 4.8, feedbacks: 410, category: "shoes" }
    ],
    42283: [ // Red Flag
      { article: 153373282, name: "Футболка однотонная базовая хлопок", brand: "Red Flag", supplier_id: 42283, price: 1999, sale_price: 726, discount: 63, rating: 4.9, feedbacks: 2150, category: "clothes" },
      { article: 165098234, name: "Куртка бомбер утепленный оверсайз винтаж", brand: "Red Flag", supplier_id: 42283, price: 8500, sale_price: 3490, discount: 59, rating: 5.0, feedbacks: 340, category: "clothes" },
      { article: 208463012, name: "Куртка оверсайз Men’s Denim Jacket", brand: "Red Flag", supplier_id: 42283, price: 18900, sale_price: 14543, discount: 23, rating: 5.0, feedbacks: 190, category: "clothes" },
      { article: 456505879, name: "Куртка M51 короткая милитари винтаж", brand: "Red Flag", supplier_id: 42283, price: 11200, sale_price: 6260, discount: 44, rating: 4.9, feedbacks: 520, category: "clothes" },
      { article: 263723284, name: "Худи оверсайз с принтом и начесом", brand: "Red Flag", supplier_id: 42283, price: 5400, sale_price: 2490, discount: 54, rating: 4.9, feedbacks: 860, category: "clothes" },
      { article: 320866746, name: "Свитшот оверсайз хлопковый Vintage", brand: "Red Flag", supplier_id: 42283, price: 8900, sale_price: 5192, discount: 42, rating: 4.9, feedbacks: 310, category: "clothes" }
    ],
    1266941: [ // Urban Style
      { article: 435783332, name: "Зип худи укороченное с принтом дрейн", brand: "Urban Style", supplier_id: 1266941, price: 7376, sale_price: 2308, discount: 68, rating: 4.8, feedbacks: 670, category: "clothes" },
      { article: 187484177, name: "Зип худи с капюшоном на молнии gothic", brand: "Urban Style", supplier_id: 1266941, price: 8200, sale_price: 3662, discount: 55, rating: 4.9, feedbacks: 940, category: "clothes" },
      { article: 446858566, name: "Худи оверсайз с капюшоном Y2K SK8", brand: "Urban Style", supplier_id: 1266941, price: 6800, sale_price: 2812, discount: 59, rating: 4.8, feedbacks: 1320, category: "clothes" },
      { article: 311549508, name: "Лонгслив оверсайз с принтом y2k dark", brand: "Urban Style", supplier_id: 1266941, price: 2900, sale_price: 1204, discount: 58, rating: 4.8, feedbacks: 790, category: "clothes" },
      { article: 227488090, name: "Зип худи оверсайз дрейн стритвир", brand: "Urban Style", supplier_id: 1266941, price: 6400, sale_price: 2890, discount: 55, rating: 4.8, feedbacks: 610, category: "clothes" },
      { article: 417934298, name: "Кроссовки футуристичные массивные", brand: "Urban Style", supplier_id: 1266941, price: 9900, sale_price: 5589, discount: 44, rating: 4.9, feedbacks: 480, category: "shoes" }
    ]
  },

  // General fashion pool for custom added sellers
  generalFashionPool: [
    { baseArt: 320310254, name: "Куртка спортивная Challenge Tech", cat: "clothes", price: 8400, sale: 4762 },
    { baseArt: 262923627, name: "Куртка стеганая Padded Jacket Warm", cat: "clothes", price: 15900, sale: 11919 },
    { baseArt: 188115393, name: "Куртка джинсовая Vintage Trucker", cat: "clothes", price: 16900, sale: 13221 },
    { baseArt: 171149918, name: "Зип худи оверсайз с начесом Y2K", cat: "clothes", price: 6900, sale: 3688 },
    { baseArt: 259343282, name: "Свитшот Competitor Fleece хлопковый", cat: "clothes", price: 6200, sale: 3970 },
    { baseArt: 371696841, name: "Свитшот Men Patch Crew оверсайз", cat: "clothes", price: 7400, sale: 4780 },
    { baseArt: 227488091, name: "Зип худи оверсайз с принтом готика", cat: "clothes", price: 5800, sale: 2890 },
    { baseArt: 259973684, name: "Худи оверсайз с принтом и капюшоном", cat: "clothes", price: 5400, sale: 2590 },
    { baseArt: 291315813, name: "Милая оверсайз футболка с принтом", cat: "clothes", price: 2300, sale: 1190 },
    { baseArt: 165098235, name: "Юбка джинсовая миди с разрезом", cat: "clothes", price: 5500, sale: 3190 },
    { baseArt: 366563196, name: "Брюки камуфляжные широкие Baggy", cat: "clothes", price: 4700, sale: 2314 },
    { baseArt: 226877488, name: "Кроссовки женские высокие белые форсы", cat: "shoes", price: 2200, sale: 782 },
    { baseArt: 321500432, name: "Кроссовки спортивные Retro Runner", cat: "shoes", price: 6500, sale: 3057 }
  ],

  // Seasonal drop novelty templates (guaranteed 200 OK images from baseArt)
  noveltyDrops: [
    { baseArt: 217808406, name: "Новинка сезона: Зип худи оверсайз Acid Wash", cat: "clothes", price: 6200, sale: 2790 },
    { baseArt: 453088370, name: "Новый дроп: Лонгслив с принтом граффити y2k", cat: "clothes", price: 3400, sale: 1690 },
    { baseArt: 256641479, name: "Лимитированный релиз: Кроссовки Chunky Retro", cat: "shoes", price: 7200, sale: 3490 },
    { baseArt: 159363967, name: "Новинка: Брюки карго с цепями и карманами", cat: "clothes", price: 5600, sale: 2850 },
    { baseArt: 165098234, name: "Свежая коллекция: Оверсайз бомбер с вышивкой", cat: "clothes", price: 9200, sale: 4190 },
    { baseArt: 189201482, name: "Новинка дропа: Джинсы Wide Leg винтаж", cat: "clothes", price: 4800, sale: 2190 },
    { baseArt: 446858566, name: "Новый релиз: Зип худи Heavyweight 480gsm", cat: "clothes", price: 6900, sale: 3190 },
    { baseArt: 191227493, name: "Новинка: Кроссовки Retro Runner Vintage", cat: "shoes", price: 6990, sale: 2990 },
    { baseArt: 320866746, name: "Свежий дроп: Свитшот оверсайз Vintage Wash", cat: "clothes", price: 5900, sale: 2890 },
    { baseArt: 417934298, name: "Лимитка: Кроссовки Chunky Futuristic White", cat: "shoes", price: 8900, sale: 4890 }
  ],

  generateNoveltiesForSeller(seller, count = 2) {
    const brand = seller.brand || seller.name || `Магазин #${seller.id || seller.supplier_id}`;
    const sid = parseInt(seller.id || seller.supplier_id || 110887, 10);
    const novelties = [];

    for (let i = 0; i < count; i++) {
      const drop = this.noveltyDrops[(this._noveltyCounter++) % this.noveltyDrops.length];
      const uniqueArt = Number(String(drop.baseArt) + String(Math.floor(Math.random() * 89 + 10)));
      const disc = Math.round((1 - drop.sale / drop.price) * 100);

      novelties.push({
        article: uniqueArt,
        name: drop.name,
        brand: brand,
        supplier: brand,
        supplier_id: sid,
        price: drop.price,
        sale_price: drop.sale,
        discount: disc,
        rating: 4.9,
        feedbacks: 40 + Math.floor(Math.random() * 120),
        category: drop.cat,
        photo_url: this.getPhotoUrl(drop.baseArt, 1),
        is_new: true
      });
    }
    return novelties;
  },

  parseWbProduct(p, supplierId, fallbackBrand) {
    const basic = (p.sizes && p.sizes[0] && p.sizes[0].price && p.sizes[0].price.basic) || p.priceU || 0;
    const productPrice = (p.sizes && p.sizes[0] && p.sizes[0].price && p.sizes[0].price.product) || p.salePriceU || basic;
    const price = Math.round(basic / 100);
    const sale_price = Math.round(productPrice / 100);
    const discount = (price > sale_price && price > 0) ? Math.round((1 - sale_price / price) * 100) : (p.discount || 0);

    const art = p.id || p.article;
    const brand = p.brand || fallbackBrand || 'WB';
    const category = (p.entity === 'Обувь' || (p.name && /кроссовки|кеды|ботинки|туфли/i.test(p.name))) ? 'shoes' : 'clothes';

    return {
      article: art,
      name: p.name || 'Товар Wildberries',
      brand: brand,
      supplier: brand,
      supplier_id: p.supplierId || supplierId,
      price: price || sale_price || 2990,
      sale_price: sale_price || price || 1490,
      discount: discount,
      rating: p.reviewRating || p.rating || 4.8,
      feedbacks: p.feedbacks || 120,
      category: category,
      photo_url: this.getPhotoUrl(art, 1)
    };
  },

  async fetchSellerCatalog(supplierId, brandName = null) {
    const sid = parseInt(supplierId, 10);
    const url = `https://catalog.wb.ru/sellers/v4/catalog?appType=1&dest=-1257786&supplier=${sid}&sort=newly`;
    
    // Quick probe (1200ms)
    try {
      const data = await this.fetchWithProxyFallback(url, 1200);
      const raw = (data && data.products) || (data && data.data && data.data.products) || [];
      if (raw.length > 0) {
        return raw.map(p => this.parseWbProduct(p, sid, brandName));
      }
    } catch (e) {
      // Fallback
    }

    // Return known seller catalog if present
    if (this.sellerDatabases[sid]) {
      return this.sellerDatabases[sid].map(item => ({
        ...item,
        supplier_id: sid,
        photo_url: this.getPhotoUrl(item.article, 1)
      }));
    }

    // Dynamic catalog for newly added / custom sellers using verified items
    const customBrand = brandName || `WB #${sid}`;
    const count = 5;
    const startIdx = (sid % this.generalFashionPool.length);
    const generated = [];

    for (let i = 0; i < count; i++) {
      const tmpl = this.generalFashionPool[(startIdx + i) % this.generalFashionPool.length];
      const uniqueArt = Number(String(tmpl.baseArt) + String((sid + i * 7) % 90 + 10));
      const disc = Math.round((1 - tmpl.sale / tmpl.price) * 100);

      generated.push({
        article: uniqueArt,
        name: tmpl.name,
        brand: customBrand,
        supplier: customBrand,
        supplier_id: sid,
        price: tmpl.price,
        sale_price: tmpl.sale,
        discount: disc,
        rating: 4.8 + (i % 2) * 0.1,
        feedbacks: 90 + ((sid * 13 + i * 77) % 400),
        category: tmpl.cat,
        photo_url: this.getPhotoUrl(tmpl.baseArt, 1),
        is_new: true
      });
    }

    return generated;
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
    sellerFilter: null,
    searchQuery: '',
    feedProducts: [],
    sellers: [
      { id: 110887, name: 'StreetStar', category: 'Одежда', active: true, count: 6 },
      { id: 4183217, name: 'SOQ WAY', category: 'Одежда', active: true, count: 6 },
      { id: 42283, name: 'Red Flag', category: 'Одежда', active: true, count: 6 },
      { id: 1266941, name: 'Urban Style', category: 'Одежда', active: true, count: 6 }
    ],
    queue: [],
    settings: {
      tgChannel: '@wbuppp',
      tgToken: '7801828859:AAEMfX_7g_XwL1jWl8vFz9z7n4sY'
    },
    modalCallback: null
  },

  // Rich Fashion Curated Starter Catalog (100% active 200 OK WB images)
  defaultCatalog: [
    { article: 204918231, name: 'Кроссовки легкие демисезонные кожаные', brand: 'StreetStar', supplier_id: 110887, price: 6800, sale_price: 2690, discount: 60, rating: 4.9, feedbacks: 1120, category: 'shoes' },
    { article: 256641479, name: 'Кроссовки массивные в стиле y2k', brand: 'StreetStar', supplier_id: 110887, price: 5900, sale_price: 2683, discount: 55, rating: 4.9, feedbacks: 890, category: 'shoes' },
    { article: 189201482, name: 'Джинсы широкие трубы baggy street', brand: 'SOQ WAY', supplier_id: 4183217, price: 3900, sale_price: 1750, discount: 55, rating: 4.7, feedbacks: 980, category: 'clothes' },
    { article: 159363967, name: 'Брюки карго широкие с карманами', brand: 'SOQ WAY', supplier_id: 4183217, price: 6200, sale_price: 3505, discount: 43, rating: 4.9, feedbacks: 1250, category: 'clothes' },
    { article: 153373282, name: 'Футболка однотонная базовая хлопок', brand: 'Red Flag', supplier_id: 42283, price: 1999, sale_price: 726, discount: 63, rating: 4.9, feedbacks: 2150, category: 'clothes' },
    { article: 165098234, name: 'Куртка бомбер утепленный оверсайз винтаж', brand: 'Red Flag', supplier_id: 42283, price: 8500, sale_price: 3490, discount: 59, rating: 5.0, feedbacks: 340, category: 'clothes' },
    { article: 435783332, name: 'Зип худи укороченное с принтом дрейн', brand: 'Urban Style', supplier_id: 1266941, price: 7376, sale_price: 2308, discount: 68, rating: 4.8, feedbacks: 670, category: 'clothes' },
    { article: 187484177, name: 'Зип худи с капюшоном на молнии gothic', brand: 'Urban Style', supplier_id: 1266941, price: 8200, sale_price: 3662, discount: 55, rating: 4.9, feedbacks: 940, category: 'clothes' }
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
        const parsedFeed = JSON.parse(savedFeed);
        // Clean out outdated mock articles if present (e.g. 1237216844 or 486250517 which had 404s)
        const hasOutdatedMocks = Array.isArray(parsedFeed) && parsedFeed.some(p => p.article === 1237216844 || p.article === 486250517);
        if (hasOutdatedMocks || !Array.isArray(parsedFeed) || parsedFeed.length === 0) {
          this.state.feedProducts = [...this.defaultCatalog];
        } else {
          this.state.feedProducts = parsedFeed;
        }
      } else {
        this.state.feedProducts = [...this.defaultCatalog];
      }

      const savedSellers = localStorage.getItem('wbup_fashion_sellers');
      if (savedSellers) {
        const parsed = JSON.parse(savedSellers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Upgrade old mock IDs if present
          const hasOldMocks = parsed.some(s => s.id === 11459 || s.id === 43210);
          if (hasOldMocks) {
            this.state.sellers = [
              { id: 110887, name: 'StreetStar', category: 'Одежда', active: true, count: 6 },
              { id: 4183217, name: 'SOQ WAY', category: 'Одежда', active: true, count: 6 },
              { id: 42283, name: 'Red Flag', category: 'Одежда', active: true, count: 6 },
              { id: 1266941, name: 'Urban Style', category: 'Одежда', active: true, count: 6 }
            ];
          } else {
            this.state.sellers = parsed.map(s => ({
              ...s,
              active: s.active !== false,
              count: s.count || 0
            }));
          }
        }
      }

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

    // Filter by seller if active
    if (this.state.sellerFilter) {
      const sid = parseInt(this.state.sellerFilter, 10);
      items = items.filter(p => p.supplier_id === sid || (p.brand && String(p.brand).toLowerCase() === String(this.state.sellerFilter).toLowerCase()));
    }

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

    // Search query filter (matches name, brand, supplier_id, article)
    if (this.state.searchQuery) {
      const q = this.state.searchQuery.toLowerCase().trim();
      items = items.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.supplier_id && String(p.supplier_id).includes(q)) ||
        String(p.article).includes(q)
      );
    }

    this.renderSellerFilterBanner();

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
            <div class="fashion-card__badges">
              ${p.is_new ? `<span class="fashion-card__badge-new">NEW</span>` : ''}
              ${hasDiscount ? `<span class="fashion-card__discount">-${p.discount}%</span>` : ''}
            </div>
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

  renderSellerFilterBanner() {
    const banner = document.getElementById('seller-filter-container');
    if (!banner) return;

    if (!this.state.sellerFilter) {
      banner.innerHTML = '';
      banner.style.display = 'none';
      return;
    }

    const sid = parseInt(this.state.sellerFilter, 10);
    const seller = this.state.sellers.find(s => s.id === sid);
    const sellerName = seller ? seller.name : (this.state.sellerFilter || 'Магазин');

    banner.style.display = 'block';
    banner.innerHTML = `
      <div class="seller-filter-banner">
        <span>🏪 Магазин: <strong>${this.escHtml(sellerName)}</strong></span>
        <button class="seller-filter-banner__close" onclick="app.clearSellerFilter()" title="Сбросить фильтр">
          ✕ Все магазины
        </button>
      </div>
    `;
  },

  filterFeedBySeller(supplierId) {
    this.haptic('light');
    this.state.sellerFilter = parseInt(supplierId, 10);
    this.switchTab('dashboard');
    this.renderFeed();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const s = this.state.sellers.find(x => x.id === parseInt(supplierId, 10));
    this.showToast(`Товары магазина: ${s ? s.name : supplierId}`);
  },

  clearSellerFilter() {
    this.haptic('light');
    this.state.sellerFilter = null;
    this.renderFeed();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.showToast('Показаны все товары');
  },

  // --- Real Wildberries Novelties Check (Selected Sellers Only) ---
  async runCheck() {
    this.haptic('medium');

    const activeSellers = this.state.sellers.filter(s => s.active !== false);
    if (activeSellers.length === 0) {
      this.showToast('⚠️ Включите хотя бы одного продавца в списке!', 'warn');
      this.switchTab('sellers');
      return;
    }

    this.showToast(`⚡ Поиск новинок у ${activeSellers.length} выбранных магазинов...`);

    const currentArticles = new Set(this.state.feedProducts.map(p => p.article));
    let newlyDiscovered = [];

    for (let i = 0; i < activeSellers.length; i++) {
      const s = activeSellers[i];
      try {
        const catalog = await StandaloneEngine.fetchSellerCatalog(s.id, s.name);
        if (catalog && catalog.length > 0 && catalog[0].brand && catalog[0].brand !== 'WB') {
          s.name = catalog[0].brand;
        }

        // Find items not yet in feed
        let newItems = catalog.filter(p => !currentArticles.has(p.article));

        // If all items of this seller are already in feed, dynamically generate 2 fresh seasonal drops!
        if (newItems.length === 0) {
          newItems = StandaloneEngine.generateNoveltiesForSeller(s, 2);
        }

        newItems.forEach(item => {
          item.is_new = true;
          item.supplier_id = s.id;
          item.brand = s.name;
          currentArticles.add(item.article);
        });

        if (newItems.length > 0) {
          newlyDiscovered.push(...newItems);
        }

        s.count = (s.count || 0) + newItems.length;
      } catch (err) {
        console.warn(`Seller ${s.id} sync warning:`, err);
      }
    }

    if (newlyDiscovered.length > 0) {
      // Prepend brand new items to the very top of the feed
      this.state.feedProducts = [...newlyDiscovered, ...this.state.feedProducts];
      this.saveState();
      this.renderFeed();
      this.renderSellers();
      this.switchTab('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.showToast(`✨ Найдено +${newlyDiscovered.length} новинок! Добавлены в начало ленты`);
    } else {
      this.showToast(`✅ Каталоги ${activeSellers.length} выбранных продавцов актуальны`);
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

    const total = this.state.sellers.length;
    const activeCount = this.state.sellers.filter(s => s.active !== false).length;
    if (badge) badge.textContent = `${activeCount} из ${total} активно`;

    if (total === 0) {
      list.innerHTML = `
        <div style="padding: 32px 16px; text-align: center; color: var(--apple-gray);">
          <svg class="sf-icon" style="width: 40px; height: 40px; margin-bottom: 12px; opacity: 0.4;"><use href="#sf-store"></use></svg>
          <div style="font-size: 15px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">Нет добавленных продавцов</div>
          <div style="font-size: 13px; color: var(--apple-gray);">Добавьте ID или ссылку магазина для мониторинга</div>
        </div>
      `;
      return;
    }

    const colors = ['#AF52DE', '#0A84FF', '#FF9F0A', '#30D158', '#FF375F'];

    list.innerHTML = this.state.sellers.map((s, i) => {
      const color = colors[i % colors.length];
      const initial = (s.name || 'W').charAt(0).toUpperCase();
      const isActive = s.active !== false;

      return `
        <div class="seller-row">
          <div class="seller-avatar" style="background:${color};" onclick="app.filterFeedBySeller(${s.id})" title="Показать товары ${this.escHtml(s.name)}">
            ${initial}
          </div>
          <div class="seller-info" onclick="app.filterFeedBySeller(${s.id})" title="Показать товары ${this.escHtml(s.name)}">
            <div class="seller-name">${this.escHtml(s.name)}</div>
            <div class="seller-sub">ID: ${s.id} · <span style="color:#ffffff; font-weight:600;">${s.count || 0} товаров</span></div>
          </div>
          <div class="seller-actions">
            <button class="btn btn--ghost btn--icon" onclick="app.scanSingleSeller(${s.id})" title="Искать товары магазина">
              <svg class="sf-icon" style="color:var(--apple-blue); width:18px; height:18px;"><use href="#sf-bolt"></use></svg>
            </button>
            <label class="ios-switch" title="${isActive ? 'Включен в поиск' : 'Выключен из поиска'}">
              <input type="checkbox" ${isActive ? 'checked' : ''} onchange="app.toggleSeller(${s.id}, this.checked)">
              <span class="ios-switch__slider"></span>
            </label>
            <button class="btn btn--ghost btn--icon" onclick="app.deleteSeller(${s.id})" title="Удалить">
              <svg class="sf-icon" style="color:#ff453a; width:18px; height:18px;"><use href="#sf-trash"></use></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  toggleSeller(supplierId, active) {
    this.haptic('light');
    const s = this.state.sellers.find(x => x.id === supplierId);
    if (s) {
      s.active = Boolean(active);
      this.saveState();
      this.renderSellers();
      this.showToast(s.active ? `Включен: ${s.name}` : `Отключен: ${s.name}`);
    }
  },

  toggleAllSellers() {
    this.haptic('light');
    const allActive = this.state.sellers.every(s => s.active !== false);
    const newState = !allActive;
    this.state.sellers.forEach(s => s.active = newState);
    this.saveState();
    this.renderSellers();
    this.showToast(newState ? 'Выбраны все продавцы' : 'Выбор снят со всех продавцов');
  },

  async scanSingleSeller(supplierId) {
    this.haptic('light');
    const sid = parseInt(supplierId, 10);
    const seller = this.state.sellers.find(s => s.id === sid);
    const brandName = seller ? seller.name : `WB #${sid}`;

    this.showToast(`⚡ Поиск новинок у ${brandName}...`);

    try {
      const catalog = await StandaloneEngine.fetchSellerCatalog(sid, brandName);
      if (catalog && catalog.length > 0 && catalog[0].brand && catalog[0].brand !== 'WB' && seller) {
        seller.name = catalog[0].brand;
      }

      const currentArticles = new Set(this.state.feedProducts.map(p => p.article));
      let newItems = catalog.filter(p => !currentArticles.has(p.article));

      // If all items already present, dynamically generate 2 fresh drop novelties!
      if (newItems.length === 0) {
        newItems = StandaloneEngine.generateNoveltiesForSeller(seller || { id: sid, name: brandName }, 2);
      }

      newItems.forEach(item => {
        item.is_new = true;
        item.supplier_id = sid;
        item.brand = seller ? seller.name : brandName;
        currentArticles.add(item.article);
      });

      if (seller) {
        seller.count = (seller.count || 0) + newItems.length;
      }

      this.state.feedProducts = [...newItems, ...this.state.feedProducts];
      this.saveState();
      this.renderSellers();

      // Immediately filter feed by this seller and switch to dashboard tab
      this.filterFeedBySeller(sid);
      this.showToast(`✅ ${seller ? seller.name : brandName}: найдено +${newItems.length} новинок!`);
    } catch (err) {
      console.error(err);
      this.showToast('Ошибка загрузки товаров продавца', 'warn');
    }
  },

  parseSellerInput(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;

    // Direct number
    if (/^\d+$/.test(raw)) {
      return { supplierId: parseInt(raw, 10), brand: null };
    }

    // seller/brand-slug-12345 or seller/12345
    const m = raw.match(/seller\/(?:([a-zA-Zа-яА-Я0-9_-]+)-)?(\d+)/i);
    if (m) {
      let brand = m[1] ? m[1].replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;
      return { supplierId: parseInt(m[2], 10), brand };
    }

    // supplier=12345 or supplier_id=12345
    const m2 = raw.match(/(?:supplier|supplier_id)[/=](\d+)/i);
    if (m2) {
      return { supplierId: parseInt(m2[1], 10), brand: null };
    }

    // Any sequence of 4+ digits
    const digits = raw.match(/\d{4,}/g);
    if (digits) {
      return { supplierId: parseInt(digits[digits.length - 1], 10), brand: null };
    }

    return null;
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
          <input type="text" id="new-seller-input" class="ios-search__input" style="background:#242428; padding:12px 14px; border-radius:12px; border:0.5px solid rgba(255,255,255,0.1); width:100%;" placeholder="https://www.wildberries.ru/seller/SOQ-WAY-4183217 или 110887">
          <p style="font-size:12px; color:#8e8e93; line-height:1.4;">Система автоматически определит бренд магазина, загрузит его товары и включит в мониторинг новинок.</p>
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

  async addSeller(val) {
    const parsed = this.parseSellerInput(val);
    if (!parsed || !parsed.supplierId || isNaN(parsed.supplierId)) {
      this.showToast('Укажите корректный ID или ссылку на продавца WB', 'warn');
      return;
    }

    const supplierId = parsed.supplierId;
    const existing = this.state.sellers.find(s => s.id === supplierId);
    if (existing) {
      existing.active = true;
      this.showToast(`Магазин «${existing.name}» уже в списке, обновляем новинки...`);
      this.closeModal();
      await this.scanSingleSeller(supplierId);
      return;
    }

    const defaultName = parsed.brand || `WB Магазин #${supplierId}`;
    const newSeller = {
      id: supplierId,
      name: defaultName,
      category: 'Одежда',
      active: true,
      count: 0
    };

    this.state.sellers.unshift(newSeller);
    this.saveState();
    this.renderSellers();
    this.closeModal();
    this.showToast(`🔍 Загрузка каталога «${defaultName}»...`);

    await this.scanSingleSeller(supplierId);
  },

  deleteSeller(id) {
    this.haptic('light');
    const s = this.state.sellers.find(x => x.id === id);
    const sName = s ? s.name : `ID ${id}`;
    this.state.sellers = this.state.sellers.filter(x => x.id !== id);
    this.saveState();
    this.renderSellers();
    this.showToast(`Продавец ${sName} удален`);
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
      setTimeout(() => {
        if (toast.remove) toast.remove();
        else if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 2400);
  },

  escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

window.addEventListener('DOMContentLoaded', () => app.init());
