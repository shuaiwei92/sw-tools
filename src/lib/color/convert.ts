// 颜色工具纯函数库：解析 / 互转 / 对比度 / 配色 / 渐变。无依赖，浏览器与 Node 通用。

export interface RGBA {
  r: number; // 0-255
  g: number;
  b: number;
  a: number; // 0-1
}
export interface HSLA {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
  a: number; // 0-1
}

/** 常用 CSS 命名色（CSS Color Level 4 常用子集，含 transparent）。 */
export const NAMED_COLORS: Record<string, string> = {
  transparent: '#00000000',
  black: '#000000', silver: '#c0c0c0', gray: '#808080', grey: '#808080',
  white: '#ffffff', maroon: '#800000', red: '#ff0000', purple: '#800080',
  fuchsia: '#ff00ff', magenta: '#ff00ff', green: '#008000', lime: '#00ff00',
  olive: '#808000', yellow: '#ffff00', navy: '#000080', blue: '#0000ff',
  teal: '#008080', aqua: '#00ffff', cyan: '#00ffff', orange: '#ffa500',
  pink: '#ffc0cb', brown: '#a52a2a', coral: '#ff7f50', crimson: '#dc143c',
  gold: '#ffd700', indigo: '#4b0082', ivory: '#fffff0', khaki: '#f0e68c',
  lavender: '#e6e6fa', beige: '#f5f5dc', mint: '#98ee98', salmon: '#fa8072',
  tan: '#d2b48c', tomato: '#ff6347', turquoise: '#40e0d0', violet: '#ee82ee',
  orchid: '#da70d6', plum: '#dda0dd', wheat: '#f5deb3', azure: '#f0ffff',
  chocolate: '#d2691e', darkblue: '#00008b', darkcyan: '#008b8b', darkgray: '#a9a9a9',
  darkgreen: '#006400', darkred: '#8b0000', darkorange: '#ff8c00', deeppink: '#ff1493',
  deepskyblue: '#00bfff', dodgerblue: '#1e90ff', firebrick: '#b22222', forestgreen: '#228b22',
  gainsboro: '#dcdcdc', goldenrod: '#daa520', hotpink: '#ff69b4', indianred: '#cd5c5c',
  lightblue: '#add8e6', lightgray: '#d3d3d3', lightgreen: '#90ee90', lightpink: '#ffb6c1',
  lightyellow: '#ffffe0', limegreen: '#32cd32', mediumblue: '#0000cd', mediumpurple: '#9370db',
  midnightblue: '#191970', moccasin: '#ffe4b5', olivedrab: '#6b8e23',
  orangered: '#ff4500', palegreen: '#98fb98', powderblue: '#b0e0e6', rosybrown: '#bc8f8f',
  royalblue: '#4169e1', saddlebrown: '#8b4513', seagreen: '#2e8b57', sienna: '#a0522d',
  skyblue: '#87ceeb', slateblue: '#6a5acd', slategray: '#708090', springgreen: '#00ff7f',
  steelblue: '#4682b4', yellowgreen: '#9acd32',
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v);

/** 解析任意常见格式的颜色串；失败返回 null。 */
export function parseColor(input: string): RGBA | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  const named = NAMED_COLORS[s];
  if (named) return parseColor(named);
  // #rgb / #rgba / #rrggbb / #rrggbbaa
  let m = /^#([0-9a-f]{3,4})$/.exec(s);
  if (m) {
    const h = m[1];
    if (h.length === 3) return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: 1 };
    return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: parseInt(h[3] + h[3], 16) / 255 };
  }
  m = /^#([0-9a-f]{6})$/.exec(s);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
  m = /^#([0-9a-f]{8})$/.exec(s);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: parseInt(m[1].slice(6, 8), 16) / 255 };
  // rgb() / rgba()：支持 123,123,123 / 12%,12%,12% / 123 123 123 / 123（现代空格语法）
  m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const parts = splitComponents(m[1]);
    if (parts.length >= 3) {
      const conv = (p: string) => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p));
      const a = parts.length >= 4 ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1;
      return { r: clamp(round(conv(parts[0])), 0, 255), g: clamp(round(conv(parts[1])), 0, 255), b: clamp(round(conv(parts[2])), 0, 255), a: clamp(a, 0, 1) };
    }
    return null;
  }
  // hsl() / hsla()：支持 deg 与空格语法
  m = /^hsla?\(([^)]+)\)$/.exec(s);
  if (m) {
    const parts = splitComponents(m[1]);
    if (parts.length >= 3) {
      const h = parseHue(parts[0]);
      const sat = parseFloat(parts[1]);
      const lig = parseFloat(parts[2]);
      const a = parts.length >= 4 ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1;
      if ([h, sat, lig].some(Number.isNaN)) return null;
      return hslToRgb({ h, s: clamp(sat, 0, 100), l: clamp(lig, 0, 100), a: clamp(a, 0, 1) });
    }
    return null;
  }
  return null;
}

function splitComponents(s: string): string[] {
  // 逗号或空格分隔（现代 CSS 语法 "123 123 123 / 0.5"）
  if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
  const [main, alpha] = s.split('/');
  const parts = main.trim().split(/\s+/).filter(Boolean);
  if (alpha !== undefined) parts.push(alpha.trim());
  return parts;
}
function parseHue(s: string): number {
  const t = s.trim();
  if (t.endsWith('deg')) return parseFloat(t);
  if (t.endsWith('turn')) return parseFloat(t) * 360;
  if (t.endsWith('rad')) return (parseFloat(t) * 180) / Math.PI;
  if (t.endsWith('grad')) return (parseFloat(t) * 360) / 400;
  return parseFloat(t);
}

