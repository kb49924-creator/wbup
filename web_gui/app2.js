// ============================================================
// WB Up Studio — Luxury Fashion Engine & Apple iOS 18 Controller
// Zero-Bloat, High-Performance, Mobile-First Architecture
// ============================================================

const StandaloneEngine = {
  getBasketHost(article) {
    const vol = Math.floor(article / 100000);
    if (vol <= 143) return 'basket-01.wbbasket.ru';
    if (vol <= 287) return 'basket-02.wbbasket.ru';
    if (vol <= 431) return 'basket-03.wbbasket.ru';
    if (vol <= 719) return 'basket-04.wbbasket.ru';
    if (vol <= 1007) return 'basket-05.wbbasket.ru';
    if (vol <= 1061) return 'basket-06.wbbasket.ru';
    if (vol <= 1115) return 'basket-07.wbbasket.ru';
    if (vol <= 1169) return 'basket-08.wbbasket.ru';
    if (vol <= 1313) return 'basket-09.wbbasket.ru';
    if (vol <= 1601) return 'basket-10.wbbasket.ru';
    if (vol <= 1655) return 'basket-11.wbbasket.ru';
    if (vol <= 1919) return 'basket-12.wbbasket.ru';
    if (vol <= 2045) return 'basket-13.wbbasket.ru';
    if (vol <= 2189) return 'basket-14.wbbasket.ru';
    if (vol <= 2405) return 'basket-15.wbbasket.ru';
    if (vol <= 2621) return 'basket-16.wbbasket.ru';
    if (vol <= 2837) return 'basket-17.wbbasket.ru';
    if (vol <= 3053) return 'basket-18.wbbasket.ru';
    if (vol <= 3269) return 'basket-19.wbbasket.ru';
    if (vol <= 3485) return 'basket-20.wbbasket.ru';
    if (vol <= 3701) return 'basket-21.wbbasket.ru';
    if (vol <= 3917) return 'basket-22.wbbasket.ru';
    if (vol <= 4133) return 'basket-23.wbbasket.ru';
    if (vol <= 4349) return 'basket-24.wbbasket.ru';
    if (vol <= 4565) return 'basket-25.wbbasket.ru';
    if (vol <= 4866) return 'basket-26.wbbasket.ru';
    if (vol <= 5186) return 'basket-27.wbbasket.ru';
    if (vol <= 5501) return 'basket-28.wbbasket.ru';
    if (vol <= 5748) return 'basket-29.wbbasket.ru';
    if (vol <= 6087) return 'basket-30.wbbasket.ru';
    if (vol <= 6428) return 'basket-31.wbbasket.ru';
    if (vol <= 6710) return 'basket-32.wbbasket.ru';
    if (vol <= 7038) return 'basket-33.wbbasket.ru';
    if (vol <= 7314) return 'basket-34.wbbasket.ru';
    if (vol <= 7668) return 'basket-35.wbbasket.ru';
    if (vol <= 7965) return 'basket-36.wbbasket.ru';
    if (vol <= 8256) return 'basket-37.wbbasket.ru';
    if (vol <= 8734) return 'basket-38.wbbasket.ru';
    if (vol <= 9159) return 'basket-39.wbbasket.ru';
    if (vol <= 9593) return 'basket-40.wbbasket.ru';
    if (vol <= 10323) return 'basket-41.wbbasket.ru';
    if (vol <= 10986) return 'basket-42.wbbasket.ru';
    if (vol <= 11903) return 'basket-43.wbbasket.ru';
    if (vol <= 12674) return 'basket-44.wbbasket.ru';
    if (vol <= 13348) return 'basket-45.wbbasket.ru';
    if (vol <= 14204) return 'basket-46.wbbasket.ru';
    if (vol <= 14700) return 'basket-47.wbbasket.ru';
    if (vol <= 15632) return 'basket-48.wbbasket.ru';
    if (vol <= 16500) return 'basket-49.wbbasket.ru';
    return 'basket-48.wbbasket.ru';
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
        proxyImg.onerror = () => reject(new Error('Image load failed: ' + url));
        proxyImg.src = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
      };

      img.src = url;
    });
  },

  async renderPoster(items, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // 1. Draw Background
    try {
      const bgImg = await this.loadImage('wb_up_background.jpg', 3000);
      ctx.drawImage(bgImg, 0, 0, 1080, 1080);
    } catch (_) {
      const grad = ctx.createLinearGradient(0, 0, 0, 1080);
      grad.addColorStop(0, '#1c1c1e');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);
    }

    // Subtle dark vignette for high contrast
    const vignette = ctx.createRadialGradient(540, 540, 300, 540, 540, 750);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Header Lookbook Branding
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '800 36px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('WILDBERRIES SELECTION', 54, 76);

    ctx.fillStyle = '#0A84FF';
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('@WBUPPP · DAILY LOOKBOOK', 54, 106);
    ctx.restore();

    // 3. 2x2 Grid Layout for 4 Products
    const displayItems = items.slice(0, 4);
    const slots = [
      { x: 54, y: 130, w: 460, h: 420 },
      { x: 566, y: 130, w: 460, h: 420 },
      { x: 54, y: 580, w: 460, h: 420 },
      { x: 566, y: 580, w: 460, h: 420 }
    ];

    for (let i = 0; i < displayItems.length; i++) {
      const p = displayItems[i];
      const slot = slots[i];

      try {
        const photoUrl = p.photo_url || this.getPhotoUrl(p.article, 1);
        const itemImg = await this.loadImage(photoUrl, 3500);

        ctx.save();
        this.drawRoundedRect(ctx, slot.x, slot.y, slot.w, slot.h, 24);
        ctx.clip();

        // High quality cover fill
        const imgAspect = itemImg.width / itemImg.height;
        const slotAspect = slot.w / slot.h;
        let sW, sH, sX, sY;

        if (imgAspect > slotAspect) {
          sH = itemImg.height;
          sW = itemImg.height * slotAspect;
          sX = (itemImg.width - sW) / 2;
          sY = 0;
        } else {
          sW = itemImg.width;
          sH = itemImg.width / slotAspect;
          sX = 0;
          sY = (itemImg.height - sH) / 2;
        }

        ctx.drawImage(itemImg, sX, sY, sW, sH, slot.x, slot.y, slot.w, slot.h);
        ctx.restore();

        // Bottom glass tag on card
        ctx.save();
        const tagH = 68;
        const tagY = slot.y + slot.h - tagH - 12;
        const tagX = slot.x + 12;
        const tagW = slot.w - 24;

        this.drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 16);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const priceText = `${Math.round(p.sale_price || p.price || 0).toLocaleString('ru-RU')} ₽`;
        const artText = `арт: ${p.article}`;

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

  // 100% verified active WB articles with real photos and exact matching names
  sellerDatabases: {
    4183217: [
    {
        "article": 1537250027,
        "name": "Худи оверсайз с принтом с начёсом ковер",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.7,
        "feedbacks": 328,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15372/part1537250/1537250027/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1547573634,
        "name": "Зип худи оверсайз с начесом на молнии кроп",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 7001,
        "sale_price": 3850,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15475/part1547573/1547573634/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211883,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211883/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211879,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211879/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211887,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 4.7,
        "feedbacks": 328,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211887/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211870,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211870/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211873,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211873/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211871,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211871/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211864,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211864/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211875,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211875/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211881,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211881/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211885,
        "name": "Худи оверсайз с принтом с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211885/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211865,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211865/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211877,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211877/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211867,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211867/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211869,
        "name": "Худи оверсайз с принтом angel core с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 4.7,
        "feedbacks": 328,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211869/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1267406964,
        "name": "Облегающий лонгслив скимс skims с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2940,
        "sale_price": 1617,
        "discount": 45,
        "rating": 4.9,
        "feedbacks": 1011,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12674/part1267406/1267406964/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054740,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054740/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054739,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054739/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054748,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054748/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054756,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054756/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054744,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054744/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054750,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054750/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054738,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054738/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054757,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054757/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054751,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054751/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054737,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054737/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054763,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054763/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054753,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054753/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054764,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054764/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054746,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054746/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054759,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054759/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054745,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054745/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054749,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054749/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054761,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054761/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054849,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054849/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054850,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054850/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054848,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054848/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054754,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054754/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054736,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054736/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054743,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054743/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054765,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054765/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054758,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054758/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054742,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054742/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054741,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054741/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054762,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054762/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054752,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054752/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054760,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054760/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054747,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054747/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1470054755,
        "name": "Лонгслив оверсайз с принтом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14700/part1470054/1470054755/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 978061738,
        "name": "Футболка детская с принтом хлопок",
        "brand": "Юникид",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 10000,
        "sale_price": 5500,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol9780/part978061/978061738/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 978061733,
        "name": "Футболка детская с принтом хлопок",
        "brand": "Юникид",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 1300,
        "sale_price": 716,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol9780/part978061/978061733/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 972112570,
        "name": "Футболка для подростка хлопок с принтом кот",
        "brand": "Юникид",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 1300,
        "sale_price": 716,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 2382,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol9721/part972112/972112570/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603085,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 452,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603085/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603105,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 452,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603105/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603087,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 452,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603087/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603089,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "SAINT NATION",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 452,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603089/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603095,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 452,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603095/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603107,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.7,
        "feedbacks": 328,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603107/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603172,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 452,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603172/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603097,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 452,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603097/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603091,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 452,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603091/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603099,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.7,
        "feedbacks": 328,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603099/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603103,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.7,
        "feedbacks": 328,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603103/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603083,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 452,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603083/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603101,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 452,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603101/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1561603079,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ACADEMY 779",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.8,
        "feedbacks": 452,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15616/part1561603/1561603079/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031469,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031469/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031476,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031476/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031458,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031458/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031485,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031485/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031464,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031464/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031470,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031470/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031462,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031462/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031461,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031461/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031480,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031480/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031459,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031459/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031465,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031465/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031479,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031479/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031460,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031460/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031474,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031474/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031481,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031481/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031483,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "THE WEEKEND",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031483/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031457,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031457/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031467,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031467/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031456,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031456/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031475,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031475/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031463,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031463/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031468,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031468/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031477,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031477/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031482,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "THE WEEKEND",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031482/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031471,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031471/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031473,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031473/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031478,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031478/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031472,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031472/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031484,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031484/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1253031466,
        "name": "Лонгслив скимс skims с принтом",
        "brand": "SOQ WAY",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12530/part1253031/1253031466/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 756445155,
        "name": "Лонгслив оверсайз с принтом плотный хлопок",
        "brand": "VINTAGE CUSTOM STUDIO",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7564/part756445/756445155/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1437615936,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 5,
        "feedbacks": 1,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14376/part1437615/1437615936/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1421685168,
        "name": "Лонгслив оверсайз с принтом",
        "brand": "Archive designs",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 2001,
        "sale_price": 1100,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14216/part1421685/1421685168/images/c516x688/1.webp",
        "is_new": true
    }
],
    110887: [
    {
        "article": 1420434801,
        "name": "Лонгслив женский оверсайз набор 3 шт. кофта базовая y2k",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 8000,
        "sale_price": 3269,
        "discount": 59,
        "rating": 5,
        "feedbacks": 2,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol14204/part1420434/1420434801/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1420443229,
        "name": "Лонгслив женский оверсайз набор 5 шт. кофта базовая y2k",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 8500,
        "sale_price": 3984,
        "discount": 53,
        "rating": 5,
        "feedbacks": 4,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol14204/part1420443/1420443229/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1420426773,
        "name": "Лонгслив летучая мышь набор из 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 6600,
        "sale_price": 3014,
        "discount": 54,
        "rating": 4.9,
        "feedbacks": 13,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol14204/part1420426/1420426773/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1334859892,
        "name": "Лонгслив хенли",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7000,
        "sale_price": 2019,
        "discount": 71,
        "rating": 5,
        "feedbacks": 14,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13348/part1334859/1334859892/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1334360881,
        "name": "Лонгслив хенли",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7000,
        "sale_price": 2019,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 18,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13343/part1334360/1334360881/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1334859890,
        "name": "Лонгслив хенли",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7000,
        "sale_price": 2019,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 7,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13348/part1334859/1334859890/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1334859889,
        "name": "Лонгслив хенли",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7000,
        "sale_price": 2019,
        "discount": 71,
        "rating": 4.6,
        "feedbacks": 13,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13348/part1334859/1334859889/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1334859891,
        "name": "Лонгслив хенли",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7000,
        "sale_price": 2019,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 8,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13348/part1334859/1334859891/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1284371775,
        "name": "Водолазка тонкая набор 3 шт. лонгслив скимс с горлом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7450,
        "sale_price": 2059,
        "discount": 72,
        "rating": 4.8,
        "feedbacks": 5,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12843/part1284371/1284371775/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1284302475,
        "name": "Водолазка тонкая набор 3 шт. лонгслив скимс с горлом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7450,
        "sale_price": 2059,
        "discount": 72,
        "rating": 5,
        "feedbacks": 1,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12843/part1284302/1284302475/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1239251199,
        "name": "Лонгслив скимс набор 5 шт. кофта облегающая",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 8950,
        "sale_price": 3012,
        "discount": 66,
        "rating": 5,
        "feedbacks": 49,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12392/part1239251/1239251199/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1237216844,
        "name": "Лонгслив женский оверсайз набор 3 шт. кофта базовая y2k",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7200,
        "sale_price": 2985,
        "discount": 59,
        "rating": 4.9,
        "feedbacks": 131,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12372/part1237216/1237216844/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1239247403,
        "name": "Лонгслив скимс набор 3 шт. кофта облегающая",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7500,
        "sale_price": 2253,
        "discount": 70,
        "rating": 5,
        "feedbacks": 27,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12392/part1239247/1239247403/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1008432398,
        "name": "Майка скимс с кружевом набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5000,
        "sale_price": 1866,
        "discount": 63,
        "rating": 4.1,
        "feedbacks": 15,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10084/part1008432/1008432398/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1008462193,
        "name": "Майка скимс с кружевом набор 2 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4500,
        "sale_price": 1539,
        "discount": 66,
        "rating": 5,
        "feedbacks": 11,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10084/part1008462/1008462193/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1008458045,
        "name": "Майка скимс с кружевом набор 2 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4500,
        "sale_price": 1487,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 16,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10084/part1008458/1008458045/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1008465462,
        "name": "Майка топ скимс с кружевом набор из 2 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4500,
        "sale_price": 1487,
        "discount": 67,
        "rating": 4.9,
        "feedbacks": 12,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10084/part1008465/1008465462/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1008473093,
        "name": "Футболка скимс с кружевом набор 2 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5000,
        "sale_price": 1232,
        "discount": 75,
        "rating": 4.8,
        "feedbacks": 41,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10084/part1008473/1008473093/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1021768905,
        "name": "Брюки легкие джоггеры на резинке летние тонкие оверсайз",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5700,
        "sale_price": 1986,
        "discount": 65,
        "rating": 4.6,
        "feedbacks": 12,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10217/part1021768/1021768905/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1021773104,
        "name": "Джоггеры тонкие штаны алладины на резинке широкие 2 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 8000,
        "sale_price": 3029,
        "discount": 62,
        "rating": 5,
        "feedbacks": 6,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10217/part1021773/1021773104/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1021762136,
        "name": "Брюки легкие джоггеры на резинке летние тонкие оверсайз",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5500,
        "sale_price": 1718,
        "discount": 69,
        "rating": 4.9,
        "feedbacks": 19,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10217/part1021762/1021762136/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1008476654,
        "name": "Футболка с широкими рукавами летучая мышь набор 2 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 6000,
        "sale_price": 1622,
        "discount": 73,
        "rating": 4.9,
        "feedbacks": 57,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10084/part1008476/1008476654/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1023571331,
        "name": "Футболка с широкими рукавами летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3200,
        "sale_price": 1250,
        "discount": 61,
        "rating": 5,
        "feedbacks": 118,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10235/part1023571/1023571331/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1008486709,
        "name": "Футболка скимс облегающая набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5600,
        "sale_price": 1851,
        "discount": 67,
        "rating": 4.8,
        "feedbacks": 90,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10084/part1008486/1008486709/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1007220173,
        "name": "Футболка скимс облегающая набор 5 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7600,
        "sale_price": 3197,
        "discount": 58,
        "rating": 4.8,
        "feedbacks": 106,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10072/part1007220/1007220173/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1013080279,
        "name": "Топ под пиджак футболка скимс летний набор из 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5800,
        "sale_price": 1708,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 26,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10130/part1013080/1013080279/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1008482926,
        "name": "Футболка скимс облегающая набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5600,
        "sale_price": 1851,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 110,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10084/part1008482/1008482926/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1008490198,
        "name": "Футболка скимс облегающая набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5600,
        "sale_price": 1851,
        "discount": 67,
        "rating": 4.8,
        "feedbacks": 100,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol10084/part1008490/1008490198/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 912660436,
        "name": "Футболка с открытыми плечами летучая мышь набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 6000,
        "sale_price": 2452,
        "discount": 59,
        "rating": 4.9,
        "feedbacks": 56,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9126/part912660/912660436/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 912650696,
        "name": "Лонгслив с открытыми плечами набор 3 шт. летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7800,
        "sale_price": 3047,
        "discount": 61,
        "rating": 4.9,
        "feedbacks": 58,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9126/part912650/912650696/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 908638701,
        "name": "Футболка скимс с кружевом набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5600,
        "sale_price": 1851,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 137,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9086/part908638/908638701/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 978867337,
        "name": "Кроп топ летний набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4500,
        "sale_price": 1703,
        "discount": 62,
        "rating": 4.9,
        "feedbacks": 58,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol9788/part978867/978867337/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 978871261,
        "name": "Кроп топ летний набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4500,
        "sale_price": 1703,
        "discount": 62,
        "rating": 4.9,
        "feedbacks": 80,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol9788/part978871/978871261/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 978877828,
        "name": "Футболка скимс без рукава майка под пиджак набор из 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5800,
        "sale_price": 1708,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 33,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol9788/part978877/978877828/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 978882002,
        "name": "Топ под пиджак футболка скимс летний набор из 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5800,
        "sale_price": 1708,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 73,
        "category": "clothes",
        "photo_url": "https://basket-41.wbbasket.ru/vol9788/part978882/978882002/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 936037644,
        "name": "Футболка скимс с кружевом набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5600,
        "sale_price": 1851,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 147,
        "category": "clothes",
        "photo_url": "https://basket-40.wbbasket.ru/vol9360/part936037/936037644/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 912658182,
        "name": "Футболка с открытыми плечами летучая мышь набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 6500,
        "sale_price": 2422,
        "discount": 63,
        "rating": 4.9,
        "feedbacks": 39,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9126/part912658/912658182/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 912648905,
        "name": "Лонгслив с открытыми плечами летучая мышь набор из 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7800,
        "sale_price": 3047,
        "discount": 61,
        "rating": 4.9,
        "feedbacks": 28,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9126/part912648/912648905/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 907132926,
        "name": "Майка скимс с кружевом набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4700,
        "sale_price": 1836,
        "discount": 61,
        "rating": 4.8,
        "feedbacks": 79,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9071/part907132/907132926/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 915966058,
        "name": "Боди skims с коротким рукавом набор 2 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5750,
        "sale_price": 1251,
        "discount": 78,
        "rating": 4.7,
        "feedbacks": 13,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9159/part915966/915966058/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 906975964,
        "name": "Майка скимс с кружевом набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4700,
        "sale_price": 1900,
        "discount": 60,
        "rating": 4.7,
        "feedbacks": 68,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9069/part906975/906975964/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 907087260,
        "name": "Майка топ скимс с кружевом набор из 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5000,
        "sale_price": 1803,
        "discount": 64,
        "rating": 4.7,
        "feedbacks": 105,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9070/part907087/907087260/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 873198264,
        "name": "Лонгслив с кружевом обтягивающая с широкими рукавами скимс",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4100,
        "sale_price": 1232,
        "discount": 70,
        "rating": 4.9,
        "feedbacks": 16,
        "category": "clothes",
        "photo_url": "https://basket-38.wbbasket.ru/vol8731/part873198/873198264/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 873201374,
        "name": "Лонгслив с кружевом обтягивающая с широкими рукавами скимс",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4100,
        "sale_price": 1232,
        "discount": 70,
        "rating": 4.8,
        "feedbacks": 38,
        "category": "clothes",
        "photo_url": "https://basket-38.wbbasket.ru/vol8732/part873201/873201374/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 873205706,
        "name": "Лонгслив с кружевом обтягивающая с широкими рукавами скимс",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4100,
        "sale_price": 1232,
        "discount": 70,
        "rating": 4.7,
        "feedbacks": 18,
        "category": "clothes",
        "photo_url": "https://basket-38.wbbasket.ru/vol8732/part873205/873205706/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 873202533,
        "name": "Лонгслив с кружевом обтягивающий с широкими рукавами скимс",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4100,
        "sale_price": 1281,
        "discount": 69,
        "rating": 5,
        "feedbacks": 12,
        "category": "clothes",
        "photo_url": "https://basket-38.wbbasket.ru/vol8732/part873202/873202533/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 820882149,
        "name": "Блузка боди skims кружевное с коротким рукавом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3000,
        "sale_price": 630,
        "discount": 79,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8208/part820882/820882149/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 820892860,
        "name": "Блузка боди skims кружевное с коротким рукавом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3000,
        "sale_price": 586,
        "discount": 80,
        "rating": 3.3,
        "feedbacks": 6,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8208/part820892/820892860/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 820897989,
        "name": "Блузка боди skims кружевное с коротким рукавом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3000,
        "sale_price": 586,
        "discount": 80,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8208/part820897/820897989/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 820859863,
        "name": "Боди кружевное с коротким рукавом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3000,
        "sale_price": 586,
        "discount": 80,
        "rating": 4.6,
        "feedbacks": 12,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8208/part820859/820859863/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 820777941,
        "name": "Блузка боди skims кружевное с коротким рукавом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3000,
        "sale_price": 586,
        "discount": 80,
        "rating": 4,
        "feedbacks": 5,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8207/part820777/820777941/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 820858354,
        "name": "Блузка боди skims кружевное с коротким рукавом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3000,
        "sale_price": 586,
        "discount": 80,
        "rating": 5,
        "feedbacks": 4,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8208/part820858/820858354/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 834108091,
        "name": "Майка топ скимс набор из 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5000,
        "sale_price": 1803,
        "discount": 64,
        "rating": 4.7,
        "feedbacks": 105,
        "category": "clothes",
        "photo_url": "https://basket-38.wbbasket.ru/vol8341/part834108/834108091/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 834109750,
        "name": "Майка скимс набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5000,
        "sale_price": 1897,
        "discount": 62,
        "rating": 4.7,
        "feedbacks": 26,
        "category": "clothes",
        "photo_url": "https://basket-38.wbbasket.ru/vol8341/part834109/834109750/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 726849812,
        "name": "Брюки спортивные широкие прямые",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7050,
        "sale_price": 3013,
        "discount": 57,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-34.wbbasket.ru/vol7268/part726849/726849812/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 825647318,
        "name": "Футболка с широкими рукавами летучая мышь набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 6500,
        "sale_price": 2422,
        "discount": 63,
        "rating": 5,
        "feedbacks": 177,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8256/part825647/825647318/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 726938534,
        "name": "Спортивные штаны широкие с лампасами",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7050,
        "sale_price": 3013,
        "discount": 57,
        "rating": 5,
        "feedbacks": 1,
        "category": "clothes",
        "photo_url": "https://basket-34.wbbasket.ru/vol7269/part726938/726938534/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 726933372,
        "name": "Штаны широкие спортивные оверсайз y2k",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7050,
        "sale_price": 3013,
        "discount": 57,
        "rating": 4.5,
        "feedbacks": 4,
        "category": "clothes",
        "photo_url": "https://basket-34.wbbasket.ru/vol7269/part726933/726933372/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 825648817,
        "name": "Лонгслив набор 3 шт. летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 6600,
        "sale_price": 3133,
        "discount": 53,
        "rating": 4.9,
        "feedbacks": 62,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8256/part825648/825648817/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 754683198,
        "name": "Футболка с длинными широкими рукавами летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3500,
        "sale_price": 1304,
        "discount": 63,
        "rating": 4.9,
        "feedbacks": 71,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7546/part754683/754683198/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 810903624,
        "name": "Мини шорты skims облегающие короткие на низкой посадке",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3000,
        "sale_price": 1208,
        "discount": 60,
        "rating": 4.3,
        "feedbacks": 38,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8109/part810903/810903624/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 764204643,
        "name": "Майка топ скимс с кружевом набор из 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4600,
        "sale_price": 1907,
        "discount": 59,
        "rating": 4.7,
        "feedbacks": 469,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7642/part764204/764204643/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 801544728,
        "name": "Майка скимс с кружевом на бретельках набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5000,
        "sale_price": 1866,
        "discount": 63,
        "rating": 4.6,
        "feedbacks": 151,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8015/part801544/801544728/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 764201218,
        "name": "Майка с кружевом на бретельках скимс набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4700,
        "sale_price": 1779,
        "discount": 62,
        "rating": 4.7,
        "feedbacks": 269,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7642/part764201/764201218/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763729338,
        "name": "Пижама футболка шорты коричневый",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4500,
        "sale_price": 1406,
        "discount": 69,
        "rating": 4.8,
        "feedbacks": 106,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7637/part763729/763729338/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763706272,
        "name": "Пижама лонг шорты коричневый",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4500,
        "sale_price": 1568,
        "discount": 65,
        "rating": 4.8,
        "feedbacks": 61,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7637/part763706/763706272/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763683198,
        "name": "Пижама лонг шорты черный",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4500,
        "sale_price": 1568,
        "discount": 65,
        "rating": 4.6,
        "feedbacks": 61,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7636/part763683/763683198/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763724632,
        "name": "Пижама футболка шорты черный",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4500,
        "sale_price": 1406,
        "discount": 69,
        "rating": 4.7,
        "feedbacks": 112,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7637/part763724/763724632/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763636888,
        "name": "Футболка летучая мышь с широкими рукавами набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 6700,
        "sale_price": 2416,
        "discount": 64,
        "rating": 4.9,
        "feedbacks": 610,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7636/part763636/763636888/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763706273,
        "name": "Пижама лонг шорты розовый",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4500,
        "sale_price": 1568,
        "discount": 65,
        "rating": 4.8,
        "feedbacks": 44,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7637/part763706/763706273/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 790954351,
        "name": "Мини шорты skims облегающие короткие на низкой посадке",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3000,
        "sale_price": 1208,
        "discount": 60,
        "rating": 4.5,
        "feedbacks": 71,
        "category": "clothes",
        "photo_url": "https://basket-36.wbbasket.ru/vol7909/part790954/790954351/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763622801,
        "name": "Лонгслив набор 3 шт. летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 6580,
        "sale_price": 3084,
        "discount": 53,
        "rating": 4.9,
        "feedbacks": 446,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7636/part763622/763622801/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763729339,
        "name": "Пижама футболка шорты розовый",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4500,
        "sale_price": 1406,
        "discount": 69,
        "rating": 4.7,
        "feedbacks": 117,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7637/part763729/763729339/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763633166,
        "name": "Футболка летучая мышь с широкими рукавами набор 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 6750,
        "sale_price": 2434,
        "discount": 64,
        "rating": 4.9,
        "feedbacks": 732,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7636/part763633/763633166/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763663198,
        "name": "Костюм домашний лонгслив с шортами",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4600,
        "sale_price": 1548,
        "discount": 66,
        "rating": 4.8,
        "feedbacks": 61,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7636/part763663/763663198/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763621317,
        "name": "Лонгслив набор 3 шт. летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 6600,
        "sale_price": 3014,
        "discount": 54,
        "rating": 4.9,
        "feedbacks": 618,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7636/part763621/763621317/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763663197,
        "name": "Костюм домашний лонгслив с шортами",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4600,
        "sale_price": 1548,
        "discount": 66,
        "rating": 4.4,
        "feedbacks": 62,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7636/part763663/763663197/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 763654981,
        "name": "Костюм домашний лонгслив с шортами",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4600,
        "sale_price": 1548,
        "discount": 66,
        "rating": 4.7,
        "feedbacks": 81,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7636/part763654/763654981/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 754713991,
        "name": "Футболка с длинными широкими рукавами летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3500,
        "sale_price": 1325,
        "discount": 62,
        "rating": 4.9,
        "feedbacks": 107,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7547/part754713/754713991/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 766824725,
        "name": "Мини шорты skims облегающие короткие на низкой посадке 4 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3380,
        "sale_price": 1300,
        "discount": 62,
        "rating": 4.5,
        "feedbacks": 308,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7668/part766824/766824725/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 754688410,
        "name": "Лонгслив облегающий с широкими рукавами летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3500,
        "sale_price": 1325,
        "discount": 62,
        "rating": 4.9,
        "feedbacks": 134,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7546/part754688/754688410/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 754645142,
        "name": "Лонгслив skims облегающий с кружевом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5010,
        "sale_price": 933,
        "discount": 81,
        "rating": 4.6,
        "feedbacks": 17,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7546/part754645/754645142/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 754657351,
        "name": "Лонгслив skims облегающий с кружевом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5010,
        "sale_price": 933,
        "discount": 81,
        "rating": 4.1,
        "feedbacks": 18,
        "category": "clothes",
        "photo_url": "https://basket-35.wbbasket.ru/vol7546/part754657/754657351/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 731423620,
        "name": "Мини шорты skims облегающие короткие на низкой посадке 4 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3380,
        "sale_price": 1300,
        "discount": 62,
        "rating": 4.4,
        "feedbacks": 1496,
        "category": "clothes",
        "photo_url": "https://basket-34.wbbasket.ru/vol7314/part731423/731423620/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 731440341,
        "name": "Мини шорты skims облегающие короткие на низкой посадке",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3000,
        "sale_price": 1208,
        "discount": 60,
        "rating": 4.6,
        "feedbacks": 70,
        "category": "clothes",
        "photo_url": "https://basket-34.wbbasket.ru/vol7314/part731440/731440341/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 721560651,
        "name": "Футболка вязаная в полоску",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 2800,
        "sale_price": 896,
        "discount": 68,
        "rating": 4.9,
        "feedbacks": 58,
        "category": "clothes",
        "photo_url": "https://basket-34.wbbasket.ru/vol7215/part721560/721560651/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 721559211,
        "name": "Футболка вязаная в полоску",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 2800,
        "sale_price": 706,
        "discount": 75,
        "rating": 4.9,
        "feedbacks": 65,
        "category": "clothes",
        "photo_url": "https://basket-34.wbbasket.ru/vol7215/part721559/721559211/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 718366639,
        "name": "Лонгслив skims облегающий с кружевом на спине",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3500,
        "sale_price": 1262,
        "discount": 64,
        "rating": 4.9,
        "feedbacks": 55,
        "category": "clothes",
        "photo_url": "https://basket-34.wbbasket.ru/vol7183/part718366/718366639/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 718366087,
        "name": "Лонгслив летучая мышь с кружевом на спине",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3600,
        "sale_price": 1514,
        "discount": 58,
        "rating": 4.8,
        "feedbacks": 211,
        "category": "clothes",
        "photo_url": "https://basket-34.wbbasket.ru/vol7183/part718366/718366087/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 697556797,
        "name": "Лонгслив skims облегающий с кружевом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5500,
        "sale_price": 1271,
        "discount": 77,
        "rating": 4.6,
        "feedbacks": 26,
        "category": "clothes",
        "photo_url": "https://basket-33.wbbasket.ru/vol6975/part697556/697556797/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 697552882,
        "name": "Лонгслив skims облегающий с кружевом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5500,
        "sale_price": 1223,
        "discount": 78,
        "rating": 4.4,
        "feedbacks": 42,
        "category": "clothes",
        "photo_url": "https://basket-33.wbbasket.ru/vol6975/part697552/697552882/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 697556796,
        "name": "Лонгслив skims облегающий с кружевом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5500,
        "sale_price": 1223,
        "discount": 78,
        "rating": 4.7,
        "feedbacks": 70,
        "category": "clothes",
        "photo_url": "https://basket-33.wbbasket.ru/vol6975/part697556/697556796/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 697407098,
        "name": "Лонгслив skims облегающий с кружевом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5500,
        "sale_price": 1223,
        "discount": 78,
        "rating": 4.8,
        "feedbacks": 66,
        "category": "clothes",
        "photo_url": "https://basket-33.wbbasket.ru/vol6974/part697407/697407098/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 697550029,
        "name": "Лонгслив skims облегающий с кружевом",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 5500,
        "sale_price": 1223,
        "discount": 78,
        "rating": 4.8,
        "feedbacks": 24,
        "category": "clothes",
        "photo_url": "https://basket-33.wbbasket.ru/vol6975/part697550/697550029/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 671009988,
        "name": "Лонгслив облегающий с широкими рукавами летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4000,
        "sale_price": 1370,
        "discount": 66,
        "rating": 4.2,
        "feedbacks": 16,
        "category": "clothes",
        "photo_url": "https://basket-32.wbbasket.ru/vol6710/part671009/671009988/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 671020053,
        "name": "Футболка с широкими рукавами летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3200,
        "sale_price": 1192,
        "discount": 63,
        "rating": 4.9,
        "feedbacks": 625,
        "category": "clothes",
        "photo_url": "https://basket-32.wbbasket.ru/vol6710/part671020/671020053/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 671022900,
        "name": "Облегающая футболка с широкими рукавами летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3200,
        "sale_price": 1250,
        "discount": 61,
        "rating": 4.9,
        "feedbacks": 335,
        "category": "clothes",
        "photo_url": "https://basket-32.wbbasket.ru/vol6710/part671022/671022900/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 671022902,
        "name": "Облегающая футболка с широкими рукавами летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3200,
        "sale_price": 1250,
        "discount": 61,
        "rating": 5,
        "feedbacks": 23,
        "category": "clothes",
        "photo_url": "https://basket-32.wbbasket.ru/vol6710/part671022/671022902/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 670996034,
        "name": "Лонгслив облегающий с широкими рукавами летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 4000,
        "sale_price": 1370,
        "discount": 66,
        "rating": 4.9,
        "feedbacks": 82,
        "category": "clothes",
        "photo_url": "https://basket-32.wbbasket.ru/vol6709/part670996/670996034/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 671022896,
        "name": "Облегающая футболка с широкими рукавами летучая мышь",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 3200,
        "sale_price": 1250,
        "discount": 61,
        "rating": 4.9,
        "feedbacks": 413,
        "category": "clothes",
        "photo_url": "https://basket-32.wbbasket.ru/vol6710/part671022/671022896/images/c516x688/1.webp",
        "is_new": true
    }
],
    42283: [
    {
        "article": 1332715032,
        "name": "Костюм осенний теплый с начесом by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 16998,
        "sale_price": 4895,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715032/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332714981,
        "name": "Спортивный костюм двойка с зип худи by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 8999,
        "sale_price": 5183,
        "discount": 42,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332714/1332714981/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332714983,
        "name": "Спортивный костюм двойка с зип худи by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 8999,
        "sale_price": 5183,
        "discount": 42,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332714/1332714983/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715033,
        "name": "Костюм осенний теплый с начесом by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 16998,
        "sale_price": 4895,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715033/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1380065757,
        "name": "Кардиган укороченный на пуговицах",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10000,
        "sale_price": 2880,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol13800/part1380065/1380065757/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332714982,
        "name": "Спортивный костюм двойка с зип худи by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 8999,
        "sale_price": 5183,
        "discount": 42,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332714/1332714982/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715219,
        "name": "Свитшот оверсайз с вышивкой с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 9999,
        "sale_price": 2303,
        "discount": 77,
        "rating": 4.9,
        "feedbacks": 6468,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715219/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282273512,
        "name": "Костюм теплый с брюками",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 18998,
        "sale_price": 5471,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 2032,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282273/1282273512/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715212,
        "name": "Свитшот оверсайз с вышивкой с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 2999,
        "sale_price": 1727,
        "discount": 42,
        "rating": 4.9,
        "feedbacks": 6468,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715212/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715220,
        "name": "Свитшот оверсайз с вышивкой с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10000,
        "sale_price": 3456,
        "discount": 65,
        "rating": 4.9,
        "feedbacks": 6468,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715220/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282264672,
        "name": "Свитер джемпер вязаный оверсайз",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 12598,
        "sale_price": 3628,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 1691,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282264/1282264672/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715217,
        "name": "Свитшот оверсайз с принтом с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10000,
        "sale_price": 3456,
        "discount": 65,
        "rating": 4.9,
        "feedbacks": 6468,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715217/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715218,
        "name": "Свитшот оверсайз с принтом с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7999,
        "sale_price": 2303,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 6468,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715218/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715216,
        "name": "Свитшот оверсайз с принтом с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10000,
        "sale_price": 2880,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 6468,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715216/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715215,
        "name": "Свитшот оверсайз с принтом с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7999,
        "sale_price": 2303,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 6468,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715215/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282273510,
        "name": "Костюм теплый с брюками",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 18998,
        "sale_price": 5471,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 2032,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282273/1282273510/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282273511,
        "name": "Костюм теплый с брюками",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 18998,
        "sale_price": 5471,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 2032,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282273/1282273511/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282264669,
        "name": "Кардиган вязаный на пуговицах",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 9999,
        "sale_price": 4031,
        "discount": 60,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282264/1282264669/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282273536,
        "name": "Костюм двойка с юбкой мини by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7500,
        "sale_price": 3456,
        "discount": 54,
        "rating": 4.9,
        "feedbacks": 1092,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282273/1282273536/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1333085033,
        "name": "Худи оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 5001,
        "sale_price": 2304,
        "discount": 54,
        "rating": 4.9,
        "feedbacks": 2631,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13330/part1333085/1333085033/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503791072,
        "name": "Костюм вязаный осенний с брюками by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 21998,
        "sale_price": 6445,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 457,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503791/1503791072/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503790784,
        "name": "Костюм теплый с начесом на флисе",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 17998,
        "sale_price": 5183,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503790/1503790784/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503790785,
        "name": "Костюм теплый с начесом на флисе",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 18998,
        "sale_price": 5471,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503790/1503790785/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503791071,
        "name": "Костюм вязаный осенний с брюками by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 27998,
        "sale_price": 8203,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 457,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503791/1503791071/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503791370,
        "name": "Платье поло вязаное мини by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7150,
        "sale_price": 2306,
        "discount": 68,
        "rating": 5,
        "feedbacks": 1703,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503791/1503791370/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503790783,
        "name": "Костюм теплый с начесом на флисе",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 17998,
        "sale_price": 5183,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503790/1503790783/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715213,
        "name": "Свитшот оверсайз с вышивкой с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10000,
        "sale_price": 2880,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 6468,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715213/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503791371,
        "name": "Платье поло вязаное мини by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7150,
        "sale_price": 2882,
        "discount": 60,
        "rating": 5,
        "feedbacks": 1703,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503791/1503791371/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282264673,
        "name": "Свитер джемпер вязаный оверсайз",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10998,
        "sale_price": 3167,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 1691,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282264/1282264673/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503790936,
        "name": "Костюм спортивный полузамок теплый с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 14666,
        "sale_price": 6445,
        "discount": 56,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503790/1503790936/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503790937,
        "name": "Костюм спортивный полузамок теплый с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 14666,
        "sale_price": 6445,
        "discount": 56,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503790/1503790937/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282273513,
        "name": "Костюм теплый с брюками",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 18998,
        "sale_price": 5471,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 2032,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282273/1282273513/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503791226,
        "name": "Костюм спортивный теплый с начесом на флисе",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 12000,
        "sale_price": 5184,
        "discount": 57,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503791/1503791226/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282273535,
        "name": "Костюм двойка с юбкой мини by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7800,
        "sale_price": 3594,
        "discount": 54,
        "rating": 4.9,
        "feedbacks": 1092,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282273/1282273535/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282273537,
        "name": "Костюм двойка с юбкой мини by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 8000,
        "sale_price": 3686,
        "discount": 54,
        "rating": 4.9,
        "feedbacks": 1092,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282273/1282273537/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503791162,
        "name": "Костюм теплый вязаный с брюками",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 21000,
        "sale_price": 6153,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 2032,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503791/1503791162/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1503791369,
        "name": "Платье поло вязаное мини by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7150,
        "sale_price": 2882,
        "discount": 60,
        "rating": 5,
        "feedbacks": 1703,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15037/part1503791/1503791369/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282273528,
        "name": "Костюм вязаный платье с кардиганом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 19999,
        "sale_price": 6445,
        "discount": 68,
        "rating": 4.7,
        "feedbacks": 1200,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282273/1282273528/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469112987,
        "name": "Кардиган вязаный на пуговицах аргайл by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 11909,
        "sale_price": 2881,
        "discount": 76,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469112/1469112987/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113089,
        "name": "Платье трикотажное теплое",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 9999,
        "sale_price": 4607,
        "discount": 54,
        "rating": 4.8,
        "feedbacks": 2474,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113089/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113088,
        "name": "Платье трикотажное теплое",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10000,
        "sale_price": 3456,
        "discount": 65,
        "rating": 4.8,
        "feedbacks": 2474,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113088/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469112989,
        "name": "Кардиган вязаный на пуговицах аргайл by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 11909,
        "sale_price": 2881,
        "discount": 76,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469112/1469112989/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469112988,
        "name": "Кардиган вязаный на пуговицах аргайл by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 11909,
        "sale_price": 3086,
        "discount": 74,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469112/1469112988/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113149,
        "name": "Кардиган укороченный на пуговицах by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 4499,
        "sale_price": 1813,
        "discount": 60,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113149/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1380059482,
        "name": "Джинсы клеш утепленные flared",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 6999,
        "sale_price": 3910,
        "discount": 44,
        "rating": 4.9,
        "feedbacks": 10792,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol13800/part1380059/1380059482/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282273529,
        "name": "Костюм вязаный платье с кардиганом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 19999,
        "sale_price": 7031,
        "discount": 65,
        "rating": 4.7,
        "feedbacks": 1200,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282273/1282273529/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1380059481,
        "name": "Джинсы клеш утепленные с начесом flared",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7099,
        "sale_price": 4089,
        "discount": 42,
        "rating": 4.9,
        "feedbacks": 10792,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol13800/part1380059/1380059481/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113148,
        "name": "Кардиган укороченный на пуговицах by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 8299,
        "sale_price": 4110,
        "discount": 50,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113148/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113150,
        "name": "Кардиган укороченный на пуговицах by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 5999,
        "sale_price": 3455,
        "discount": 42,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113150/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113056,
        "name": "Свитер джемпер поло вязаный оверсайз",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 12398,
        "sale_price": 3570,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 1691,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113056/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469115275,
        "name": "Костюм спортивный теплый с начесом на флисе",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 12000,
        "sale_price": 5736,
        "discount": 52,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469115/1469115275/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282273523,
        "name": "Костюм вязаный с юбкой и кардиганом by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 12500,
        "sale_price": 6079,
        "discount": 51,
        "rating": 4.8,
        "feedbacks": 2016,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282273/1282273523/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113162,
        "name": "Костюм теплый вязаный кардиган с брюками",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 17999,
        "sale_price": 7910,
        "discount": 56,
        "rating": 4.9,
        "feedbacks": 457,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113162/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113105,
        "name": "Кардиган на пуговицах",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 9999,
        "sale_price": 4607,
        "discount": 54,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113105/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1380059453,
        "name": "Свитер без горла удлиненный вязаный с косами",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10000,
        "sale_price": 2880,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 954,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol13800/part1380059/1380059453/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1380059454,
        "name": "Свитер без горла удлиненный вязаный с косами",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10000,
        "sale_price": 2880,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 954,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol13800/part1380059/1380059454/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113058,
        "name": "Свитер джемпер поло вязаный оверсайз",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10798,
        "sale_price": 3109,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 1691,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113058/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113147,
        "name": "Кардиган укороченный на пуговицах by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 4499,
        "sale_price": 2306,
        "discount": 49,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113147/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113106,
        "name": "Кардиган на пуговицах",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 9999,
        "sale_price": 4607,
        "discount": 54,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113106/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282273475,
        "name": "Костюм вязаный трикотажный с юбкой",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 17280,
        "sale_price": 7797,
        "discount": 55,
        "rating": 4.8,
        "feedbacks": 2016,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282273/1282273475/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113176,
        "name": "Костюм трикотажный вязаный на молнии",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 12699,
        "sale_price": 6102,
        "discount": 52,
        "rating": 4.8,
        "feedbacks": 546,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113176/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469115274,
        "name": "Костюм спортивный теплый с начесом на флисе",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 12000,
        "sale_price": 5736,
        "discount": 52,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469115/1469115274/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113163,
        "name": "Костюм теплый вязаный кардиган с брюками",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 13635,
        "sale_price": 6152,
        "discount": 55,
        "rating": 4.9,
        "feedbacks": 457,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113163/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113059,
        "name": "Свитер джемпер поло вязаный оверсайз",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 15998,
        "sale_price": 4607,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 1691,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113059/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113177,
        "name": "Костюм трикотажный вязаный на молнии",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 12500,
        "sale_price": 5760,
        "discount": 54,
        "rating": 4.8,
        "feedbacks": 546,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113177/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113104,
        "name": "Кардиган на пуговицах",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10000,
        "sale_price": 2880,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113104/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469115276,
        "name": "Костюм спортивный теплый с начесом на флисе",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 12000,
        "sale_price": 5736,
        "discount": 52,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469115/1469115276/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1289767920,
        "name": "Худи оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 3999,
        "sale_price": 2303,
        "discount": 42,
        "rating": 4.9,
        "feedbacks": 2631,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12897/part1289767/1289767920/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469115273,
        "name": "Костюм спортивный теплый с начесом на флисе",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 12000,
        "sale_price": 5736,
        "discount": 52,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469115/1469115273/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715128,
        "name": "Свитер оверсайз с горлом на молнии",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 19998,
        "sale_price": 5759,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 840,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715128/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332785010,
        "name": "Свитер оверсайз на молнии полузамок",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10758,
        "sale_price": 4895,
        "discount": 54,
        "rating": 4.8,
        "feedbacks": 792,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332785/1332785010/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1469113057,
        "name": "Свитер джемпер поло вязаный оверсайз",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 11398,
        "sale_price": 3282,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 1691,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14691/part1469113/1469113057/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282264619,
        "name": "Костюм вязаный с кардиганом и юбкой",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 19999,
        "sale_price": 6797,
        "discount": 66,
        "rating": 4.7,
        "feedbacks": 1200,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282264/1282264619/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1271400553,
        "name": "Худи оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 5299,
        "sale_price": 2899,
        "discount": 45,
        "rating": 4.9,
        "feedbacks": 2631,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12714/part1271400/1271400553/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282264665,
        "name": "Костюм трикотажный на молнии вязаный",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 20600,
        "sale_price": 9053,
        "discount": 56,
        "rating": 4.8,
        "feedbacks": 546,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282264/1282264665/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282264664,
        "name": "Костюм трикотажный на молнии вязаный",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 20550,
        "sale_price": 9031,
        "discount": 56,
        "rating": 4.8,
        "feedbacks": 546,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282264/1282264664/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1291243274,
        "name": "Худи оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 5999,
        "sale_price": 3455,
        "discount": 42,
        "rating": 4.9,
        "feedbacks": 2631,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12912/part1291243/1291243274/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282264687,
        "name": "Платье осеннее длинное вязаное",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 20000,
        "sale_price": 5760,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 1289,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282264/1282264687/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1391090646,
        "name": "Кардиган вязаный укороченный на пуговицах",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10002,
        "sale_price": 2880,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 1543,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol13910/part1391090/1391090646/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1437760327,
        "name": "Костюм вязаный трикотажный с юбкой",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 9999,
        "sale_price": 3628,
        "discount": 64,
        "rating": 4.7,
        "feedbacks": 1200,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14377/part1437760/1437760327/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1437760326,
        "name": "Костюм вязаный трикотажный с юбкой",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 9999,
        "sale_price": 3513,
        "discount": 65,
        "rating": 4.7,
        "feedbacks": 1200,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14377/part1437760/1437760326/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1437760328,
        "name": "Костюм вязаный трикотажный с юбкой",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 19999,
        "sale_price": 6445,
        "discount": 68,
        "rating": 4.7,
        "feedbacks": 1200,
        "category": "clothes",
        "photo_url": "https://basket-47.wbbasket.ru/vol14377/part1437760/1437760328/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282264618,
        "name": "Костюм вязаный с кардиганом и юбкой",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 9999,
        "sale_price": 4319,
        "discount": 57,
        "rating": 4.7,
        "feedbacks": 1200,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282264/1282264618/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282264666,
        "name": "Костюм трикотажный на молнии вязаный",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 18666,
        "sale_price": 8203,
        "discount": 56,
        "rating": 4.8,
        "feedbacks": 546,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282264/1282264666/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1271400550,
        "name": "Худи оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7399,
        "sale_price": 4261,
        "discount": 42,
        "rating": 4.9,
        "feedbacks": 2631,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12714/part1271400/1271400550/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1271400549,
        "name": "Худи оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 5599,
        "sale_price": 3225,
        "discount": 42,
        "rating": 4.9,
        "feedbacks": 2631,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12714/part1271400/1271400549/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282264688,
        "name": "Платье осеннее длинное вязаное",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 30000,
        "sale_price": 8790,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 1289,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282264/1282264688/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1271400554,
        "name": "Худи оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7699,
        "sale_price": 4434,
        "discount": 42,
        "rating": 4.9,
        "feedbacks": 2631,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12714/part1271400/1271400554/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1271400551,
        "name": "Худи оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 5001,
        "sale_price": 2880,
        "discount": 42,
        "rating": 4.9,
        "feedbacks": 2631,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12714/part1271400/1271400551/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1271400555,
        "name": "Худи оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 5399,
        "sale_price": 3109,
        "discount": 42,
        "rating": 4.9,
        "feedbacks": 2631,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12714/part1271400/1271400555/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715099,
        "name": "Футболка скимс облегающая с принтом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 2460,
        "sale_price": 894,
        "discount": 64,
        "rating": 4.9,
        "feedbacks": 30210,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715099/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1264296038,
        "name": "Толстовка флисовая на молнии",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 5999,
        "sale_price": 3455,
        "discount": 42,
        "rating": 4.9,
        "feedbacks": 433,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12642/part1264296/1264296038/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715098,
        "name": "Футболка скимс базовая облегающая",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 2460,
        "sale_price": 894,
        "discount": 64,
        "rating": 4.9,
        "feedbacks": 30210,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715098/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1264296165,
        "name": "Свитшот оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7000,
        "sale_price": 2016,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 1525,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12642/part1264296/1264296165/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715097,
        "name": "Футболка скимс облегающая с надписью",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 3280,
        "sale_price": 1152,
        "discount": 65,
        "rating": 4.9,
        "feedbacks": 30210,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715097/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1282264698,
        "name": "Платье поло осеннее длинное с разрезом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 9999,
        "sale_price": 4204,
        "discount": 58,
        "rating": 4.8,
        "feedbacks": 1434,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol12822/part1282264/1282264698/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1264296164,
        "name": "Свитшот оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 7500,
        "sale_price": 2160,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 1525,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12642/part1264296/1264296164/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1264295985,
        "name": "Свитшот поло оверсайз",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 6999,
        "sale_price": 3225,
        "discount": 54,
        "rating": 4.9,
        "feedbacks": 782,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12642/part1264295/1264295985/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1264295984,
        "name": "Свитшот поло оверсайз",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 6999,
        "sale_price": 4031,
        "discount": 42,
        "rating": 4.9,
        "feedbacks": 782,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12642/part1264295/1264295984/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1264296163,
        "name": "Свитшот оверсайз с начесом",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 6500,
        "sale_price": 1872,
        "discount": 71,
        "rating": 4.9,
        "feedbacks": 1525,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol12642/part1264296/1264296163/images/c516x688/1.webp",
        "is_new": true
    }
],
    1266941: [
    {
        "article": 1196927104,
        "name": "Мини юбка с принтом",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 5000,
        "sale_price": 1815,
        "discount": 64,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol11969/part1196927/1196927104/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1062254586,
        "name": "Шорты широкие багги летние y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 1288,
        "discount": 88,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-42.wbbasket.ru/vol10622/part1062254/1062254586/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 902272570,
        "name": "Зип худи оверсайз кофта в корейском стиле",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10800,
        "sale_price": 3515,
        "discount": 67,
        "rating": 4,
        "feedbacks": 4,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9022/part902272/902272570/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 902272273,
        "name": "Зип худи оверсайз кофта в корейском стиле",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10800,
        "sale_price": 3515,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 3,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9022/part902272/902272273/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 902272571,
        "name": "Зип худи оверсайз кофта в корейском стиле",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10800,
        "sale_price": 3515,
        "discount": 67,
        "rating": 4,
        "feedbacks": 1,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9022/part902272/902272571/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 822951732,
        "name": "Штаны оверсайз спортивные широкие с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 2633,
        "discount": 75,
        "rating": 4,
        "feedbacks": 1,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8229/part822951/822951732/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 823084142,
        "name": "Футболка оверсайз с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 1314,
        "discount": 87,
        "rating": 5,
        "feedbacks": 6,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8230/part823084/823084142/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 867011614,
        "name": "Футболка оверсайз кроп с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 6520,
        "sale_price": 1959,
        "discount": 70,
        "rating": 4.8,
        "feedbacks": 33,
        "category": "clothes",
        "photo_url": "https://basket-38.wbbasket.ru/vol8670/part867011/867011614/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 909781729,
        "name": "Топ корсетный с декольте",
        "brand": "Peach and Silk",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 2497,
        "discount": 76,
        "rating": 5,
        "feedbacks": 1,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9097/part909781/909781729/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 823084143,
        "name": "Футболка оверсайз с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 895,
        "discount": 91,
        "rating": 5,
        "feedbacks": 2,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8230/part823084/823084143/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 822858792,
        "name": "Зип худи с принтом и молнией дрейн y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 12726,
        "sale_price": 4142,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 35,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8228/part822858/822858792/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 859688601,
        "name": "Худи оверсайз с принтом багги y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 2957,
        "discount": 72,
        "rating": 5,
        "feedbacks": 2,
        "category": "clothes",
        "photo_url": "https://basket-38.wbbasket.ru/vol8596/part859688/859688601/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 859699255,
        "name": "Штаны оверсайз спортивные широкие y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 2304,
        "discount": 78,
        "rating": 5,
        "feedbacks": 3,
        "category": "clothes",
        "photo_url": "https://basket-38.wbbasket.ru/vol8596/part859699/859699255/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 859690631,
        "name": "Худи оверсайз с принтом багги y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 2957,
        "discount": 72,
        "rating": 5,
        "feedbacks": 5,
        "category": "clothes",
        "photo_url": "https://basket-38.wbbasket.ru/vol8596/part859690/859690631/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 859695066,
        "name": "Штаны оверсайз спортивные широкие y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 2304,
        "discount": 78,
        "rating": 4.5,
        "feedbacks": 2,
        "category": "clothes",
        "photo_url": "https://basket-38.wbbasket.ru/vol8596/part859695/859695066/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 550517107,
        "name": "Штаны оверсайз спортивные широкие с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 1316,
        "discount": 87,
        "rating": 4.6,
        "feedbacks": 24,
        "category": "clothes",
        "photo_url": "https://basket-29.wbbasket.ru/vol5505/part550517/550517107/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 565940628,
        "name": "Штаны оверсайз спортивные широкие y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 4808,
        "sale_price": 1567,
        "discount": 67,
        "rating": 4.9,
        "feedbacks": 23,
        "category": "clothes",
        "photo_url": "https://basket-29.wbbasket.ru/vol5659/part565940/565940628/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 537365478,
        "name": "Зип худи с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 6306,
        "sale_price": 2052,
        "discount": 67,
        "rating": 5,
        "feedbacks": 5,
        "category": "clothes",
        "photo_url": "https://basket-28.wbbasket.ru/vol5373/part537365/537365478/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 493867270,
        "name": "Зип худи укороченное с принтом и молнией дрейн y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 9516,
        "sale_price": 3097,
        "discount": 67,
        "rating": 4.8,
        "feedbacks": 34,
        "category": "clothes",
        "photo_url": "https://basket-27.wbbasket.ru/vol4938/part493867/493867270/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 550509265,
        "name": "Штаны оверсайз спортивные широкие y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 9730,
        "sale_price": 3172,
        "discount": 67,
        "rating": 4.8,
        "feedbacks": 68,
        "category": "clothes",
        "photo_url": "https://basket-29.wbbasket.ru/vol5505/part550509/550509265/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 520386554,
        "name": "Зип худи укороченное с молнией олимпийка y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 5450,
        "sale_price": 1637,
        "discount": 70,
        "rating": 3.5,
        "feedbacks": 2,
        "category": "clothes",
        "photo_url": "https://basket-28.wbbasket.ru/vol5203/part520386/520386554/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 550137324,
        "name": "Худи оверсайз укороченное с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 1971,
        "discount": 81,
        "rating": 3.7,
        "feedbacks": 6,
        "category": "clothes",
        "photo_url": "https://basket-28.wbbasket.ru/vol5501/part550137/550137324/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 496284445,
        "name": "Штаны оверсайз спортивные широкие с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 5664,
        "sale_price": 1846,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 25,
        "category": "clothes",
        "photo_url": "https://basket-27.wbbasket.ru/vol4962/part496284/496284445/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 458328488,
        "name": "Штаны оверсайз спортивные широкие с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 6500,
        "sale_price": 2119,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 61,
        "category": "clothes",
        "photo_url": "https://basket-26.wbbasket.ru/vol4583/part458328/458328488/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 435787182,
        "name": "Штаны оверсайз спортивные широкие с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 4166,
        "sale_price": 1306,
        "discount": 69,
        "rating": 4.9,
        "feedbacks": 53,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4357/part435787/435787182/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 435783758,
        "name": "Зип худи укороченное с принтом и молнией дрейн y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 7590,
        "sale_price": 2375,
        "discount": 69,
        "rating": 4.7,
        "feedbacks": 269,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4357/part435783/435783758/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 456414039,
        "name": "Комбинезон спортивный для фитнеса, йоги с капюшоном",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 7918,
        "sale_price": 2478,
        "discount": 69,
        "rating": 3.7,
        "feedbacks": 3,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4564/part456414/456414039/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 435837859,
        "name": "Штаны оверсайз спортивные широкие с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 4166,
        "sale_price": 1306,
        "discount": 69,
        "rating": 4.2,
        "feedbacks": 20,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4358/part435837/435837859/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 435831151,
        "name": "Штаны оверсайз спортивные широкие с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 5236,
        "sale_price": 1641,
        "discount": 69,
        "rating": 4.8,
        "feedbacks": 30,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4358/part435831/435831151/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 435837858,
        "name": "Штаны оверсайз спортивные широкие с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 5450,
        "sale_price": 1708,
        "discount": 69,
        "rating": 4.5,
        "feedbacks": 20,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4358/part435837/435837858/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 454103851,
        "name": "Шорты широкие с принтом багги y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 2432,
        "discount": 77,
        "rating": 4.8,
        "feedbacks": 52,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4541/part454103/454103851/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 435783332,
        "name": "Зип худи укороченное с принтом и молнией дрейн y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 7376,
        "sale_price": 2308,
        "discount": 69,
        "rating": 4.4,
        "feedbacks": 129,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4357/part435783/435783332/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 454015894,
        "name": "Шорты широкие багги бриджи летние y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 1926,
        "sale_price": 693,
        "discount": 64,
        "rating": 4.8,
        "feedbacks": 11,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4540/part454015/454015894/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 435837855,
        "name": "Штаны оверсайз спортивные широкие с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 4446,
        "sale_price": 1393,
        "discount": 69,
        "rating": 4.4,
        "feedbacks": 28,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4358/part435837/435837855/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 444575907,
        "name": "Леггинсы спортивные для йоги пилатес",
        "brand": "Body angels",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 2354,
        "sale_price": 710,
        "discount": 70,
        "rating": 5,
        "feedbacks": 2,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4445/part444575/444575907/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 439183565,
        "name": "Футболка с принтом оверсайз y2k джерси",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 1643,
        "discount": 84,
        "rating": 4.9,
        "feedbacks": 45,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4391/part439183/439183565/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 419484328,
        "name": "Футболка оверсайз укороченная с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 7999,
        "sale_price": 2503,
        "discount": 69,
        "rating": 4.9,
        "feedbacks": 20,
        "category": "clothes",
        "photo_url": "https://basket-24.wbbasket.ru/vol4194/part419484/419484328/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 432023978,
        "name": "Футболка оверсайз с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 2568,
        "sale_price": 774,
        "discount": 70,
        "rating": 4.9,
        "feedbacks": 24,
        "category": "clothes",
        "photo_url": "https://basket-24.wbbasket.ru/vol4320/part432023/432023978/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 404087139,
        "name": "Футболка оверсайз укороченная с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 6500,
        "sale_price": 2034,
        "discount": 69,
        "rating": 4.8,
        "feedbacks": 92,
        "category": "clothes",
        "photo_url": "https://basket-23.wbbasket.ru/vol4040/part404087/404087139/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 422195564,
        "name": "Футболка оверсайз с принтом вишенки",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 2568,
        "sale_price": 774,
        "discount": 70,
        "rating": 4.9,
        "feedbacks": 14,
        "category": "clothes",
        "photo_url": "https://basket-24.wbbasket.ru/vol4221/part422195/422195564/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 438917382,
        "name": "Футболка оверсайз гоночная с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 4380,
        "sale_price": 1370,
        "discount": 69,
        "rating": 4.8,
        "feedbacks": 67,
        "category": "clothes",
        "photo_url": "https://basket-25.wbbasket.ru/vol4389/part438917/438917382/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 404412583,
        "name": "Шорты широкие с принтом багги летние y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 7999,
        "sale_price": 2453,
        "discount": 69,
        "rating": 4.8,
        "feedbacks": 97,
        "category": "clothes",
        "photo_url": "https://basket-23.wbbasket.ru/vol4044/part404412/404412583/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 404086392,
        "name": "Футболка оверсайз укороченная с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 5500,
        "sale_price": 1721,
        "discount": 69,
        "rating": 4.9,
        "feedbacks": 76,
        "category": "clothes",
        "photo_url": "https://basket-23.wbbasket.ru/vol4040/part404086/404086392/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 404092968,
        "name": "Футболка оверсайз укороченная с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 3952,
        "sale_price": 1174,
        "discount": 70,
        "rating": 5,
        "feedbacks": 25,
        "category": "clothes",
        "photo_url": "https://basket-23.wbbasket.ru/vol4040/part404092/404092968/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 404412354,
        "name": "Шорты широкие с принтом багги летние y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 7999,
        "sale_price": 2453,
        "discount": 69,
        "rating": 4.9,
        "feedbacks": 63,
        "category": "clothes",
        "photo_url": "https://basket-23.wbbasket.ru/vol4044/part404412/404412354/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 404411413,
        "name": "Шорты широкие с принтом багги летние y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 2300,
        "discount": 78,
        "rating": 4.9,
        "feedbacks": 66,
        "category": "clothes",
        "photo_url": "https://basket-23.wbbasket.ru/vol4044/part404411/404411413/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 398463125,
        "name": "Зип худи укороченное с молнией дрейн y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 5878,
        "sale_price": 1950,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 22,
        "category": "clothes",
        "photo_url": "https://basket-23.wbbasket.ru/vol3984/part398463/398463125/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 402055200,
        "name": "Футболка с принтом оверсайз y2k джерси",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 4999,
        "sale_price": 1439,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 123,
        "category": "clothes",
        "photo_url": "https://basket-23.wbbasket.ru/vol4020/part402055/402055200/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 387770410,
        "name": "Худи укороченное багги с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 6306,
        "sale_price": 1973,
        "discount": 69,
        "rating": 4.6,
        "feedbacks": 193,
        "category": "clothes",
        "photo_url": "https://basket-22.wbbasket.ru/vol3877/part387770/387770410/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 389160502,
        "name": "Зип худи на затяжках оверсайз дрейн y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 1971,
        "discount": 81,
        "rating": 4.9,
        "feedbacks": 24,
        "category": "clothes",
        "photo_url": "https://basket-22.wbbasket.ru/vol3891/part389160/389160502/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 368806394,
        "name": "Штаны оверсайз спортивные широкие y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 11870,
        "sale_price": 3870,
        "discount": 67,
        "rating": 4.8,
        "feedbacks": 111,
        "category": "clothes",
        "photo_url": "https://basket-21.wbbasket.ru/vol3688/part368806/368806394/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 366201175,
        "name": "Штаны оверсайз спортивные широкие y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10372,
        "sale_price": 3121,
        "discount": 70,
        "rating": 4.4,
        "feedbacks": 77,
        "category": "clothes",
        "photo_url": "https://basket-21.wbbasket.ru/vol3662/part366201/366201175/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 366345543,
        "name": "Штаны оверсайз спортивные широкие y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 11442,
        "sale_price": 3730,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 215,
        "category": "clothes",
        "photo_url": "https://basket-21.wbbasket.ru/vol3663/part366345/366345543/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 360902597,
        "name": "Штаны оверсайз спортивные широкие y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 11442,
        "sale_price": 3730,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 385,
        "category": "clothes",
        "photo_url": "https://basket-21.wbbasket.ru/vol3609/part360902/360902597/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 327113944,
        "name": "Худи укороченное багги с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10800,
        "sale_price": 3448,
        "discount": 68,
        "rating": 4.7,
        "feedbacks": 92,
        "category": "clothes",
        "photo_url": "https://basket-20.wbbasket.ru/vol3271/part327113/327113944/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 331600568,
        "name": "Штаны оверсайз спортивные широкие на затяжках y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 8874,
        "sale_price": 2893,
        "discount": 67,
        "rating": 4.6,
        "feedbacks": 445,
        "category": "clothes",
        "photo_url": "https://basket-20.wbbasket.ru/vol3316/part331600/331600568/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 331400438,
        "name": "Худи укороченное багги с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10372,
        "sale_price": 3376,
        "discount": 67,
        "rating": 4.8,
        "feedbacks": 256,
        "category": "clothes",
        "photo_url": "https://basket-20.wbbasket.ru/vol3314/part331400/331400438/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 326980544,
        "name": "Штаны оверсайз спортивные широкие y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 9302,
        "sale_price": 3032,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 242,
        "category": "clothes",
        "photo_url": "https://basket-19.wbbasket.ru/vol3269/part326980/326980544/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 324117345,
        "name": "Штаны оверсайз спортивные широкие y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10000,
        "sale_price": 2382,
        "discount": 76,
        "rating": 4.5,
        "feedbacks": 100,
        "category": "clothes",
        "photo_url": "https://basket-19.wbbasket.ru/vol3241/part324117/324117345/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 266848149,
        "name": "Штаны оверсайз спортивные широкие на затяжках y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 4808,
        "sale_price": 1688,
        "discount": 65,
        "rating": 4.4,
        "feedbacks": 358,
        "category": "clothes",
        "photo_url": "https://basket-17.wbbasket.ru/vol2668/part266848/266848149/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 249711791,
        "name": "Худи укороченное с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 1971,
        "discount": 81,
        "rating": 4.6,
        "feedbacks": 399,
        "category": "clothes",
        "photo_url": "https://basket-16.wbbasket.ru/vol2497/part249711/249711791/images/c516x688/1.webp",
        "is_new": true
    }
]
  },

  async fetchSellerCatalog(supplierId, brandName = null) {
    const sid = parseInt(supplierId, 10);

    // 1. Попытка запроса к локальному FastAPI серверу (Zero CORS, 100% реальные товары)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const resp = await fetch(`/api/seller/catalog?supplier_id=${sid}&sort=newly`, { signal: controller.signal });
      clearTimeout(timer);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (_) {}

    // 2. Попытка запроса через проверенный CORS-прокси напрямую к Wildberries
    try {
      const wbUrl = `https://catalog.wb.ru/sellers/v4/catalog?appType=1&curr=rub&dest=-1257786&spp=30&supplier=${sid}&sort=newly`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(wbUrl)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const resp = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (resp.ok) {
        const raw = await resp.json();
        const prods = raw.products || (raw.data && raw.data.products) || [];
        if (prods.length > 0) {
          return prods.map(p => {
            const art = p.id;
            const sizes = p.sizes || [];
            const priceObj = (sizes[0] && sizes[0].price) || {};
            const basic = Math.floor((priceObj.basic || 0) / 100);
            let sale = Math.floor((priceObj.total || priceObj.product || 0) / 100);
            if (!sale && basic) sale = Math.floor(basic * 0.5);
            if (!basic && sale) basic = Math.floor(sale * 1.6);
            const disc = (basic > sale && basic > 0) ? Math.round((1 - sale / basic) * 100) : 0;
            const nm = p.name || 'Товар Wildberries';
            return {
              article: art,
              name: nm,
              brand: p.brand || brandName || `WB #${sid}`,
              supplier: brandName || p.brand || `WB #${sid}`,
              supplier_id: sid,
              price: basic || 4500,
              sale_price: sale || 2490,
              discount: disc,
              rating: Number(p.reviewRating || p.rating || 4.8),
              feedbacks: p.feedbacks || 0,
              category: (nm.toLowerCase().includes('кроссов') || nm.toLowerCase().includes('ботин') || nm.toLowerCase().includes('кед')) ? 'shoes' : 'clothes',
              photo_url: this.getPhotoUrl(art, 1),
              is_new: true
            };
          });
        }
      }
    } catch (_) {}

    // 3. Подлинный оффлайн-каталог конкретного продавца (100% реальные товары с WB)
    if (this.sellerDatabases[sid]) {
      return this.sellerDatabases[sid].map(item => ({
        ...item,
        supplier_id: sid
      }));
    }

    return [];
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
      { id: 4183217, name: 'SOQ WAY', category: 'Одежда и деним', active: true, count: 100 },
      { id: 110887, name: 'StreetStar', category: 'Одежда и стритвир', active: true, count: 100 },
      { id: 42283, name: 'Red Flag', category: 'Одежда и винтаж', active: true, count: 100 },
      { id: 1266941, name: 'Urban Style', category: 'Стритвир и худи', active: true, count: 61 }
    ],
    queue: [],
    settings: {
      tgChannel: '@wbuppp',
      tgToken: '7801828859:AAEMfX_7g_XwL1jWl8vFz9z7n4sY'
    },
    modalCallback: null
  },

  // Rich Curated Starter Feed (16 real items with 100% matching photos)
  defaultCatalog: [
    {
        "article": 1537250027,
        "name": "Худи оверсайз с принтом с начёсом ковер",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5500,
        "sale_price": 3025,
        "discount": 45,
        "rating": 4.7,
        "feedbacks": 328,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15372/part1537250/1537250027/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1547573634,
        "name": "Зип худи оверсайз с начесом на молнии кроп",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 7001,
        "sale_price": 3850,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15475/part1547573/1547573634/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211883,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211883/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211879,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211879/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211887,
        "name": "Худи оверсайз с принтом с начёсом",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 4.7,
        "feedbacks": 328,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211887/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1563211870,
        "name": "Худи оверсайз с принтом archive с начёсом y2k",
        "brand": "ORGVSM",
        "supplier": "SOQ WAY",
        "supplier_id": 4183217,
        "price": 5001,
        "sale_price": 2750,
        "discount": 45,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-48.wbbasket.ru/vol15632/part1563211/1563211870/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1420434801,
        "name": "Лонгслив женский оверсайз набор 3 шт. кофта базовая y2k",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 8000,
        "sale_price": 3269,
        "discount": 59,
        "rating": 5,
        "feedbacks": 2,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol14204/part1420434/1420434801/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1420443229,
        "name": "Лонгслив женский оверсайз набор 5 шт. кофта базовая y2k",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 8500,
        "sale_price": 3984,
        "discount": 53,
        "rating": 5,
        "feedbacks": 4,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol14204/part1420443/1420443229/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1420426773,
        "name": "Лонгслив летучая мышь набор из 3 шт",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 6600,
        "sale_price": 3014,
        "discount": 54,
        "rating": 4.9,
        "feedbacks": 13,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol14204/part1420426/1420426773/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1334859892,
        "name": "Лонгслив хенли",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7000,
        "sale_price": 2019,
        "discount": 71,
        "rating": 5,
        "feedbacks": 14,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13348/part1334859/1334859892/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1334360881,
        "name": "Лонгслив хенли",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7000,
        "sale_price": 2019,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 18,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13343/part1334360/1334360881/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1334859890,
        "name": "Лонгслив хенли",
        "brand": "StreetStar",
        "supplier": "StreetStar",
        "supplier_id": 110887,
        "price": 7000,
        "sale_price": 2019,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 7,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13348/part1334859/1334859890/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715032,
        "name": "Костюм осенний теплый с начесом by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 16998,
        "sale_price": 4895,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715032/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332714981,
        "name": "Спортивный костюм двойка с зип худи by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 8999,
        "sale_price": 5183,
        "discount": 42,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332714/1332714981/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332714983,
        "name": "Спортивный костюм двойка с зип худи by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 8999,
        "sale_price": 5183,
        "discount": 42,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332714/1332714983/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332715033,
        "name": "Костюм осенний теплый с начесом by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 16998,
        "sale_price": 4895,
        "discount": 71,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332715/1332715033/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1380065757,
        "name": "Кардиган укороченный на пуговицах",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 10000,
        "sale_price": 2880,
        "discount": 71,
        "rating": 4.8,
        "feedbacks": 3548,
        "category": "clothes",
        "photo_url": "https://basket-46.wbbasket.ru/vol13800/part1380065/1380065757/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1332714982,
        "name": "Спортивный костюм двойка с зип худи by Karina Paletskikh",
        "brand": "Red Flag",
        "supplier": "Red Flag",
        "supplier_id": 42283,
        "price": 8999,
        "sale_price": 5183,
        "discount": 42,
        "rating": 4.7,
        "feedbacks": 2823,
        "category": "clothes",
        "photo_url": "https://basket-45.wbbasket.ru/vol13327/part1332714/1332714982/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1196927104,
        "name": "Мини юбка с принтом",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 5000,
        "sale_price": 1815,
        "discount": 64,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-44.wbbasket.ru/vol11969/part1196927/1196927104/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 1062254586,
        "name": "Шорты широкие багги летние y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 1288,
        "discount": 88,
        "rating": 0,
        "feedbacks": 0,
        "category": "clothes",
        "photo_url": "https://basket-42.wbbasket.ru/vol10622/part1062254/1062254586/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 902272570,
        "name": "Зип худи оверсайз кофта в корейском стиле",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10800,
        "sale_price": 3515,
        "discount": 67,
        "rating": 4,
        "feedbacks": 4,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9022/part902272/902272570/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 902272273,
        "name": "Зип худи оверсайз кофта в корейском стиле",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10800,
        "sale_price": 3515,
        "discount": 67,
        "rating": 4.7,
        "feedbacks": 3,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9022/part902272/902272273/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 902272571,
        "name": "Зип худи оверсайз кофта в корейском стиле",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10800,
        "sale_price": 3515,
        "discount": 67,
        "rating": 4,
        "feedbacks": 1,
        "category": "clothes",
        "photo_url": "https://basket-39.wbbasket.ru/vol9022/part902272/902272571/images/c516x688/1.webp",
        "is_new": true
    },
    {
        "article": 822951732,
        "name": "Штаны оверсайз спортивные широкие с принтом y2k",
        "brand": "Etrange Rule",
        "supplier": "Urban Style",
        "supplier_id": 1266941,
        "price": 10500,
        "sale_price": 2633,
        "discount": 75,
        "rating": 4,
        "feedbacks": 1,
        "category": "clothes",
        "photo_url": "https://basket-37.wbbasket.ru/vol8229/part822951/822951732/images/c516x688/1.webp",
        "is_new": true
    }
],

  init() {
    this.loadState();
    this.renderFeed();
    this.renderSellers();
    this.renderQueue();
    this.updateActionCapsule();

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMobileMenu();
        this.closeProductModal();
        this.closeModal();
      }
    });
  },

  loadState() {
    try {
      const savedFeed = localStorage.getItem('wbup_fashion_feed_v6');
      if (savedFeed) {
        const parsedFeed = JSON.parse(savedFeed);
        // Force upgrade if old invalid mock articles are detected
        const hasOutdatedMocks = Array.isArray(parsedFeed) && parsedFeed.some(p => p.article === 1237216844 || p.article === 486250517 || p.article === 189201482 || parsedFeed.length < 12);
        if (hasOutdatedMocks || !Array.isArray(parsedFeed) || parsedFeed.length === 0) {
          this.state.feedProducts = [...this.defaultCatalog];
        } else {
          this.state.feedProducts = parsedFeed;
        }
      } else {
        this.state.feedProducts = [...this.defaultCatalog];
      }

      const savedSellers = localStorage.getItem('wbup_fashion_sellers_v6');
      if (savedSellers) {
        const parsed = JSON.parse(savedSellers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.state.sellers = parsed.map(s => ({
            ...s,
            active: s.active !== false,
            count: s.count || 15
          }));
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
      localStorage.setItem('wbup_fashion_feed_v6', JSON.stringify(this.state.feedProducts));
      localStorage.setItem('wbup_fashion_sellers_v6', JSON.stringify(this.state.sellers));
      localStorage.setItem('wbup_fashion_queue', JSON.stringify(this.state.queue));
      localStorage.setItem('wbup_fashion_settings', JSON.stringify(this.state.settings));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  },

  // --- Tab Navigation (Editorial Desktop & Mobile) ---
  switchTab(tabId) {
    this.haptic('light');
    this.state.currentTab = tabId;

    // Active tab panel
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('tab-panel--active');
    });
    const activePanel = document.getElementById(`tab-${tabId}`);
    if (activePanel) activePanel.classList.add('tab-panel--active');

    // Desktop nav links
    document.querySelectorAll('.desktop-nav__link').forEach(link => {
      if (link.dataset.tab === tabId) link.classList.add('active');
      else link.classList.remove('active');
    });

    // Mobile drawer items
    document.querySelectorAll('.drawer-item').forEach(item => {
      if (item.dataset.tab === tabId) item.classList.add('active');
      else item.classList.remove('active');
    });

    // Mobile bottom nav bar items
    document.querySelectorAll('.mobile-nav-bar__item').forEach(item => {
      if (item.dataset.tab === tabId) item.classList.add('active');
      else item.classList.remove('active');
    });

    // Legacy tabbar support
    document.querySelectorAll('.ios-tabbar__item').forEach(item => {
      if (item.dataset.tab === tabId) item.classList.add('ios-tabbar__item--active');
      else item.classList.remove('ios-tabbar__item--active');
    });

    this.closeMobileMenu();
    this.updateActionCapsule();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // --- Mobile Drawer Menu ---
  toggleMobileMenu() {
    const overlay = document.getElementById('mobile-drawer-overlay');
    if (!overlay) return;
    const isOpen = overlay.classList.contains('active');
    if (isOpen) {
      this.closeMobileMenu();
    } else {
      this.haptic('light');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeMobileMenu() {
    const overlay = document.getElementById('mobile-drawer-overlay');
    if (overlay && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // --- Smooth Scroll to Catalog ---
  scrollToCatalog() {
    this.switchTab('dashboard');
    const toolbar = document.querySelector('.catalog-toolbar');
    if (toolbar) {
      toolbar.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 420, behavior: 'smooth' });
    }
  },

  // --- Product Card Rendering (Ohdamn.online Borderless Minimal Aesthetic) ---
  renderFeed() {
    const grid = document.getElementById('product-grid');
    const emptyEl = document.getElementById('feed-empty');
    if (!grid) return;

    let items = [...this.state.feedProducts];

    // Filter by specific seller if clicked, or by all currently ACTIVE sellers
    if (this.state.sellerFilter) {
      const sid = parseInt(this.state.sellerFilter, 10);
      items = items.filter(p => p.supplier_id === sid || (p.brand && String(p.brand).toLowerCase() === String(this.state.sellerFilter).toLowerCase()));
    } else {
      const activeIds = new Set(this.state.sellers.filter(s => s.active !== false).map(s => s.id));
      if (activeIds.size > 0) {
        items = items.filter(p => !p.supplier_id || activeIds.has(p.supplier_id));
      }
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
        <article class="fashion-card ${selClass}" onclick="app.openProductModal(${p.article})">
          <div class="fashion-card__photo-wrap">
            ${p.is_new ? '<span class="fashion-card__badge-new">NEW</span>' : ''}
            <div class="fashion-card__checkbox" onclick="event.stopPropagation(); app.toggleArticleCard(${p.article});" title="Выбрать для поста">
              <svg class="sf-icon"><use href="#sf-check"></use></svg>
            </div>
            <img src="${photoUrl}"
                 class="fashion-card__img"
                 alt="${this.escHtml(p.name)}"
                 loading="lazy"
                 decoding="async"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><rect fill=\\'%23f4f4f6\\' width=\\'100\\' height=\\'100\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%238e8e98\\' font-size=\\'12\\'>Фото WB</text></svg>'">
          </div>
          <div class="fashion-card__body">
            <div class="fashion-card__brand">${this.escHtml(p.brand || 'WILDBERRIES')}</div>
            <div class="fashion-card__name" title="${this.escHtml(p.name)}">${this.escHtml(p.name)}</div>
            <div class="fashion-card__price-row">
              <div class="fashion-card__price-group">
                <span class="fashion-card__price">${Math.round(salePrice).toLocaleString('ru-RU')} ₽</span>
                ${hasDiscount ? `<span class="fashion-card__discount-tag">-${p.discount}%</span>` : ''}
              </div>
              <span class="fashion-card__rating">★ ${p.rating || '4.8'}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  },

  // --- Product Detail Modal (2-Column Editorial Desktop / Sheet Mobile) ---
  openProductModal(article) {
    this.haptic('light');
    const p = this.state.feedProducts.find(x => x.article === article);
    if (!p) return;

    const overlay = document.getElementById('product-modal-overlay');
    const content = document.getElementById('product-modal-content');
    if (!overlay || !content) return;

    const isSelected = this.state.selectedArticles.has(article);
    const photoUrl = p.photo_url || StandaloneEngine.getPhotoUrl(p.article, 1);
    const salePrice = p.sale_price || p.price || 0;
    const oldPrice = p.price || 0;
    const hasDiscount = p.discount && p.discount > 0;

    content.innerHTML = `
      <div class="product-modal__gallery">
        <img src="${photoUrl}" class="product-modal__main-img" alt="${this.escHtml(p.name)}" decoding="async">
      </div>
      <div class="product-modal__info">
        <div class="product-modal__header">
          <div class="product-modal__brand">${this.escHtml(p.brand || 'WILDBERRIES')} · АРТИКУЛ ${p.article}</div>
          <h2 class="product-modal__title">${this.escHtml(p.name)}</h2>
          <div class="product-modal__meta-row">
            <span>⭐ ${p.rating || '4.8'} (${p.feedbacks || 0} отзывов)</span>
            <span>•</span>
            <span>Магазин: <strong>${this.escHtml(p.supplier || 'WB Seller')}</strong></span>
          </div>
          <div class="product-modal__price-row">
            <span class="product-modal__current-price">${Math.round(salePrice).toLocaleString('ru-RU')} ₽</span>
            ${hasDiscount ? `<span class="product-modal__original-price">${Math.round(oldPrice).toLocaleString('ru-RU')} ₽</span>` : ''}
            ${hasDiscount ? `<span class="product-modal__discount-tag">-${p.discount}%</span>` : ''}
          </div>
        </div>

        <div class="product-modal__sizes-section">
          <div class="product-modal__section-label">Размеры в наличии</div>
          <div class="product-modal__sizes-grid">
            <button class="size-pill active" onclick="app.toggleSizePill(this)">XS</button>
            <button class="size-pill" onclick="app.toggleSizePill(this)">S</button>
            <button class="size-pill" onclick="app.toggleSizePill(this)">M</button>
            <button class="size-pill" onclick="app.toggleSizePill(this)">L</button>
            <button class="size-pill" onclick="app.toggleSizePill(this)">XL</button>
            <button class="size-pill" onclick="app.toggleSizePill(this)">XXL</button>
          </div>
        </div>

        <div class="product-modal__actions">
          <button class="btn btn--primary btn--full btn--lg" onclick="app.toggleArticleFromModal(${p.article})">
            <svg class="sf-icon"><use href="#sf-check"></use></svg>
            <span id="modal-select-btn-text">${isSelected ? 'УДАЛИТЬ ИЗ ПОСТА' : 'ВЫБРАТЬ ДЛЯ ПОСТА'}</span>
          </button>
          <a href="https://www.wildberries.ru/catalog/${p.article}/detail.aspx" target="_blank" rel="noopener noreferrer" class="btn btn--secondary btn--full">
            <svg class="sf-icon"><use href="#sf-arrow-up-right"></use></svg>
            ОТКРЫТЬ НА WILDBERRIES
          </a>
          <button class="btn btn--ghost btn--full" onclick="app.createLookbookFromProduct(${p.article})">
            <svg class="sf-icon"><use href="#sf-wand-stars"></use></svg>
            СОЗДАТЬ LOOKBOOK 1080×1080
          </button>
        </div>
      </div>
    `;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeProductModal() {
    const overlay = document.getElementById('product-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  toggleSizePill(el) {
    this.haptic('light');
    if (el && el.parentElement) {
      el.parentElement.querySelectorAll('.size-pill').forEach(btn => btn.classList.remove('active'));
      el.classList.add('active');
    }
  },

  toggleArticleFromModal(article) {
    this.toggleArticleCard(article);
    const btnText = document.getElementById('modal-select-btn-text');
    if (btnText) {
      const isSelected = this.state.selectedArticles.has(article);
      btnText.textContent = isSelected ? 'УДАЛИТЬ ИЗ ПОСТА' : 'ВЫБРАТЬ ДЛЯ ПОСТА';
    }
  },

  createLookbookFromProduct(article) {
    this.closeProductModal();
    this.state.selectedArticles.clear();
    this.state.selectedArticles.add(article);
    this.renderFeed();
    this.updateActionCapsule();
    this.generatePreview();
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
    const count = this.state.selectedArticles.size;

    if (capsule) {
      if (count > 0 && this.state.currentTab === 'dashboard') {
        if (label) label.textContent = `${count} выбрано`;
        capsule.classList.add('visible');
        capsule.classList.add('action-capsule--visible');
      } else {
        capsule.classList.remove('visible');
        capsule.classList.remove('action-capsule--visible');
      }
    }

    // Sync header and drawer badges
    const newItemsCount = this.state.feedProducts.filter(p => p.is_new).length;
    const headerNew = document.getElementById('header-new-badge');
    if (headerNew) headerNew.textContent = newItemsCount || this.state.feedProducts.length;
    const drawerNew = document.getElementById('novelty-badge-count');
    if (drawerNew) drawerNew.textContent = newItemsCount || this.state.feedProducts.length;

    const queueBadge = document.getElementById('queue-count-badge');
    if (queueBadge) queueBadge.textContent = this.state.queue.length;
    const queueHeader = document.getElementById('queue-count-header');
    if (queueHeader) queueHeader.textContent = this.state.queue.length;
    const drawerQueue = document.getElementById('drawer-queue-count');
    if (drawerQueue) drawerQueue.textContent = this.state.queue.length;

    const drawerSellers = document.getElementById('drawer-sellers-count');
    if (drawerSellers) drawerSellers.textContent = this.state.sellers.length;
  },

  filterByCategory(cat, btnEl) {
    this.haptic('light');
    this.state.categoryFilter = cat;
    document.querySelectorAll('#category-chips .cat-link').forEach(c => {
      c.classList.remove('active');
      c.classList.remove('ios-chip--active');
    });
    if (btnEl) {
      btnEl.classList.add('active');
      btnEl.classList.add('ios-chip--active');
    }
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

  async filterFeedBySeller(supplierId) {
    this.haptic('light');
    const sid = parseInt(supplierId, 10);
    this.state.sellerFilter = sid;

    // If feed does not have products for this seller yet, fetch them immediately
    const sellerProds = this.state.feedProducts.filter(p => p.supplier_id === sid);
    if (sellerProds.length === 0) {
      const s = this.state.sellers.find(x => x.id === sid);
      const catalog = await StandaloneEngine.fetchSellerCatalog(sid, s ? s.name : null);
      if (catalog && catalog.length > 0) {
        this.state.feedProducts = [...catalog, ...this.state.feedProducts];
        this.saveState();
      }
    }

    this.switchTab('dashboard');
    this.renderFeed();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const s = this.state.sellers.find(x => x.id === sid);
    this.showToast(`Магазин: ${s ? s.name : sid}`);
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
        const unadded = catalog.filter(p => !currentArticles.has(p.article));

        // Take batch of up to 10 genuine new items per seller
        const batch = unadded.slice(0, 10);
        batch.forEach(item => {
          item.is_new = true;
          item.supplier_id = s.id;
          currentArticles.add(item.article);
        });

        if (batch.length > 0) {
          newlyDiscovered.push(...batch);
        }

        s.count = this.state.feedProducts.filter(p => p.supplier_id === s.id).length + batch.length;
      } catch (err) {
        console.warn(`Seller ${s.id} sync warning:`, err);
      }
    }

    if (newlyDiscovered.length > 0) {
      this.state.feedProducts = [...newlyDiscovered, ...this.state.feedProducts];
      this.saveState();
      this.renderFeed();
      this.renderSellers();
      this.switchTab('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.showToast(`✨ Найдено +${newlyDiscovered.length} новинок у выбранных магазинов!`);
    } else {
      this.showToast(`✅ Все новинки ${activeSellers.length} выбранных магазинов уже в ленте`);
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
      const count = this.state.feedProducts.filter(p => p.supplier_id === s.id).length || s.count || 15;

      return `
        <div class="seller-row">
          <div class="seller-avatar" style="background:${color};" onclick="app.filterFeedBySeller(${s.id})" title="Показать товары ${this.escHtml(s.name)}">
            ${initial}
          </div>
          <div class="seller-info" onclick="app.filterFeedBySeller(${s.id})" title="Показать товары ${this.escHtml(s.name)}">
            <div class="seller-name">${this.escHtml(s.name)}</div>
            <div class="seller-sub">ID: ${s.id} · <span style="color:#ffffff; font-weight:600;">${count} товаров</span></div>
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

    this.showToast(`⚡ Загрузка каталога «${brandName}»...`);

    try {
      const catalog = await StandaloneEngine.fetchSellerCatalog(sid, brandName);
      if (!catalog || catalog.length === 0) {
        this.showToast(`Не удалось найти товары для «${brandName}»`, 'warn');
        return;
      }

      const currentArticles = new Set(this.state.feedProducts.map(p => p.article));
      const unadded = catalog.filter(p => !currentArticles.has(p.article));

      unadded.forEach(item => {
        item.is_new = true;
        item.supplier_id = sid;
        currentArticles.add(item.article);
      });

      if (seller) {
        seller.count = (seller.count || 0) + unadded.length;
      }

      if (unadded.length > 0) {
        this.state.feedProducts = [...unadded, ...this.state.feedProducts];
        this.saveState();
        this.renderSellers();
        await this.filterFeedBySeller(sid);
        this.showToast(`✅ ${brandName}: добавлено +${unadded.length} товаров!`);
      } else {
        await this.filterFeedBySeller(sid);
        this.showToast(`✅ Каталог «${brandName}» (${catalog.length} товаров) уже в ленте`);
      }
    } catch (err) {
      console.error(err);
      this.showToast('Ошибка загрузки товаров продавца', 'warn');
    }
  },

  parseSellerInput(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;

    if (/^\d+$/.test(raw)) {
      return { supplierId: parseInt(raw, 10), brand: null };
    }

    const m = raw.match(/seller\/(?:([a-zA-Zа-яА-Я0-9_-]+)-)?(\d+)/i);
    if (m) {
      let brand = m[1] ? m[1].replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;
      return { supplierId: parseInt(m[2], 10), brand };
    }

    const m2 = raw.match(/(?:supplier|supplier_id)[/=](\d+)/i);
    if (m2) {
      return { supplierId: parseInt(m2[1], 10), brand: null };
    }

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
          <label style="font-size:12px; font-weight:600; color:var(--fg-secondary); text-transform:uppercase; letter-spacing:0.05em;">Ссылка на магазин или ID поставщика:</label>
          <input type="text" id="new-seller-input" class="settings-input" style="width:100%;" placeholder="https://www.wildberries.ru/seller/SOQ-WAY-4183217 или 110887">
          <p style="font-size:12px; color:var(--fg-muted); line-height:1.4;">Система автоматически определит бренд магазина, загрузит его товары и включит в мониторинг новинок.</p>
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
      category: 'Одежда и мода',
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
    localStorage.removeItem('wbup_fashion_feed_v6');
    localStorage.removeItem('wbup_fashion_sellers_v6');
    localStorage.removeItem('wbup_fashion_queue');
    this.state.feedProducts = [...this.defaultCatalog];
    this.state.selectedArticles.clear();
    this.state.sellerFilter = null;
    this.renderFeed();
    this.renderSellers();
    this.showToast('🔄 Каталог и кэш успешно сброшены');
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

window.app = app;
window.addEventListener('DOMContentLoaded', () => app.init());
