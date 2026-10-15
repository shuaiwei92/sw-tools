// 信息提取：从自由文本中提取邮箱 / URL / 手机号 / IP / 日期 / 数字，分类去重保序。
// 页面支持用户自选要提取的类型，仅计算并展示被选中的类型。

export type ExtractGroupId = 'email' | 'url' | 'phone' | 'ip' | 'date' | 'number';

export interface ExtractGroupMeta {
  id: ExtractGroupId;
  label: string;
  /** 匹配规则说明（用于类型开关的 tooltip） */
  hint: string;
}

export const EXTRACT_GROUPS: ExtractGroupMeta[] = [
  { id: 'email', label: '邮箱地址', hint: 'name@domain.tld 格式' },
  { id: 'url', label: 'URL 链接', hint: 'http / https 开头的链接' },
  { id: 'phone', label: '手机号', hint: '大陆手机号 1[3-9] 开头 11 位' },
  { id: 'ip', label: 'IPv4 地址', hint: '点分十进制，0.0.0.0 ~ 255.255.255.255' },
  { id: 'date', label: '日期', hint: '2026-10-14、2026/10/14 等格式' },
  { id: 'number', label: '数字', hint: '整数与小数（不含日期/手机号/IP/URL 中的数字）' },
];

export type ExtractResult = Record<ExtractGroupId, string[]>;

const PATTERNS: Record<ExtractGroupId, RegExp> = {
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  url: /https?:\/\/[^\s<>"'）】\]，。；]+/g,
  phone: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
  ip: /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?![\d.])/g,
  date: /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}(?![\d/-])/g,
  number: /-?\d+(?:\.\d+)?/g,
};

/** 提取全部类型；URL 会先于数字/IP 剔除自身包含的数字。dedup=false 时保留重复出现的条目。 */
export function extractAll(text: string, dedup = true): ExtractResult {
  const out = {} as ExtractResult;
  for (const g of EXTRACT_GROUPS) {
    const found = text.match(PATTERNS[g.id]) ?? [];
    out[g.id] = dedup ? [...new Set(found)] : found;
  }
  // 日期与手机号内部片段不应混入「数字」结果：剔除被日期/手机号覆盖的数字
  const covered = new Set<string>([...out.date, ...out.phone]);
  out.number = out.number.filter((n) => !covered.has(n));
  // IP 的数字片段同样剔除
  for (const ip of out.ip) {
    for (const seg of ip.split('.')) {
      out.number = out.number.filter((n) => n !== seg);
    }
  }
  // URL 中的数字剔除
  for (const u of out.url) {
    const nums = u.match(/-?\d+(?:\.\d+)?/g) ?? [];
    for (const n of nums) out.number = out.number.filter((x) => x !== n);
  }
  return out;
}

/** 只提取指定类型（页面自选用）。 */
export function extractSelected(text: string, groups: ExtractGroupId[], dedup = true): ExtractResult {
  const all = extractAll(text, dedup);
  const out = {} as ExtractResult;
  for (const g of EXTRACT_GROUPS) out[g.id] = groups.includes(g.id) ? all[g.id] : [];
  return out;
}

/** 单类型提取。 */
export function extract(text: string, group: ExtractGroupId): string[] {
  return extractAll(text)[group];
}
