// 时间戳 / 日期互转（纯函数，无 DOM 依赖）。
// 约定：ts2date 时按「秒 / 毫秒」单位解析；date2ts 时解析常见日期字符串为毫秒时间戳。

export type TsUnit = 's' | 'ms';

const pad = (x: number) => String(x).padStart(2, '0');

export function tsToText(tsInput: string, unit: TsUnit): string {
  const n = Number(tsInput.trim());
  if (!Number.isFinite(n)) throw new Error('请输入有效的数字时间戳');
  const ms = unit === 's' ? n * 1000 : n;
  const d = new Date(ms);
  if (isNaN(d.getTime())) throw new Error('时间戳超出可表示范围');
  const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const utc = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours()
  )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return [
    `本地时间: ${local}`,
    `UTC 时间: ${utc}`,
    `ISO 8601: ${d.toISOString()}`,
  ].join('\n');
}

export function dateToText(dateInput: string): string {
  const s = dateInput.trim();
  if (!s) throw new Error('请输入日期字符串');
  // 兼容无秒、空格分隔、T 分隔等多种写法
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) throw new Error('无法解析日期，建议格式如 2021-10-18 11:18:10');
  const sec = Math.floor(d.getTime() / 1000);
  return [`秒级时间戳: ${sec}`, `毫秒时间戳: ${d.getTime()}`].join('\n');
}
