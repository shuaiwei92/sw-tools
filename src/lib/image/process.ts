// 图片处理共享库：全部在浏览器本地用 Canvas 完成，不上传任何服务器。
// 导出格式：PNG / JPEG / WebP / AVIF 走浏览器原生 Canvas；BMP / ICO 走本文件内置的纯前端编码器（零依赖）。

export type ImageOutFormat =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/bmp'
  | 'image/x-icon'
  | 'image/avif';

/** 各导出格式元信息：label 用于界面，lossy 决定是否显示质量滑块，native 表示浏览器原生支持。 */
export const OUT_FORMATS: { type: ImageOutFormat; label: string; lossy: boolean; native: boolean }[] = [
  { type: 'image/png', label: 'PNG（无损）', lossy: false, native: true },
  { type: 'image/jpeg', label: 'JPEG', lossy: true, native: true },
  { type: 'image/webp', label: 'WebP', lossy: true, native: true },
  { type: 'image/bmp', label: 'BMP（无损）', lossy: false, native: false },
  { type: 'image/x-icon', label: 'ICO（图标，正方形）', lossy: false, native: false },
  { type: 'image/avif', label: 'AVIF（高压缩）', lossy: true, native: true },
];

export function isLossyFormat(type: string): boolean {
  return OUT_FORMATS.find((f) => f.type === type)?.lossy ?? false;
}

/** 读取本地图片文件为 HTMLImageElement（用完自动回收 object URL）。 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件（PNG / JPEG / WebP / GIF 等）'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取该图片，请确认文件为有效的图片格式'));
    };
    img.src = url;
  });
}

/** 将图片绘制到与原始分辨率一致的画布。 */
export function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** 画布导出为 Blob（异步，符合 Canvas 规范）。 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('导出失败，可能浏览器不支持该格式'))),
      type,
      quality
    );
  });
}

/** 水平 / 垂直翻转。 */
export function flipCanvas(
  src: HTMLCanvasElement,
  horizontal: boolean,
  vertical: boolean
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
  ctx.translate(-c.width / 2, -c.height / 2);
  ctx.drawImage(src, 0, 0);
  return c;
}

/** 按角度旋转（顺时针，度）。非 0/90/180/270 也会正确计算外接矩形，不裁切。 */
export function rotateCanvas(src: HTMLCanvasElement, deg: number): HTMLCanvasElement {
  const rad = (deg * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const w = src.width;
  const h = src.height;
  const nw = Math.max(1, Math.floor(w * cos + h * sin));
  const nh = Math.max(1, Math.floor(w * sin + h * cos));
  const c = document.createElement('canvas');
  c.width = nw;
  c.height = nh;
  const ctx = c.getContext('2d')!;
  ctx.translate(nw / 2, nh / 2);
  ctx.rotate(rad);
  ctx.drawImage(src, -w / 2, -h / 2);
  return c;
}

/** 裁剪（坐标均为源画布自然像素）。 */
export function cropCanvas(
  src: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw));
  c.height = Math.max(1, Math.round(sh));
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}

/** 等比缩放（限制最大宽度，高度按比例）。 */
export function resizeCanvas(src: HTMLCanvasElement, maxWidth: number): HTMLCanvasElement {
  if (maxWidth <= 0 || src.width <= maxWidth) return src;
  const ratio = src.height / src.width;
  const w = Math.round(maxWidth);
  const h = Math.max(1, Math.round(maxWidth * ratio));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return c;
}

/** 在透明区域填充背景色（用于 JPEG 导出，避免透明变黑）。 */
export function flattenAlpha(src: HTMLCanvasElement, bg = '#ffffff'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, 0, 0);
  return c;
}

