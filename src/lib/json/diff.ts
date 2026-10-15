// JSON 结构化差异对比：递归对比两个值，同路径直接对比，输出 新增/删除/修改/未变 分组。
// 路径语法：$.a.b[0].c；键名含特殊字符时用 ["my key"]；数组默认按索引，可选按 id 匹配。
// 类型变化（如 字符串 ↔ 对象）在相同路径产生单条 modified，两侧值均可展示。

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';
export type JsonType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface DiffEntry {
  /** 形如 $.user.tags[0] */
  path: string;
  type: DiffType;
  /** 值的类型（用于图标/着色；modified 取新值类型） */
  valueType: JsonType;
  /** 修改/删除时给出旧值 */
  oldValue?: string;
  /** 修改/新增时给出新值 */
  newValue?: string;
}

export interface DiffStats {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  /** = added + removed + modified */
  total: number;
}

export interface JsonDiffResult {
  entries: DiffEntry[];
  stats: DiffStats;
}

export interface DiffOptions {
  /** 是否包含未变化条目，默认 false */
  includeUnchanged?: boolean;
  /** 数组匹配方式：index=按位置（默认）；id=对象数组按 id 字段匹配 */
  arrayMode?: 'index' | 'id';
  /** 叶子值展示的最大长度，超出截断，默认 120 */
  maxValueLength?: number;
}

const MAX_DEPTH = 64;

export function jsonType(v: unknown): JsonType {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'object') return 'object';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  return 'string';
}

/** 值的紧凑展示（JSON 序列化后截断，截断长度含两端引号）。 */
export function formatValue(v: unknown, maxLen = 120): string {
  if (v === undefined) return '';
  let s: string;
  try {
    s = JSON.stringify(v);
  } catch {
    s = String(v);
  }
  if (s === undefined) s = String(v);
  if (s.length > maxLen) s = s.slice(0, maxLen) + `…（共 ${s.length} 字符）`;
  return s;
}

/** 键序无关的稳定序列化，用于相等判断（如 {"a":1,"b":2} 与 {"b":2,"a":1} 视为相同）。 */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify((v as Record<string, unknown>)[k])).join(',') + '}';
}

function keySegment(k: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(k) ? `.${k}` : `[${JSON.stringify(k)}]`;
}

/** 对比两个已解析的 JSON 值。 */
export function diffJson(a: unknown, b: unknown, options: DiffOptions = {}): JsonDiffResult {
  const opts: Required<DiffOptions> = {
    includeUnchanged: options.includeUnchanged ?? false,
    arrayMode: options.arrayMode ?? 'index',
    maxValueLength: options.maxValueLength ?? 120,
  };
  const entries: DiffEntry[] = [];
  const stats: DiffStats = { added: 0, removed: 0, modified: 0, unchanged: 0, total: 0 };
  walk(a, b, '$', opts, entries, stats, 0);
  stats.total = stats.added + stats.removed + stats.modified;
  return { entries, stats };
}

function push(entries: DiffEntry[], stats: DiffStats, e: DiffEntry): void {
  entries.push(e);
  if (e.type === 'added') stats.added++;
  else if (e.type === 'removed') stats.removed++;
  else if (e.type === 'modified') stats.modified++;
  else stats.unchanged++;
}

function walk(a: unknown, b: unknown, path: string, opts: Required<DiffOptions>, entries: DiffEntry[], stats: DiffStats, depth: number): void {
  // 深度保护：超限按叶子整体对比
  if (depth > MAX_DEPTH) {
    leaf(a, b, path, opts, entries, stats);
    return;
  }
  const aArr = Array.isArray(a), bArr = Array.isArray(b);
  const aObj = a !== null && typeof a === 'object' && !aArr;
  const bObj = b !== null && typeof b === 'object' && !bArr;

  if (aArr && bArr) {
    walkArray(a as unknown[], b as unknown[], path, opts, entries, stats, depth);
    return;
  }
  if (aObj && bObj) {
    const ao = a as Record<string, unknown>, bo = b as Record<string, unknown>;
    const keys = [...Object.keys(ao), ...Object.keys(bo).filter((k) => !(k in ao))];
    for (const k of keys) {
      const p = path + keySegment(k);
      if (!(k in bo)) push(entries, stats, { path: p, type: 'removed', valueType: jsonType(ao[k]), oldValue: formatValue(ao[k], opts.maxValueLength) });
      else if (!(k in ao)) push(entries, stats, { path: p, type: 'added', valueType: jsonType(bo[k]), newValue: formatValue(bo[k], opts.maxValueLength) });
      else walk(ao[k], bo[k], p, opts, entries, stats, depth + 1);
    }
    return;
  }
  // 其余情况（叶子 vs 叶子、类型变化）统一按叶子对比
  leaf(a, b, path, opts, entries, stats);
}

