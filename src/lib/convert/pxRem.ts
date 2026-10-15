// px ↔ rem / em 单位换算（CSS 适配常用）。

export interface UnitRow {
  px: number;
  rem: string;
  em: string;
}

/** 常用字号速查表。 */
export function commonRows(base: number): UnitRow[] {
  const pxs = [10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72];
  return pxs.map((px) => ({
    px,
    rem: (px / base).toFixed(4).replace(/\.?0+$/, ''),
    em: (px / base).toFixed(4).replace(/\.?0+$/, ''),
  }));
}

/** px → rem / em 字符串（4 位小数内去零）。 */
export function pxToUnit(px: number, base: number): { rem: string; em: string } {
  if (!Number.isFinite(px) || !Number.isFinite(base) || base <= 0) return { rem: '—', em: '—' };
  const v = (px / base).toFixed(4).replace(/\.?0+$/, '');
  return { rem: v, em: v };
}

/** rem / em → px。 */
export function unitToPx(unit: number, base: number): number {
  if (!Number.isFinite(unit) || !Number.isFinite(base)) return NaN;
  return unit * base;
}
