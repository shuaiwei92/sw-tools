// 图片取色与主色提取：median-cut 量化的纯函数实现（输入为 RGBA 像素数组）。
import {
  formatHex,
  parseColor,
  rgbToHsl,
  relativeLuminance,
  contrastRatio,
  bestTextOn,
  wcagLevel,
  NAMED_COLORS,
  type RGBA,
} from './convert';

export interface PaletteColor {
  hex: string;
  count: number;
  share: number;
}

type Px = [number, number, number];

const MAX_SAMPLE = 20000;

/** 从 RGBA 像素数据提取主色板（median-cut 量化，按占比降序）。 */
export function extractPalette(pixels: ArrayLike<number>, maxColors = 6): PaletteColor[] {
  const total = Math.floor(pixels.length / 4);
  if (total <= 0) return [];
  const step = Math.max(1, Math.ceil(total / MAX_SAMPLE));
  const pts: Px[] = [];
  for (let i = 0; i < total; i += step) {
    const o = i * 4;
    if (pixels[o + 3] < 128) continue;
    pts.push([pixels[o], pixels[o + 1], pixels[o + 2]]);
  }
  if (!pts.length) return [];

  let boxes: Px[][] = [pts];
  while (boxes.length < maxColors) {
    let bi = -1;
    let bestRange = 0;
    let bestCh = 0;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.length < 2) continue;
      const ranges = [0, 1, 2].map((ch) => {
        let mn = 255;
        let mx = 0;
        for (const p of box) {
          if (p[ch] < mn) mn = p[ch];
          if (p[ch] > mx) mx = p[ch];
        }
        return mx - mn;
      });
      const mx = Math.max(ranges[0], ranges[1], ranges[2]);
      if (mx > bestRange) {
        bestRange = mx;
        bestCh = ranges.indexOf(mx);
        bi = i;
      }
    }
    if (bi === -1 || bestRange === 0) break;
    const box = boxes[bi];
    box.sort((a, b) => a[bestCh] - b[bestCh]);
    // 优先在最大颜色间隔处切分（平坦色块分离更干净）；间隔不明显时退回归中位切分
    let splitAt = -1;
    let maxGap = 0;
    for (let i = 1; i < box.length; i++) {
      const gap = box[i][bestCh] - box[i - 1][bestCh];
      if (gap > maxGap) {
        maxGap = gap;
        splitAt = i;
      }
    }
    if (splitAt <= 0 || maxGap < bestRange / 8) splitAt = box.length >> 1;
    boxes = [...boxes.slice(0, bi), box.slice(0, splitAt), box.slice(splitAt), ...boxes.slice(bi + 1)];
  }

  const sum = pts.length;
  return boxes
    .map((box) => {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const p of box) {
        r += p[0];
        g += p[1];
        b += p[2];
      }
      return {
        hex: formatHex({ r: Math.round(r / box.length), g: Math.round(g / box.length), b: Math.round(b / box.length), a: 1 }, false),
        count: box.length,
        share: box.length / sum,
      };
    })
    .sort((a, b) => b.count - a.count);
}

/** 按坐标取色（canvas 像素坐标系），越界或全透明返回 null。 */
export function pickAt(pixels: ArrayLike<number>, width: number, x: number, y: number): string | null {
  if (width <= 0 || x < 0 || y < 0 || x >= width) return null;
  const o = (y * width + x) * 4;
  if (o + 3 >= pixels.length) return null;
  if (pixels[o + 3] === 0) return null;
  return formatHex({ r: pixels[o], g: pixels[o + 1], b: pixels[o + 2], a: pixels[o + 3] / 255 }, false);
}

/** 全图平均色（跳过近透明像素）。 */
export function averageColor(pixels: ArrayLike<number>): string | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
    n++;
  }
  if (!n) return null;
  return formatHex({ r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), a: 1 }, false);
}

/** 调色板排序：占比 / 亮度 / 色相。 */
export function sortPalette(colors: PaletteColor[], by: 'count' | 'light' | 'hue' = 'count'): PaletteColor[] {
  const arr = [...colors];
  if (by === 'count') return arr.sort((a, b) => b.count - a.count);
  const key = (c: PaletteColor): number => {
    const rgba = parseColor(c.hex);
    if (!rgba) return 0;
    return by === 'light' ? relativeLuminance(rgba) : rgbToHsl(rgba).h;
  };
  return arr.sort((a, b) => key(b) - key(a));
}

/** 最近命名色（RGB 欧氏距离，忽略 transparent）。 */
export function nearestNamed(hex: string): { name: string; hex: string; distance: number } {
  const target = parseColor(hex);
  let best = { name: '', hex: '#000000', distance: Infinity };
  if (!target) return best;
  for (const [name, value] of Object.entries(NAMED_COLORS)) {
    if (name === 'transparent') continue;
    const c = parseColor(value);
    if (!c) continue;
    const d = Math.sqrt((c.r - target.r) ** 2 + (c.g - target.g) ** 2 + (c.b - target.b) ** 2);
    if (d < best.distance) best = { name, hex: value, distance: Math.round(d) };
  }
  return best;
}

/** 对比度安全的文字配色建议。 */
export function contrastSafe(hex: string): { fg: string; bg: string; ratio: number; level: string } | null {
  const bg = parseColor(hex);
  if (!bg) return null;
  const fg: RGBA = parseColor(bestTextOn(bg)) ?? { r: 0, g: 0, b: 0, a: 1 };
  const ratio = contrastRatio(fg, bg);
  return {
    fg: formatHex(fg, false),
    bg: formatHex(bg, false),
    ratio: Math.round(ratio * 100) / 100,
    level: wcagLevel(ratio),
  };
}
