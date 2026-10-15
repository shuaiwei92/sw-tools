import { describe, it, expect } from 'vitest';
import {
  buildBoxShadow,
  parseBoxShadow,
  buildTextShadow,
  parseTextShadow,
  buildFilter,
  parseFilter,
  DEFAULT_FILTER,
  SHADOW_PRESETS,
  FILTER_PRESETS,
  type ShadowLayer,
} from './shadow';

describe('box-shadow', () => {
  it('单层构建', () => {
    expect(
      buildBoxShadow([{ x: 0, y: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.25)', inset: false }]),
    ).toBe('0px 4px 8px 0px rgba(0,0,0,0.25)');
  });

  it('inset 置于颜色后，多层逗号连接', () => {
    expect(
      buildBoxShadow([
        { x: 0, y: 1, blur: 2, spread: 0, color: '#0001', inset: true },
        { x: 2, y: 2, blur: 4, spread: 1, color: '#fff', inset: false },
      ]),
    ).toBe('0px 1px 2px 0px #0001 inset, 2px 2px 4px 1px #fff');
  });

  it('小数取两位', () => {
    expect(buildBoxShadow([{ x: 0.005, y: -1.239, blur: 2.5, spread: 0, color: '#000', inset: false }])).toBe(
      '0.01px -1.24px 2.5px 0px #000',
    );
  });

  it('空数组 → none', () => {
    expect(buildBoxShadow([])).toBe('none');
  });

  it('解析四段长度（含 rgba 逗号与 inset）', () => {
    const layers = parseBoxShadow('0px 4px 8px 0px rgba(0, 0, 0, 0.25), 0px 1px 2px 0px #000 inset');
    expect(layers).toEqual([
      { x: 0, y: 4, blur: 8, spread: 0, color: 'rgba(0, 0, 0, 0.25)', inset: false },
      { x: 0, y: 1, blur: 2, spread: 0, color: '#000', inset: true },
    ]);
  });

  it('解析允许省略 px 与负值', () => {
    expect(parseBoxShadow('-2 -4 6 0 #333')).toEqual([{ x: -2, y: -4, blur: 6, spread: 0, color: '#333', inset: false }]);
  });

  it('none 与空串解析为空数组', () => {
    expect(parseBoxShadow('none')).toEqual([]);
    expect(parseBoxShadow('  ')).toEqual([]);
  });

  it('非法输入返回 null', () => {
    expect(parseBoxShadow('0 4px 8px #000')).toBeNull(); // 只有三段
    expect(parseBoxShadow('foo bar')).toBeNull();
    expect(parseBoxShadow('0px 4px 8px 0px')).toBeNull(); // 缺颜色
  });

  it('构建 → 解析往返一致', () => {
    for (const preset of SHADOW_PRESETS) {
      const parsed = parseBoxShadow(buildBoxShadow(preset.layers));
      expect(parsed).toEqual(preset.layers);
    }
  });
});

describe('text-shadow', () => {
  it('构建与解析', () => {
    expect(buildTextShadow({ x: 1, y: 2, blur: 3, color: '#fff' })).toBe('1px 2px 3px #fff');
    expect(parseTextShadow('1px 2px 3px #fff')).toEqual({ x: 1, y: 2, blur: 3, color: '#fff' });
    expect(parseTextShadow('1px 2px 3px rgba(0, 0, 0, 0.5)')).toEqual({ x: 1, y: 2, blur: 3, color: 'rgba(0, 0, 0, 0.5)' });
    expect(parseTextShadow('bad')).toBeNull();
  });
});

describe('filter', () => {
  it('全默认 → none', () => {
    expect(buildFilter(DEFAULT_FILTER)).toBe('none');
  });

  it('仅输出非默认值且按规范顺序', () => {
    expect(buildFilter({ ...DEFAULT_FILTER, sepia: 80, blur: 4, brightness: 120 })).toBe('blur(4px) brightness(120%) sepia(80%)');
  });

  it('解析函数链', () => {
    const spec = parseFilter('blur(4px) brightness(120%) hue-rotate(90deg)');
    expect(spec).toEqual({ ...DEFAULT_FILTER, blur: 4, brightness: 120, hueRotate: 90 });
  });

  it('none / 空串 → 全默认', () => {
    expect(parseFilter('none')).toEqual(DEFAULT_FILTER);
    expect(parseFilter('')).toEqual(DEFAULT_FILTER);
  });

  it('非法函数返回 null', () => {
    expect(parseFilter('blur(4px) unknown(1)')).toBeNull();
    expect(parseFilter('blur(abc)')).toBeNull();
  });

  it('构建 → 解析往返一致（含预设）', () => {
    for (const p of FILTER_PRESETS) {
      const spec = { ...DEFAULT_FILTER, ...p.spec };
      const parsed = parseFilter(buildFilter(spec));
      expect(parsed).toEqual(spec);
    }
  });
});

describe('预设', () => {
  it('阴影预设均可构建', () => {
    for (const p of SHADOW_PRESETS) {
      expect(buildBoxShadow(p.layers)).not.toBe('none');
      expect(p.name).toBeTruthy();
    }
  });

  it('滤镜预设名称唯一', () => {
    const names = FILTER_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