function walkArray(a: unknown[], b: unknown[], path: string, opts: Required<DiffOptions>, entries: DiffEntry[], stats: DiffStats, depth: number): void {
  if (opts.arrayMode === 'id') {
    const idOf = (x: unknown) => (x !== null && typeof x === 'object' && !Array.isArray(x) && 'id' in (x as object) ? String((x as { id: unknown }).id) : null);
    const bById = new Map<string, unknown>();
    b.forEach((x) => { const id = idOf(x); if (id !== null) bById.set(id, x); });
    const seen = new Set<string>();
    a.forEach((x) => {
      const id = idOf(x);
      if (id === null) return; // 无 id 元素在下方按索引兜底处理
      seen.add(id);
      const p = path + `[id=${JSON.stringify(id)}]`;
      if (bById.has(id)) walk(x, bById.get(id), p, opts, entries, stats, depth + 1);
      else push(entries, stats, { path: p, type: 'removed', valueType: jsonType(x), oldValue: formatValue(x, opts.maxValueLength) });
    });
    b.forEach((x) => {
      const id = idOf(x);
      if (id === null || seen.has(id)) return;
      push(entries, stats, { path: path + `[id=${JSON.stringify(id)}]`, type: 'added', valueType: jsonType(x), newValue: formatValue(x, opts.maxValueLength) });
    });
    // 任一侧含无 id 元素时，退化为按索引对比这些位置
    const aNoId = a.filter((x) => idOf(x) === null);
    const bNoId = b.filter((x) => idOf(x) === null);
    if (aNoId.length || bNoId.length) {
      const n = Math.max(aNoId.length, bNoId.length);
      for (let i = 0; i < n; i++) {
        const p = `${path}[${i}]`;
        if (i >= bNoId.length) push(entries, stats, { path: p, type: 'removed', valueType: jsonType(aNoId[i]), oldValue: formatValue(aNoId[i], opts.maxValueLength) });
        else if (i >= aNoId.length) push(entries, stats, { path: p, type: 'added', valueType: jsonType(bNoId[i]), newValue: formatValue(bNoId[i], opts.maxValueLength) });
        else walk(aNoId[i], bNoId[i], p, opts, entries, stats, depth + 1);
      }
    }
    return;
  }
  // 按索引对比
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const p = `${path}[${i}]`;
    if (i >= b.length) push(entries, stats, { path: p, type: 'removed', valueType: jsonType(a[i]), oldValue: formatValue(a[i], opts.maxValueLength) });
    else if (i >= a.length) push(entries, stats, { path: p, type: 'added', valueType: jsonType(b[i]), newValue: formatValue(b[i], opts.maxValueLength) });
    else walk(a[i], b[i], p, opts, entries, stats, depth + 1);
  }
}

function leaf(a: unknown, b: unknown, path: string, opts: Required<DiffOptions>, entries: DiffEntry[], stats: DiffStats): void {
  if (stableStringify(a) === stableStringify(b)) {
    if (opts.includeUnchanged) {
      push(entries, stats, { path, type: 'unchanged', valueType: jsonType(a), oldValue: formatValue(a, opts.maxValueLength), newValue: formatValue(b, opts.maxValueLength) });
    } else {
      stats.unchanged++;
    }
    return;
  }
  push(entries, stats, {
    path,
    type: 'modified',
    valueType: jsonType(b),
    oldValue: formatValue(a, opts.maxValueLength),
    newValue: formatValue(b, opts.maxValueLength),
  });
}

/** 便捷入口：直接传 JSON 文本。返回 error 字段表示解析失败。 */
export function diffJsonText(aText: string, bText: string, options: DiffOptions = {}): JsonDiffResult & { error?: string } {
  let a: unknown, b: unknown;
  try {
    a = JSON.parse(aText);
  } catch (e) {
    return { entries: [], stats: { added: 0, removed: 0, modified: 0, unchanged: 0, total: 0 }, error: `左侧 JSON 解析失败：${(e as Error).message}` };
  }
  try {
    b = JSON.parse(bText);
  } catch (e) {
    return { entries: [], stats: { added: 0, removed: 0, modified: 0, unchanged: 0, total: 0 }, error: `右侧 JSON 解析失败：${(e as Error).message}` };
  }
  return diffJson(a, b, options);
}
