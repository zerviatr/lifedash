// Icon generator — Gem/Diamond style for LifeDash
// Uses jimp to create proper BMP-based ICO (required by electron-builder)
const { PNG } = require('pngjs');
const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

function createGemPNG(size) {
  const png = new PNG({ width: size, height: size, filterType: -1 });
  const cx = size / 2;
  const cy = size / 2;

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    png.data[idx]     = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = a;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function pointInPolygon(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  const pad = size * 0.1;
  const s = (size - pad * 2) / 2;
  const topY   = cy - s * 0.95;
  const girdle = cy - s * 0.15;
  const bottomY = cy + s * 0.95;
  const gLeft  = cx - s * 0.85;
  const gRight = cx + s * 0.85;

  const crown = [
    [cx - s * 0.35, topY],
    [cx + s * 0.35, topY],
    [gRight, girdle],
    [gLeft,  girdle],
  ];
  const pavilion = [
    [gLeft,  girdle],
    [gRight, girdle],
    [cx,     bottomY],
  ];
  const facets = [
    [[cx, topY], [gLeft, girdle]],
    [[cx, topY], [gRight, girdle]],
    [[cx - s*0.35, topY], [gLeft, girdle]],
    [[cx + s*0.35, topY], [gRight, girdle]],
    [[gLeft, girdle], [cx, bottomY]],
    [[gRight, girdle], [cx, bottomY]],
    [[cx - s*0.42, girdle], [cx, bottomY]],
    [[cx + s*0.42, girdle], [cx, bottomY]],
  ];

  const colors = {
    gemLight: [167, 139, 250],
    gemDark:  [55, 10, 120],
    gemMain:  [109, 40, 217],
    gemMid:   [139, 92, 246],
    girdle:   [196, 181, 253],
  };

  // Background
  const bgRadius = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.max(0, Math.abs(x - cx) - (size/2 - bgRadius));
      const dy = Math.max(0, Math.abs(y - cy) - (size/2 - bgRadius));
      if (dx*dx + dy*dy <= bgRadius*bgRadius) {
        const dist = Math.sqrt((x-cx)**2 + (y-cy)**2) / (size * 0.7);
        const t = Math.min(1, dist);
        setPixel(x, y,
          Math.round(lerp(30, 10, t)),
          Math.round(lerp(15, 8, t)),
          Math.round(lerp(60, 20, t)),
          255);
      }
    }
  }

  // Gem crown
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inCrown    = pointInPolygon(x, y, crown);
      const inPavilion = pointInPolygon(x, y, pavilion);
      if (inCrown) {
        const tx = (x - gLeft) / (gRight - gLeft);
        const ty = (y - topY) / (girdle - topY);
        let r, g, b;
        if (tx < 0.5) {
          r = Math.round(lerp(colors.gemDark[0], colors.gemMain[0], tx * 2));
          g = Math.round(lerp(colors.gemDark[1], colors.gemMain[1], tx * 2));
          b = Math.round(lerp(colors.gemDark[2], colors.gemMain[2], tx * 2));
        } else {
          r = Math.round(lerp(colors.gemMain[0], colors.gemLight[0], (tx-0.5)*2));
          g = Math.round(lerp(colors.gemMain[1], colors.gemLight[1], (tx-0.5)*2));
          b = Math.round(lerp(colors.gemMain[2], colors.gemLight[2], (tx-0.5)*2));
        }
        if (ty < 0.25) {
          const ht = (0.25 - ty) / 0.25;
          r = Math.round(lerp(r, colors.gemLight[0], ht * 0.6));
          g = Math.round(lerp(g, colors.gemLight[1], ht * 0.6));
          b = Math.round(lerp(b, colors.gemLight[2], ht * 0.6));
        }
        setPixel(x, y, r, g, b, 255);
      } else if (inPavilion) {
        const tx = (x - gLeft) / (gRight - gLeft);
        const ty = (y - girdle) / (bottomY - girdle);
        let r, g, b;
        if (tx < 0.5) {
          r = Math.round(lerp(colors.gemDark[0], colors.gemMid[0], ty));
          g = Math.round(lerp(colors.gemDark[1], colors.gemMid[1], ty));
          b = Math.round(lerp(colors.gemDark[2], colors.gemMid[2], ty));
        } else {
          r = Math.round(lerp(colors.gemMid[0], colors.gemDark[0], ty));
          g = Math.round(lerp(colors.gemMid[1], colors.gemDark[1], ty));
          b = Math.round(lerp(colors.gemMid[2], colors.gemDark[2], ty));
        }
        setPixel(x, y, r, g, b, 255);
      }
    }
  }

  // Girdle line
  for (let x = Math.round(gLeft); x <= Math.round(gRight); x++) {
    for (let dy = -1; dy <= 1; dy++) {
      setPixel(x, Math.round(girdle) + dy, colors.girdle[0], colors.girdle[1], colors.girdle[2], 180);
    }
  }

  // Facet lines
  function drawLine(x0, y0, x1, y1, col, alpha) {
    const dx = x1-x0, dy = y1-y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      setPixel(Math.round(x0+dx*t), Math.round(y0+dy*t), col[0], col[1], col[2], alpha);
    }
  }
  for (const [[x0,y0],[x1,y1]] of facets) drawLine(x0,y0,x1,y1,colors.girdle,120);

  // Shine spot
  const shineX = Math.round(cx - s*0.18);
  const shineY = Math.round(topY + s*0.12);
  const shineR = Math.round(s*0.12);
  for (let dy = -shineR; dy <= shineR; dy++) {
    for (let dx = -shineR; dx <= shineR; dx++) {
      const d = Math.sqrt(dx*dx+dy*dy);
      if (d <= shineR) {
        const a = Math.round(180*(1-d/shineR));
        const xi = shineX+dx, yi = shineY+dy;
        const idx = (yi*size+xi)*4;
        if (idx >= 0 && idx < png.data.length-3 && png.data[idx+3] > 0) {
          png.data[idx]   = Math.min(255, png.data[idx]   + a);
          png.data[idx+1] = Math.min(255, png.data[idx+1] + a);
          png.data[idx+2] = Math.min(255, png.data[idx+2] + a);
        }
      }
    }
  }

  return PNG.sync.write(png);
}

