// 日期计算器：天数差、日期加减、工作日统计（周一至周五）

function parseDate(s: string): Date {
  const m = (s || '').trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!m) throw new Error('日期格式应为 YYYY-MM-DD');
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(dt.getTime())) throw new Error('无效日期');
  return dt;
}

function p(x: number): string {
  return String(x).padStart(2, '0');
}

export function formatDate(dt: Date): string {
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

export function weekdayName(dt: Date): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dt.getDay()];
}

export interface DateDiffResult {
  days: number;
  weekdays: number;
  weeks: number;
  laterLabel: string;
}

export function dateDifference(d1: string, d2: string): DateDiffResult {
  const a = parseDate(d1);
  const b = parseDate(d2);
  const start = a.getTime() <= b.getTime() ? a : b;
  const end = a.getTime() <= b.getTime() ? b : a;
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  // 工作日统计（含两端，周一至周五）
  let weekdays = 0;
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur.getTime() <= last.getTime()) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) weekdays++;
    cur.setDate(cur.getDate() + 1);
  }
  const laterLabel = end === a ? d1 + '（第一个日期）' : d2 + '（第二个日期）';
  return { days, weekdays, weeks: Math.floor(days / 7), laterLabel };
}

export function addToDate(d: string, days: number): { result: Date; text: string; weekday: string } {
  const dt = parseDate(d);
  dt.setDate(dt.getDate() + days);
  return { result: dt, text: formatDate(dt), weekday: weekdayName(dt) };
}

export function dateToWeekday(d: string): { date: Date; weekday: string; weekNo: number } {
  const dt = parseDate(d);
  // 以周一为一周起点
  const dayIdx = (dt.getDay() + 6) % 7;
  const monday = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - dayIdx);
  const weekNo = Math.ceil((((dt.getTime() - monday.getTime()) / 86400000 + dayIdx) / 7) + 1);
  return { date: dt, weekday: weekdayName(dt), weekNo };
}
