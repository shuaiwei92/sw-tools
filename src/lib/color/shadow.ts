// CSS box-shadow / text-shadow / filter 的构建与解析，纯函数。

export interface ShadowLayer {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

export interface TextShadow {
  x: number;
  y: number;
  blur: number;
  color: string;
}

export interface FilterSpec {
  blur: number;
  brightness: number;
  contrast: number;
  grayscale: number;
  hueRotate: number;
  invert: number;
  opacity: number;
  saturate: number;
  sepia: number;
}

export const DEFAULT_LAYER: ShadowLayer = { x: 0, y: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.25)', inset: false };

export const DEFAULT_FILTER: FilterSpec = {
  blur: 0,
  brightness: 100,
  contrast: 100,
  grayscale: 0,
  hueRotate: 0,
  invert: 0,
  opacity: 100,
  saturate: 100,
  sepia: 0,
};

const FILTER_ORDER: { key: keyof FilterSpec; fn: string; unit: string }[] = [
  { key: 'blur', fn: 'blur', unit: 'px' },
  { key: 'brightness', fn: 'brightness', unit: '%' },
  { key: 'contrast', fn: 'contrast', unit: '%' },
  { key: 'grayscale', fn: 'grayscale', unit: '%' },
  { key: 'hueRotate', fn: 'hue-rotate', unit: 'deg' },
  { key: 'invert', fn: 'invert', unit: '%' },
  { key: 'opacity', fn: 'opacity', unit: '%' },
  { key: 'saturate', fn: 'saturate', unit: '%' },
  { key: 'sepia', fn: 'sepia', unit: '%' },
];

const n = (v: number): string => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100));

/** 按顶层逗号切分（忽略括号内的逗号，如 rgba(0, 0, 0, .5)）。 */
function splitTopLevel(input: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** 构建 box-shadow 值（多层逗号连接，inset 置于颜色后）。 */
export function buildBoxShadow(layers: ShadowLayer[]): string {
  if (!layers.length) return 'none';
  return layers
    .map((l) => `${n(l.x)}px ${n(l.y)}px ${n(l.blur)}px ${n(l.spread)}px ${l.color}${l.inset ? ' inset' : ''}`)
    .join(', ');
}

/** 解析 box-shadow（要求四段长度；支持 inset、颜色含空格）。 */
export function parseBoxShadow(input: string): ShadowLayer[] | null {
  const s = input.trim();
  if (!s || s === 'none') return [];
  const parts = splitTopLevel(s, ',');
  if (!parts.length) return null;
  const layers: ShadowLayer[] = [];
  for (const part of parts) {
    let body = part;
    let inset = false;
    if (/\binset\b/i.test(body)) {
      inset = true;
      body = body.replace(/\binset\b/i, '').trim();
    }
    const m = body.match(/^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(.+)$/i);
    if (!m) return null;
    layers.push({ x: +m[1], y: +m[2], blur: +m[3], spread: +m[4], color: m[5].trim(), inset });
  }
  return layers;
}

/** 构建 text-shadow 值。 */
export function buildTextShadow(s: TextShadow): string {
  return `${n(s.x)}px ${n(s.y)}px ${n(s.blur)}px ${s.color}`;
}

/** 解析 text-shadow（三段长度 + 颜色）。 */
export function parseTextShadow(input: string): TextShadow | null {
  const m = input.trim().match(/^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(.+)$/i);
  if (!m) return null;
  return { x: +m[1], y: +m[2], blur: +m[3], color: m[4].trim() };
}

/** 构建 filter 值：仅输出非默认函数，按规范顺序排列；全默认返回 none。 */
export function buildFilter(spec: FilterSpec): string {
  const parts: string[] = [];
  for (const { key, fn, unit } of FILTER_ORDER) {
    const v = spec[key];
    if (v === DEFAULT_FILTER[key]) continue;
    parts.push(`${fn}(${n(v)}${unit})`);
  }
  return parts.length ? parts.join(' ') : 'none';
}

/** 解析 filter 值；none / 空串 → 全默认。 */
export function parseFilter(input: string): FilterSpec | null {
  const s = input.trim();
  if (s === '' || s === 'none') return { ...DEFAULT_FILTER };
  const spec: FilterSpec = { ...DEFAULT_FILTER };
  for (const f of s.split(/\s+/)) {
    const m = f.match(/^([a-z-]+)\(([^)]+)\)$/i);
    if (!m) return null;
    const entry = FILTER_ORDER.find((e) => e.fn === m[1].toLowerCase());
    if (!entry) return null;
    const num = parseFloat(m[2]);
    if (Number.isNaN(num)) return null;
    spec[entry.key] = num;
  }
  return spec;
}

export interface ShadowPreset {
  name: string;
  layers: ShadowLayer[];
}

/** 常用阴影预设（Material 高程 + 特殊效果）。 */
export const SHADOW_PRESETS: ShadowPreset[] = [
  { name: '卡片浮起', layers: [{ x: 0, y: 1, blur: 3, spread: 0, color: 'rgba(0,0,0,0.12)', inset: false }] },
  { name: '悬浮按钮', layers: [{ x: 0, y: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.16)', inset: false }] },
  { name: '下拉菜单', layers: [{ x: 0, y: 8, blur: 16, spread: 0, color: 'rgba(0,0,0,0.18)', inset: false }] },
  { name: '弹窗 Dialog', layers: [{ x: 0, y: 12, blur: 24, spread: 0, color: 'rgba(0,0,0,0.2)', inset: false }] },
  { name: '侧边抽屉', layers: [{ x: 0, y: 16, blur: 32, spread: 0, color: 'rgba(0,0,0,0.22)', inset: false }] },
  {
    name: '内阴影（按压）',
    layers: [{ x: 0, y: 2, blur: 4, spread: 0, color: 'rgba(0,0,0,0.24)', inset: true }],
  },
  {
    name: '霓虹光晕',
    layers: [
      { x: 0, y: 0, blur: 8, spread: 0, color: 'rgba(56,189,248,0.8)', inset: false },
      { x: 0, y: 0, blur: 24, spread: 0, color: 'rgba(56,189,248,0.4)', inset: false },
    ],
  },
  {
    name: '硬阴影（新拟态）',
    layers: [
      { x: 6, y: 6, blur: 12, spread: 0, color: 'rgba(0,0,0,0.15)', inset: false },
      { x: -6, y: -6, blur: 12, spread: 0, color: 'rgba(255,255,255,0.9)', inset: false },
    ],
  },
];

export interface FilterPreset {
  name: string;
  spec: Partial<FilterSpec>;
}

/** 常用滤镜预设。 */
export const FILTER_PRESETS: FilterPreset[] = [
  { name: '原图', spec: {} },
  { name: '黑白照片', spec: { grayscale: 100 } },
  { name: '复古胶片', spec: { sepia: 80, contrast: 110, brightness: 105 } },
  { name: '模糊背景', spec: { blur: 8 } },
  { name: '高对比', spec: { contrast: 140, saturate: 120 } },
  { name: '压暗', spec: { brightness: 70 } },
  { name: '反色', spec: { invert: 100 } },
  { name: '冷色调', spec: { hueRotate: 180, saturate: 110 } },
];
