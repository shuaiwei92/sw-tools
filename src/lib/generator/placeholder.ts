// SVG 占位图生成：纯字符串构建，无依赖。

export type PlaceholderPattern = 'solid' | 'grid' | 'dots' | 'diagonal' | 'cross';

export interface PlaceholderOptions {
  width: number;
  height: number;
  bg: string;
  fg: string;
  /** 自定义文字；空串表示自动显示 "宽×高" */
  text: string;
  /** 字号（px）；<=0 时按尺寸自动计算 */
  fontSize: number;
  fontFamily: string;
  pattern: PlaceholderPattern;
  /** 图案不透明度 0~1 */
  patternOpacity: number;
  radius: number;
  borderWidth: number;
  borderColor: string;
}

export const DEFAULT_PLACEHOLDER: PlaceholderOptions = {
  width: 800,
  height: 600,
  bg: '#e2e8f0',
  fg: '#64748b',
  text: '',
  fontSize: 0,
  fontFamily: 'sans-serif',
  pattern: 'grid',
  patternOpacity: 0.25,
  radius: 0,
  borderWidth: 0,
  borderColor: '#94a3b8',
};

export const PATTERN_LABELS: Record<PlaceholderPattern, string> = {
  solid: '纯色',
  grid: '网格',
  dots: '圆点',
  diagonal: '斜线',
  cross: '十字',
};

const SIZE_MIN = 1;
const SIZE_MAX = 4096;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** 自动文字：宽×高。 */
export function autoText(width: number, height: number): string {
  return `${width}×${height}`;
}

/** 自动字号：同时受宽度（按字符数）与高度约束，并做上下限截断。 */
export function autoFontSize(width: number, height: number, text: string): number {
  const len = Math.max(1, [...text].length);
  const byWidth = width / (len * 0.62);
  const byHeight = height * 0.32;
  return Math.round(clamp(Math.min(byWidth, byHeight), 10, 160));
}

/** XML 属性/文本转义。 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function patternContent(pattern: PlaceholderPattern, fg: string): string {
  switch (pattern) {
    case 'grid':
      return `<path d="M0 0.5 H20 M0.5 0 V20" fill="none" stroke="${fg}" stroke-width="1"/>`;
    case 'dots':
      return `<circle cx="10" cy="10" r="1.5" fill="${fg}"/>`;
    case 'diagonal':
      return `<path d="M0 20 L20 0" fill="none" stroke="${fg}" stroke-width="1"/>`;
    case 'cross':
      return `<path d="M10 6.5 V13.5 M6.5 10 H13.5" fill="none" stroke="${fg}" stroke-width="1"/>`;
    default:
      return '';
  }
}

/** 生成占位图 SVG 字符串。 */
export function buildPlaceholderSvg(options: Partial<PlaceholderOptions>): string {
  const opts: PlaceholderOptions = { ...DEFAULT_PLACEHOLDER, ...options };
  const w = clamp(Math.round(opts.width) || SIZE_MIN, SIZE_MIN, SIZE_MAX);
  const h = clamp(Math.round(opts.height) || SIZE_MIN, SIZE_MIN, SIZE_MAX);
  const radius = clamp(opts.radius, 0, Math.floor(Math.min(w, h) / 2));
  const border = clamp(opts.borderWidth, 0, Math.floor(Math.min(w, h) / 4));
  const opacity = clamp(opts.patternOpacity, 0, 1);
  const text = opts.text.trim() || autoText(w, h);
  const fontSize = opts.fontSize > 0 ? clamp(Math.round(opts.fontSize), 6, 1000) : autoFontSize(w, h, text);
  const bg = escapeXml(opts.bg);
  const fg = escapeXml(opts.fg);
  const needClip = radius > 0;

  const defs: string[] = [];
  if (opts.pattern !== 'solid') {
    defs.push(`<pattern id="ph-pattern" width="20" height="20" patternUnits="userSpaceOnUse">${patternContent(opts.pattern, fg)}</pattern>`);
  }
  if (needClip) {
    defs.push(`<clipPath id="ph-clip"><rect width="${w}" height="${h}" rx="${radius}"/></clipPath>`);
  }

  const content: string[] = [];
  if (border > 0) {
    const half = border / 2;
    content.push(
      `<rect x="${half}" y="${half}" width="${w - border}" height="${h - border}" rx="${radius}" fill="none" stroke="${escapeXml(opts.borderColor)}" stroke-width="${border}"/>`,
    );
  }
  content.push(`<rect width="${w}" height="${h}" fill="${bg}"/>`);
  if (opts.pattern !== 'solid' && opacity > 0) {
    content.push(`<rect width="${w}" height="${h}" fill="url(#ph-pattern)" opacity="${opacity}"/>`);
  }
  content.push(
    `<text x="${w / 2}" y="${h / 2}" fill="${fg}" font-family="${escapeXml(opts.fontFamily)}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">${escapeXml(text)}</text>`,
  );

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(text)}">`,
  );
  if (defs.length) {
    parts.push('<defs>', ...defs, '</defs>');
  }
  if (needClip) {
    parts.push('<g clip-path="url(#ph-clip)">', ...content, '</g>');
  } else {
    parts.push(...content);
  }
  parts.push('</svg>');
  return parts.join('');
}

/** SVG → Data URL（可直接用于 <img src> 或 CSS url()）。 */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