/** 将画布编码为 BMP（32-bit BGRA，自下而上存储）。纯前端实现，无外部依赖。 */
export function canvasToBmpBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D');
  const w = canvas.width;
  const h = canvas.height;
  const src = ctx.getImageData(0, 0, w, h).data;
  const rowBytes = w * 4;
  const pixelBytes = rowBytes * h;
  const fileSize = 54 + pixelBytes;
  const buf = new ArrayBuffer(fileSize);
  const dv = new DataView(buf);
  // BITMAPFILEHEADER
  dv.setUint8(0, 0x42); // 'B'
  dv.setUint8(1, 0x4d); // 'M'
  dv.setUint32(2, fileSize, true);
  dv.setUint32(6, 0, true);
  dv.setUint32(10, 54, true);
  // BITMAPINFOHEADER
  dv.setUint32(14, 40, true);
  dv.setInt32(18, w, true);
  dv.setInt32(22, h, true);
  dv.setUint16(26, 1, true); // planes
  dv.setUint16(28, 32, true); // bpp
  dv.setUint32(30, 0, true); // BI_RGB
  dv.setUint32(34, pixelBytes, true);
  dv.setUint32(38, 2835, true); // ~72 DPI
  dv.setUint32(42, 2835, true);
  dv.setUint32(46, 0, true);
  dv.setUint32(50, 0, true);
  // 像素：自下而上，RGBA → B,G,R,A
  let off = 54;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      dv.setUint8(off++, src[i + 2]); // B
      dv.setUint8(off++, src[i + 1]); // G
      dv.setUint8(off++, src[i]); // R
      dv.setUint8(off++, src[i + 3]); // A
    }
  }
  return new Blob([buf], { type: 'image/bmp' });
}

/** 将画布编码为 ICO（内嵌 PNG，单尺寸，自动缩放到 ≤256 的正方形）。纯前端实现，无外部依赖。 */
export async function canvasToIcoBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const size = Math.min(canvas.width, canvas.height, 256);
  const square = document.createElement('canvas');
  square.width = size;
  square.height = size;
  const sctx = square.getContext('2d')!;
  sctx.fillStyle = '#ffffff';
  sctx.fillRect(0, 0, size, size);
  sctx.drawImage(canvas, 0, 0, size, size);
  const pngBlob = await canvasToBlob(square, 'image/png');
  const png = new Uint8Array(await pngBlob.arrayBuffer());
  const header = new Uint8Array(22);
  const dv = new DataView(header.buffer);
  dv.setUint16(0, 0, true); // reserved
  dv.setUint16(2, 1, true); // image type
  dv.setUint16(4, 1, true); // count
  header[6] = size >= 256 ? 0 : size; // width (0 = 256)
  header[7] = size >= 256 ? 0 : size; // height (0 = 256)
  header[8] = 0; // color count
  header[9] = 0; // reserved
  dv.setUint16(10, 1, true); // planes
  dv.setUint16(12, 32, true); // bpp
  dv.setUint32(14, png.length, true); // bytes in resource
  dv.setUint32(18, 22, true); // offset to image data
  const out = new Uint8Array(22 + png.length);
  out.set(header, 0);
  out.set(png, 22);
  return new Blob([out], { type: 'image/x-icon' });
}

/** 统一导出入口：原生格式走 canvas.toBlob，BMP / ICO 走内置编码器。 */
export async function toOutputBlob(
  canvas: HTMLCanvasElement,
  type: ImageOutFormat,
  quality?: number
): Promise<Blob> {
  if (type === 'image/bmp') return canvasToBmpBlob(canvas);
  if (type === 'image/x-icon') return canvasToIcoBlob(canvas);
  return canvasToBlob(canvas, type, quality);
}

let _avifSupported: Promise<boolean> | null = null;
/** 异步检测浏览器是否支持在 Canvas 中编码 AVIF（结果缓存）。 */
export function detectAvif(): Promise<boolean> {
  if (_avifSupported) return _avifSupported;
  _avifSupported = new Promise((resolve) => {
    try {
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      const ctx = c.getContext('2d');
      if (!ctx) return resolve(false);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 1, 1);
      c.toBlob((b) => resolve(!!b && b.type === 'image/avif'), 'image/avif', 0.9);
    } catch {
      resolve(false);
    }
  });
  return _avifSupported;
}

/** 触发浏览器下载。 */
export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 人类可读的体积。 */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** 格式 → 扩展名。 */
export function extForType(type: ImageOutFormat): string {
  switch (type) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/bmp':
      return 'bmp';
    case 'image/x-icon':
      return 'ico';
    case 'image/avif':
      return 'avif';
  }
}

/** 带扩展名的输出文件名。 */
export function outName(base: string, type: ImageOutFormat): string {
  const baseName = (base.replace(/\.[^.]+$/, '') || 'image').replace(/[^\w\-]+/g, '_');
  return `${baseName}.${extForType(type)}`;
}
