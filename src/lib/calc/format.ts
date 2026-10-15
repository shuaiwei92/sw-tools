// 通用数字格式化（计算器模块共用）

export function fmt(n: number, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
  const abs = Math.abs(n);
  let d = digits;
  if (abs !== 0 && (abs < 0.01 || abs >= 1e12)) d = 6;
  return n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

/** 中文计数单位（万 / 亿） */
export function fmtCN(n: number): string {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e8) return fmt(n / 1e8, 2) + ' 亿';
  if (abs >= 1e4) return fmt(n / 1e4, 2) + ' 万';
  return fmt(n, 2);
}

export function pct(n: number, digits = 2): string {
  return fmt(n, digits) + '%';
}