// ── 格式互转 ──

export function rgbToHsl({ r, g, b, a = 1 }: RGBA): HSLA {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return { h: round(h) % 360, s: round(s * 100), l: round(l * 100), a };
}

export function hslToRgb({ h, s, l, a = 1 }: HSLA): RGBA {
  const hn = ((h % 360) + 360) % 360 / 360, sn = clamp(s, 0, 100) / 100, ln = clamp(l, 0, 100) / 100;
  if (sn === 0) { const v = round(ln * 255); return { r: v, g: v, b: v, a }; }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const channel = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return { r: round(channel(hn + 1 / 3) * 255), g: round(channel(hn) * 255), b: round(channel(hn - 1 / 3) * 255), a };
}

export function rgbToHsv({ r, g, b, a = 1 }: RGBA) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return { h: round(h) % 360, s: round((max === 0 ? 0 : d / max) * 100), v: round(max * 100), a };
}

export function formatHex(c: RGBA, withAlpha = true): string {
  const h = (v: number) => clamp(round(v), 0, 255).toString(16).padStart(2, '0');
  const base = `#${h(c.r)}${h(c.g)}${h(c.b)}`;
  return withAlpha && c.a < 1 ? base + h(c.a * 255) : base;
}
export function formatRgb(c: RGBA): string {
  return c.a < 1
    ? `rgba(${round(c.r)}, ${round(c.g)}, ${round(c.b)}, ${Number(c.a.toFixed(2))})`
    : `rgb(${round(c.r)}, ${round(c.g)}, ${round(c.b)})`;
}
export function formatHsl(c: RGBA): string {
  const { h, s, l, a } = rgbToHsl(c);
  return a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${Number(a.toFixed(2))})` : `hsl(${h}, ${s}%, ${l}%)`;
}

// ── WCAG 对比度 ──

export function relativeLuminance({ r, g, b }: RGBA): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}
/** WCAG 对比度 1~21。 */
export function contrastRatio(a: RGBA, b: RGBA): number {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** 给定背景色，返回对比度更高的前景色（黑或白）。 */
export function bestTextOn(bg: RGBA): string {
  return contrastRatio(bg, { r: 0, g: 0, b: 0, a: 1 }) >= contrastRatio(bg, { r: 255, g: 255, b: 255, a: 1 }) ? '#000000' : '#ffffff';
}
/** WCAG 等级：AA 需 ≥4.5（大文本 3），AAA 需 ≥7（大文本 4.5）。 */
export function wcagLevel(ratio: number): 'AAA' | 'AA' | 'AA-Large' | 'Fail' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-Large';
  return 'Fail';
}

// ── 调整与混合 ──

export function mix(a: RGBA, b: RGBA, t = 0.5): RGBA {
  const tt = clamp(t, 0, 1);
  return { r: round(a.r + (b.r - a.r) * tt), g: round(a.g + (b.g - a.g) * tt), b: round(a.b + (b.b - a.b) * tt), a: a.a + (b.a - a.a) * tt };
}
/** 明度调整（HSL 空间，delta 为 -100~100 的百分点）。 */
export function adjustLightness(c: RGBA, delta: number): RGBA {
  const hsl = rgbToHsl(c);
  return hslToRgb({ ...hsl, l: clamp(hsl.l + delta, 0, 100) });
}
export function adjustSaturation(c: RGBA, delta: number): RGBA {
  const hsl = rgbToHsl(c);
  return hslToRgb({ ...hsl, s: clamp(hsl.s + delta, 0, 100) });
}

// ── 配色方案 ──

export type HarmonyName = 'complementary' | 'analogous' | 'triadic' | 'splitComplementary' | 'tetradic' | 'monochromatic';
export function harmonies(base: RGBA): Record<HarmonyName, RGBA[]> {
  const hsl = rgbToHsl(base);
  const at = (dh: number, dl = 0, ds = 0) => hslToRgb({ h: hsl.h + dh, s: clamp(hsl.s + ds, 0, 100), l: clamp(hsl.l + dl, 0, 100), a: hsl.a });
  return {
    complementary: [base, at(180)],
    analogous: [at(-30), base, at(30)],
    triadic: [base, at(120), at(240)],
    splitComplementary: [base, at(150), at(210)],
    tetradic: [base, at(90), at(180), at(270)],
    monochromatic: [at(0, -25), at(0, -12), base, at(0, 12), at(0, 25)],
  };
}

// ── 渐变 ──

export interface GradientStop {
  color: string; // 任意可解析颜色
  position: number; // 0-100
}
export interface GradientSpec {
  stops: GradientStop[];
  angle: number; // deg，to bottom = 180
  type?: 'linear' | 'radial';
}
export function gradientCss({ stops, angle, type = 'linear' }: GradientSpec): string {
  const parts = [...stops].sort((a, b) => a.position - b.position).map((s) => `${s.color} ${clamp(round(s.position), 0, 100)}%`);
  if (type === 'radial') return `radial-gradient(circle, ${parts.join(', ')})`;
  return `linear-gradient(${round(angle)}deg, ${parts.join(', ')})`;
}
/** 在两个颜色间生成 n 个停靠点（含两端），用于快速取色带。 */
export function gradientStops(from: RGBA, to: RGBA, n = 5): GradientStop[] {
  const out: GradientStop[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ color: formatHex(mix(from, to, n === 1 ? 0 : i / (n - 1)), false), position: (i / (n - 1)) * 100 });
  }
  return out;
}
