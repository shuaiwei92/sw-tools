import { describe, it, expect } from 'vitest';
import {
  parseColor, formatHex, formatRgb, formatHsl, rgbToHsl, hslToRgb,
  contrastRatio, bestTextOn, wcagLevel, mix, adjustLightness, harmonies,
  gradientCss, gradientStops, relativeLuminance,
} from './convert';

describe('parseColor', () => {
  it('解析 #rgb / #rrggbb / #rrggbbaa / #rgba', () => {
    expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 / 255 });
    expect(parseColor('#f008')).toEqual({ r: 255, g: 0, b: 0, a: 136 / 255 });
  });
  it('解析 rgb/rgba（数字、百分比、现代空格语法）', () => {
    expect(parseColor('rgb(16, 32, 48)')).toEqual({ r: 16, g: 32, b: 48, a: 1 });
    expect(parseColor('rgba(16,32,48,0.5)')).toEqual({ r: 16, g: 32, b: 48, a: 0.5 });
    expect(parseColor('rgb(100% 0% 0%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rgb(255 0 0 / 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
  });
  it('解析 hsl/hsla（deg/turn/rad）', () => {
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('hsl(120deg, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    expect(parseColor('hsla(240, 100%, 50%, 0.4)')).toEqual({ r: 0, g: 0, b: 255, a: 0.4 });
    // 0.5turn = 180deg = cyan
    expect(parseColor('hsl(0.5turn, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 255, a: 1 });
  });
  it('解析命名色，大小写与空格不敏感', () => {
    expect(parseColor('Red')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('  SkyBlue ')).toEqual({ r: 135, g: 206, b: 235, a: 1 });
    expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });
  it('非法输入返回 null', () => {
    expect(parseColor('')).toBeNull();
    expect(parseColor('not-a-color')).toBeNull();
    expect(parseColor('#gg0000')).toBeNull();
    expect(parseColor('rgb(1,2)')).toBeNull();
  });
});

describe('格式互转', () => {
  it('formatHex 输出小写并可选 alpha', () => {
    expect(formatHex({ r: 255, g: 0, b: 0, a: 1 }, false)).toBe('#ff0000');
    expect(formatHex({ r: 255, g: 0, b: 0, a: 0.5 }, true)).toBe('#ff000080');
  });
  it('formatRgb/formatHsl', () => {
    expect(formatRgb({ r: 1, g: 2, b: 3, a: 1 })).toBe('rgb(1, 2, 3)');
    expect(formatRgb({ r: 1, g: 2, b: 3, a: 0.5 })).toBe('rgba(1, 2, 3, 0.5)');
    expect(formatHsl({ r: 255, g: 0, b: 0, a: 1 })).toBe('hsl(0, 100%, 50%)');
  });
  it('rgb→hsl 已知值', () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0, a: 1 })).toEqual({ h: 0, s: 100, l: 50, a: 1 });
    expect(rgbToHsl({ r: 255, g: 255, b: 255, a: 1 })).toEqual({ h: 0, s: 0, l: 100, a: 1 });
    // #4b0082 = indigo
    expect(rgbToHsl({ r: 75, g: 0, b: 130, a: 1 })).toEqual({ h: 275, s: 100, l: 25, a: 1 });
  });
  it('hsl→rgb→hsl 往返误差 ≤1', () => {
    for (const h of [0, 30, 90, 180, 275, 359]) {
      const rgb = hslToRgb({ h, s: 60, l: 40, a: 1 });
      const back = rgbToHsl(rgb);
      expect(Math.abs(back.h - h)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.s - 60)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.l - 40)).toBeLessThanOrEqual(1);
    }
  });
});

describe('WCAG 对比度', () => {
  it('黑白对比度为 21', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(21, 1);
  });
  it('同色对比度为 1', () => {
    expect(contrastRatio({ r: 100, g: 50, b: 200, a: 1 }, { r: 100, g: 50, b: 200, a: 1 })).toBeCloseTo(1, 5);
  });
  it('白色亮度为 1，黑色为 0', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0, a: 1 })).toBeCloseTo(0, 5);
  });
  it('bestTextOn 在浅色背景返回黑、深色背景返回白', () => {
    expect(bestTextOn({ r: 255, g: 255, b: 0, a: 1 })).toBe('#000000');
    expect(bestTextOn({ r: 0, g: 0, b: 128, a: 1 })).toBe('#ffffff');
  });
  it('wcagLevel 分级', () => {
    expect(wcagLevel(21)).toBe('AAA');
    expect(wcagLevel(4.5)).toBe('AA');
    expect(wcagLevel(3)).toBe('AA-Large');
    expect(wcagLevel(1.2)).toBe('Fail');
  });
});

describe('调整、混合与配色', () => {
  it('mix 中点', () => {
    expect(mix({ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 }, 0.5)).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });
  it('adjustLightness 夹紧范围', () => {
    const dark = adjustLightness({ r: 79, g: 70, b: 229, a: 1 }, -100);
    expect(dark.r).toBe(0);
    expect(dark.g).toBe(0);
    expect(dark.b).toBe(0);
  });
  it('harmonies 互补色相差 180°', () => {
    const base = { r: 79, g: 70, b: 229, a: 1 }; // indigo-600
    const h = harmonies(base);
    const h0 = rgbToHsl(base).h;
    const h1 = rgbToHsl(h.complementary[1]).h;
    expect(Math.abs(((h1 - h0) + 360) % 360)).toBe(180);
    expect(h.triadic).toHaveLength(3);
    expect(h.monochromatic).toHaveLength(5);
  });
});

describe('渐变', () => {
  it('gradientCss 按 position 排序输出', () => {
    const css = gradientCss({ stops: [{ color: '#000000', position: 100 }, { color: '#ffffff', position: 0 }], angle: 90 });
    expect(css).toBe('linear-gradient(90deg, #ffffff 0%, #000000 100%)');
  });
  it('radial 类型', () => {
    const css = gradientCss({ stops: [{ color: '#ff0000', position: 0 }, { color: '#0000ff', position: 100 }], angle: 0, type: 'radial' });
    expect(css).toBe('radial-gradient(circle, #ff0000 0%, #0000ff 100%)');
  });
  it('gradientStops 生成 n 个含两端停靠点', () => {
    const stops = gradientStops({ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 }, 5);
    expect(stops).toHaveLength(5);
    expect(stops[0]).toEqual({ color: '#000000', position: 0 });
    expect(stops[4]).toEqual({ color: '#ffffff', position: 100 });
    expect(stops[2].color).toBe('#808080');
  });
});
