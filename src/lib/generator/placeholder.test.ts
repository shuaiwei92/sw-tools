import { describe, it, expect } from 'vitest';
import {
  autoText,
  autoFontSize,
  escapeXml,
  buildPlaceholderSvg,
  svgDataUrl,
  DEFAULT_PLACEHOLDER,
  type PlaceholderOptions,
} from './placeholder';

const base: Partial<PlaceholderOptions> = { width: 800, height: 600, pattern: 'solid', bg: '#e2e8f0', fg: '#64748b' };

describe('autoText / autoFontSize / escapeXml', () => {
  it('自动文字', () => {
    expect(autoText(800, 600)).toBe('800×600');
    expect(autoText(120, 90)).toBe('120×90');
  });

  it('自动字号在约束内', () => {
    const fs = autoFontSize(800, 600, '800×600');
    expect(fs).toBeGreaterThanOrEqual(10);
    expect(fs).toBeLessThanOrEqual(160);
    // 文字越长字号越小
    expect(autoFontSize(800, 600, '很长很长很长的文字内容')).toBeLessThan(fs);
    // 高度约束
    expect(autoFontSize(4000, 100, 'x')).toBeLessThanOrEqual(100 * 0.32 + 1);
  });

  it('XML 转义', () => {
    expect(escapeXml('<a href="x">&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
  });
});

describe('buildPlaceholderSvg', () => {
  it('基本结构', () => {
    const svg = buildPlaceholderSvg(base);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('width="800" height="600"');
    expect(svg).toContain('viewBox="0 0 800 600"');
    expect(svg).toContain('fill="#e2e8f0"');
    expect(svg).toContain('>800×600</text>');
    expect(svg).toContain('x="400" y="300"');
    // 纯色无 pattern
    expect(svg).not.toContain('url(#ph-pattern)');
    expect(svg).not.toContain('<pattern');
  });

  it('自定义文字与字号', () => {
    const svg = buildPlaceholderSvg({ ...base, text: 'Logo Here', fontSize: 48 });
    expect(svg).toContain('>Logo Here</text>');
    expect(svg).toContain('font-size="48"');
  });

  it('文字转义防注入', () => {
    const svg = buildPlaceholderSvg({ ...base, text: '<script>alert(1)</script>' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('图案类型生成对应 pattern', () => {
    for (const p of ['grid', 'dots', 'diagonal', 'cross'] as const) {
      const svg = buildPlaceholderSvg({ ...base, pattern: p });
      expect(svg).toContain('<pattern id="ph-pattern"');
      expect(svg).toContain('url(#ph-pattern)');
    }
    expect(buildPlaceholderSvg({ ...base, pattern: 'grid' })).toContain('stroke="#64748b"');
    expect(buildPlaceholderSvg({ ...base, pattern: 'dots' })).toContain('<circle cx="10" cy="10" r="1.5"');
  });

  it('图案不透明度为 0 时不叠图案层', () => {
    const svg = buildPlaceholderSvg({ ...base, pattern: 'grid', patternOpacity: 0 });
    expect(svg).toContain('<pattern');
    expect(svg).not.toContain('url(#ph-pattern)"');
  });

  it('圆角生成 clipPath', () => {
    const svg = buildPlaceholderSvg({ ...base, radius: 24 });
    expect(svg).toContain('<clipPath id="ph-clip"><rect width="800" height="600" rx="24"/></clipPath>');
    expect(svg).toContain('<g clip-path="url(#ph-clip)">');
  });

  it('圆角超过半高被截断', () => {
    const svg = buildPlaceholderSvg({ ...base, radius: 9999 });
    expect(svg).toContain('rx="300"');
  });

  it('边框', () => {
    const svg = buildPlaceholderSvg({ ...base, borderWidth: 4, borderColor: '#f00' });
    expect(svg).toContain('stroke="#f00" stroke-width="4"');
    expect(svg).toContain('x="2" y="2" width="796" height="596"');
  });

  it('尺寸截断到合法范围', () => {
    expect(buildPlaceholderSvg({ ...base, width: 0, height: -5 })).toContain('width="1" height="1"');
    expect(buildPlaceholderSvg({ ...base, width: 99999 })).toContain('width="4096"');
  });

  it('默认配置可用', () => {
    const svg = buildPlaceholderSvg(DEFAULT_PLACEHOLDER);
    expect(svg).toContain('<pattern');
    expect(svg).toContain('opacity="0.25"');
  });
});

describe('svgDataUrl', () => {
  it('生成可用的 Data URL', () => {
    const svg = buildPlaceholderSvg(base);
    const url = svgDataUrl(svg);
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(url).toContain('%3Csvg'); // < 被编码
    expect(url).not.toContain('<svg');
    // 解码后与原始一致
    expect(decodeURIComponent(url.slice('data:image/svg+xml;charset=utf-8,'.length))).toBe(svg);
  });
});
