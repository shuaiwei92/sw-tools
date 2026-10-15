import { describe, it, expect } from 'vitest';
import { extractPalette, pickAt, averageColor, sortPalette, nearestNamed, contrastSafe, type PaletteColor } from './pick';

/** 构造像素数组：colors 循环填充 count 个像素。 */
function makePixels(colors: [number, number, number][], count: number, alpha = 255): number[] {
  const px: number[] = [];
  for (let i = 0; i < count; i++) {
    const c = colors[i % colors.length];
    px.push(c[0], c[1], c[2], alpha);
  }
  return px;
}

describe('extractPalette', () => {
  it('按占比提取主色', () => {
    const px = [...makePixels([[255, 0, 0]], 100), ...makePixels([[0, 0, 255]], 50)]; // 100 红 + 50 蓝
    const palette = extractPalette(px, 2);
    expect(palette).toHaveLength(2);
    expect(palette[0].hex).toBe('#ff0000');
    expect(palette[1].hex).toBe('#0000ff');
    expect(palette[0].count).toBe(100);
    expect(palette[1].count).toBe(50);
    expect(palette[0].share).toBeCloseTo(100 / 150, 5);
  });

  it('纯色图返回单色', () => {
    const palette = extractPalette(makePixels([[16, 32, 48]], 500), 6);
    expect(palette).toHaveLength(1);
    expect(palette[0].hex).toBe('#102030');
    expect(palette[0].share).toBe(1);
  });

  it('不超过 maxColors', () => {
    const colors: [number, number, number][] = [
      [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [255, 0, 255], [0, 255, 255], [128, 128, 128], [10, 20, 30],
    ];
    const palette = extractPalette(makePixels(colors, 800), 3);
    expect(palette.length).toBeLessThanOrEqual(3);
    const total = palette.reduce((s, c) => s + c.count, 0);
    expect(total).toBe(800);
  });

  it('跳过透明像素', () => {
    const palette = extractPalette(makePixels([[255, 0, 0]], 100, 0), 4);
    expect(palette).toEqual([]);
  });

  it('空输入', () => {
    expect(extractPalette([], 4)).toEqual([]);
    expect(extractPalette([1, 2, 3], 4)).toEqual([]); // 不足一个像素
  });

  it('渐变图提取出两端色', () => {
    const px: number[] = [];
    for (let i = 0; i < 200; i++) {
      const v = i < 100 ? 20 : 220;
      px.push(v, v, v, 255);
    }
    const palette = extractPalette(px, 2);
    expect(palette.map((c) => c.hex).sort()).toEqual(['#141414', '#dcdcdc']);
  });
});

describe('pickAt', () => {
  const px = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255];

  it('按坐标取色', () => {
    expect(pickAt(px, 2, 0, 0)).toBe('#ff0000');
    expect(pickAt(px, 2, 1, 0)).toBe('#00ff00');
    expect(pickAt(px, 2, 0, 1)).toBe('#0000ff');
    expect(pickAt(px, 2, 1, 1)).toBe('#ffffff');
  });

  it('越界返回 null', () => {
    expect(pickAt(px, 2, 2, 0)).toBeNull();
    expect(pickAt(px, 2, -1, 0)).toBeNull();
    expect(pickAt(px, 2, 0, 5)).toBeNull();
    expect(pickAt(px, 0, 0, 0)).toBeNull();
  });

  it('全透明像素返回 null', () => {
    expect(pickAt([0, 0, 0, 0], 1, 0, 0)).toBeNull();
  });
});

describe('averageColor', () => {
  it('平均色', () => {
    expect(averageColor([0, 0, 0, 255, 255, 255, 255, 255])).toBe('#808080');
    expect(averageColor([10, 20, 30, 255])).toBe('#0a141e');
  });
  it('全透明返回 null', () => {
    expect(averageColor([1, 2, 3, 0, 4, 5, 6, 0])).toBeNull();
  });
});

describe('sortPalette', () => {
  const colors: PaletteColor[] = [
    { hex: '#ff0000', count: 10, share: 0.5 },
    { hex: '#000000', count: 5, share: 0.25 },
    { hex: '#ffffff', count: 5, share: 0.25 },
  ];

  it('按占比', () => {
    expect(sortPalette(colors, 'count').map((c) => c.hex)).toEqual(['#ff0000', '#000000', '#ffffff']);
  });

  it('按亮度（亮的在前）', () => {
    expect(sortPalette(colors, 'light')[0].hex).toBe('#ffffff');
    expect(sortPalette(colors, 'light')[2].hex).toBe('#000000');
  });

  it('按色相', () => {
    const sorted = sortPalette(colors, 'hue').map((c) => c.hex);
    expect(sorted[0]).toBe('#ff0000'); // 红 h=0 在最前
  });
});

describe('nearestNamed', () => {
  it('纯色命中', () => {
    expect(nearestNamed('#ff0000').name).toBe('red');
    expect(nearestNamed('#ffff00').name).toBe('yellow');
    expect(nearestNamed('#0000ff').name).toBe('blue');
  });

  it('近似色返回最近命名', () => {
    const r = nearestNamed('#f83800');
    expect(['red', 'orangered', 'tomato']).toContain(r.name);
    expect(r.distance).toBeLessThan(60);
  });
});

describe('contrastSafe', () => {
  it('白底黑字', () => {
    const r = contrastSafe('#ffffff')!;
    expect(r.fg).toBe('#000000');
    expect(r.ratio).toBe(21);
    expect(r.level).toBe('AAA');
  });

  it('黑底白字', () => {
    const r = contrastSafe('#000000')!;
    expect(r.fg).toBe('#ffffff');
    expect(r.level).toBe('AAA');
  });

  it('中间色给出安全建议', () => {
    const r = contrastSafe('#808080')!;
    expect(r.fg).toBe('#000000'); // 中灰配黑字对比更高
    expect(r.ratio).toBeGreaterThan(3);
  });

  it('非法输入 null', () => {
    expect(contrastSafe('not-a-color')).toBeNull();
  });
});
