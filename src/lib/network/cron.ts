// Cron 表达式解析 / 描述 / 下次执行时间计算（纯函数，零依赖）。
// 支持标准五段：分 时 日 月 周；语法：* 、数字、a-b、a-b/n、*/n、逗号列表。

export interface CronField {
  name: string;
  spec: string;
}

export interface ParsedCron {
  fields: CronField[];
  error?: string;
}

const FIELD_NAMES = ['分钟', '小时', '日', '月', '星期'];

/** cron 简写（@daily 等）→ 标准五段。 */
const SHORTCUTS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

function normalize(expr: string): string {
  const t = expr.trim();
  return SHORTCUTS[t.toLowerCase()] ?? t;
}

/** 把一段 cron 字段解析为匹配集合（null 表示 * 即全匹配）。 */
function parseField(spec: string, min: number, max: number): Set<number> | null {
  if (spec === '*') return null;
  const set = new Set<number>();
  for (const part of spec.split(',')) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    const step = stepMatch ? Number(stepMatch[2]) : 1;
    const rangePart = stepMatch ? stepMatch[1] : part;
    let lo: number, hi: number;
    if (rangePart === '*') {
      lo = min;
      hi = max;
    } else if (rangePart.includes('-')) {
      const [a, b] = rangePart.split('-').map(Number);
      lo = a;
      hi = b;
    } else {
      lo = Number(rangePart);
      hi = stepMatch ? max : lo;
    }
    if ([lo, hi, step].some((n) => !Number.isFinite(n)) || lo < min || hi > max || lo > hi || step < 1) {
      throw new Error(`字段值超出范围或写法错误：${part}`);
    }
    for (let v = lo; v <= hi; v += step) set.add(v);
  }
  return set;
}

export function parseCron(expr: string): ParsedCron {
  const parts = normalize(expr).split(/\s+/);
  if (parts.length !== 5) {
    return { fields: [], error: `需要 5 个字段（分 时 日 月 周），当前 ${parts.length} 个` };
  }
  const ranges: [number, number][] = [
    [0, 59],
    [0, 23],
    [1, 31],
    [1, 12],
    [0, 7],
  ];
  const fields: CronField[] = [];
  for (let i = 0; i < 5; i++) {
    try {
      parseField(parts[i], ranges[i][0], ranges[i][1]);
    } catch (e) {
      return { fields: [], error: `${FIELD_NAMES[i]}字段错误：${(e as Error).message}` };
    }
    fields.push({ name: FIELD_NAMES[i], spec: parts[i] });
  }
  return { fields };
}

/** 把 cron 表达式转成中文描述（常见句式优先，复杂表达式分段拼接）。 */
export function describeCron(expr: string): string {
  const [minSpec, hourSpec, domSpec, monSpec, dowSpec] = normalize(expr).split(/\s+/);
  if (!minSpec || !hourSpec || !domSpec || !monSpec || !dowSpec) return '表达式不完整';

  const DOW = ['日', '一', '二', '三', '四', '五', '六', '日'];
  const listDow = (spec: string) =>
    spec
      .split(',')
      .flatMap((s) => {
        const base = s.split('/')[0];
        if (base.includes('-')) {
          const [a, b] = base.split('-').map(Number);
          const out: string[] = [];
          for (let n = a; n <= b; n++) out.push(DOW[n === 7 ? 0 : n]);
          return out;
        }
        const n = Number(base);
        return [DOW[n === 7 ? 0 : n] ?? base];
      })
      .join('、');

  // 时间部分
  let timePart: string;
  if (minSpec === '*' && hourSpec === '*') return '每分钟';
  if (minSpec.startsWith('*/')) timePart = `每 ${minSpec.slice(2)} 分钟`;
  else if (hourSpec === '*') timePart = `每小时第 ${minSpec} 分钟`;
  else if (minSpec.startsWith('*/') && hourSpec.startsWith('*/')) timePart = `每 ${hourSpec.slice(2)} 小时内的每 ${minSpec.slice(2)} 分钟`;
  else timePart = `${hourSpec} 时 ${minSpec} 分`;

  // 日期部分
  let datePart: string;
  if (domSpec === '*' && dowSpec === '*' && monSpec === '*') datePart = '每天';
  else if (domSpec === '*' && dowSpec === '*') datePart = `每年 ${monSpec} 月`;
  else if (domSpec !== '*' && dowSpec === '*') datePart = monSpec === '*' ? `每月 ${domSpec} 日` : `每年 ${monSpec} 月 ${domSpec} 日`;
  else if (domSpec === '*' && dowSpec !== '*') datePart = monSpec === '*' ? `每周${listDow(dowSpec)}` : `每年 ${monSpec} 月每周${listDow(dowSpec)}`;
  else datePart = `每月 ${domSpec} 日或每周${listDow(dowSpec)}`;

  return `${datePart} ${timePart}`.replace(/\s+/g, ' ').trim();
}

/** 对外描述入口：对纯频率表达式（分钟段为步进、其余均为星号）省略多余的"每天"前缀。 */
export function describeCronExpr(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  const desc = describeCron(expr);
  if (parts.length === 5 && parts[1] === '*' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
    if (parts[0].startsWith('*/')) return desc.replace(/^每天\s+/, '');
  }
  return desc;
}

/** 计算接下来 count 次执行时间（从 from 的下一分钟开始）。 */
export function nextRuns(expr: string, count = 5, from: Date = new Date()): Date[] {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return [];
  let minS: Set<number> | null, hourS: Set<number> | null, domS: Set<number> | null, monS: Set<number> | null, dowS: Set<number> | null;
  try {
    minS = parseField(parts[0], 0, 59);
    hourS = parseField(parts[1], 0, 23);
    domS = parseField(parts[2], 1, 31);
    monS = parseField(parts[3], 1, 12);
    dowS = parseField(parts[4], 0, 7);
  } catch {
    return [];
  }
  if (dowS?.has(7)) {
    // 0 和 7 都表示周日
    dowS.add(0);
  }

  const hits: Date[] = [];
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  const limit = 366 * 24 * 60; // 最多向前找一年，防死循环
  for (let i = 0; i < limit && hits.length < count; i++) {
    const mo = d.getMonth() + 1;
    const day = d.getDate();
    const wd = d.getDay();
    const domOk = !domS || domS.has(day);
    const dowOk = !dowS || dowS.has(wd);
    // Vixie cron 语义：日与周都限制时取并集
    const dayOk = domS && dowS ? domOk || dowOk : domOk && dowOk;
    if ((!monS || monS.has(mo)) && dayOk && (!hourS || hourS.has(d.getHours())) && (!minS || minS.has(d.getMinutes()))) {
      hits.push(new Date(d));
    }
    d.setMinutes(d.getMinutes() + 1);
  }
  return hits;
}