async function main() {
  console.log('Generating gem icon with jimp (BMP-based ICO)...');
  const sizes = [16, 32, 48, 64, 128, 256];
  const jimpImages = [];

  for (const size of sizes) {
    const pngBuf = createGemPNG(size);
    const tmpPath = path.join(__dirname, `icon_tmp_${size}.png`);
    fs.writeFileSync(tmpPath, pngBuf);
    const img = await Jimp.fromBuffer(pngBuf);
    jimpImages.push({ size, img, tmpPath });
    console.log(`  Drew ${size}x${size}`);
  }

  // Build proper BMP-based ICO manually using BITMAPINFOHEADER
  function pngToBmpDib(jimpImg, size) {
    // BITMAPINFOHEADER (40 bytes) + BGRA pixel data (bottom-up)
    const headerSize = 40;
    const pixelSize  = size * size * 4;
    const buf = Buffer.alloc(headerSize + pixelSize);

    // BITMAPINFOHEADER
    buf.writeInt32LE(40,         0);  // biSize
    buf.writeInt32LE(size,       4);  // biWidth
    buf.writeInt32LE(size * 2,   8);  // biHeight (doubled for ICO mask)
    buf.writeInt16LE(1,         12);  // biPlanes
    buf.writeInt16LE(32,        14);  // biBitCount
    buf.writeInt32LE(0,         16);  // biCompression (BI_RGB)
    buf.writeInt32LE(pixelSize, 20);  // biSizeImage
    buf.writeInt32LE(0,         24);  // biXPelsPerMeter
    buf.writeInt32LE(0,         28);  // biYPelsPerMeter
    buf.writeInt32LE(0,         32);  // biClrUsed
    buf.writeInt32LE(0,         36);  // biClrImportant

    // Pixel data: BGRA, bottom-up
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const srcRow = size - 1 - row; // flip vertically
        const pixel = jimpImg.getPixelColor(col, srcRow);
        const dstIdx = headerSize + (row * size + col) * 4;
        buf[dstIdx + 0] = (pixel >> 8)  & 0xff;  // Blue
        buf[dstIdx + 1] = (pixel >> 16) & 0xff;  // Green
        buf[dstIdx + 2] = (pixel >> 24) & 0xff;  // Red
        buf[dstIdx + 3] = pixel & 0xff;           // Alpha
      }
    }
    return buf;
  }

  const count = jimpImages.length;
  const headerSz = 6;
  const entrySz  = 16;
  const dibs = jimpImages.map(({ img, size }) => pngToBmpDib(img, size));

  let dataOffset = headerSz + entrySz * count;
  const offsets = dibs.map(d => { const o = dataOffset; dataOffset += d.length; return o; });

  const ico = Buffer.alloc(dataOffset);
  ico.writeUInt16LE(0,     0);
  ico.writeUInt16LE(1,     2);
  ico.writeUInt16LE(count, 4);

  dibs.forEach((dib, i) => {
    const sz   = sizes[i];
    const base = headerSz + i * entrySz;
    ico.writeUInt8(sz >= 256 ? 0 : sz, base + 0);
    ico.writeUInt8(sz >= 256 ? 0 : sz, base + 1);
    ico.writeUInt8(0,   base + 2);
    ico.writeUInt8(0,   base + 3);
    ico.writeUInt16LE(1,  base + 4);
    ico.writeUInt16LE(32, base + 6);
    ico.writeUInt32LE(dib.length, base + 8);
    ico.writeUInt32LE(offsets[i], base + 12);
    dib.copy(ico, offsets[i]);
  });

  fs.writeFileSync(path.join(__dirname, 'assets/icon.ico'), ico);
  console.log('✅ assets/icon.ico written (BMP-based, electron-builder compatible)');

  // Cleanup temp files
  for (const { tmpPath } of jimpImages) fs.unlinkSync(tmpPath);

  // Save PNG preview
  fs.writeFileSync(path.join(__dirname, 'assets/icon_preview.png'), createGemPNG(256));
  console.log('✅ assets/icon_preview.png saved');
}

main().catch(console.error);
