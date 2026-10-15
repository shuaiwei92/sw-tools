// 百分比计算器：多种常用模式

export interface PctResult {
  value: number;
  detail: string;
}

function fmt0(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/** A 是 B 的百分之几 */
export function pctWhat(part: number, whole: number): PctResult {
  if (whole === 0) throw new Error('基数 B 不能为 0');
  const v = (part / whole) * 100;
  return { value: v, detail: `${fmt0(part)} 是 ${fmt0(whole)} 的 ${v.toFixed(4)}%` };
}

/** A 的 B% 是多少 */
export function pctOf(percent: number, whole: number): PctResult {
  const v = (percent / 100) * whole;
  return { value: v, detail: `${fmt0(whole)} 的 ${fmt0(percent)}% = ${fmt0(v)}` };
}

/** A 增加 B% */
export function pctIncrease(base: number, percent: number): PctResult {
  const v = base * (1 + percent / 100);
  return { value: v, detail: `${fmt0(base)} 增加 ${fmt0(percent)}% = ${fmt0(v)}` };
}

/** A 减少 B% */
export function pctDecrease(base: number, percent: number): PctResult {
  const v = base * (1 - percent / 100);
  return { value: v, detail: `${fmt0(base)} 减少 ${fmt0(percent)}% = ${fmt0(v)}` };
}

/** 从 A 变为 B，变化百分之几（可正可负） */
export function pctChange(from: number, to: number): PctResult {
  if (from === 0) throw new Error('原值 A 不能为 0');
  const v = ((to - from) / from) * 100;
  return { value: v, detail: `从 ${fmt0(from)} 到 ${fmt0(to)}，${v >= 0 ? '增长' : '下降'} ${Math.abs(v).toFixed(4)}%` };
}

/** 原价 A 打 B 折（B 为百分比，如 80 表示八折） */
export function pctDiscount(price: number, discount: number): PctResult {
  const v = price * (1 - discount / 100);
  return { value: v, detail: `原价 ${fmt0(price)} 打 ${fmt0(discount)}% 折 = ${fmt0(v)}（省 ${fmt0(price - v)}）` };
}
