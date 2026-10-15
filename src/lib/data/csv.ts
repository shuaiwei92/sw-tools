// 健壮的 CSV 解析 / 序列化（兼容 RFC 4180 常见变体）。
// 支持：BOM 剥离、自动识别分隔符、引号转义（""）、引号内换行/分隔符、
// 可选表头、跳过空行、数字/布尔/null 类型推断（可选，默认保留原字符串以免丢失前导零）。

export type Delimiter = ',' | ';' | '\t' | '|';
export const DELIMITERS: Delimiter[] = [',', ';', '\t', '|'];

export interface CsvParseOptions {
  /** 分隔符；缺省自动探测（逗号/分号/制表符/竖线） */
  delimiter?: Delimiter | string;
  /** 首行是否作为表头，缺省 true */
  hasHeader?: boolean;
  /** 是否跳过完全空白的行，缺省 true */
  skipEmptyRows?: boolean;
}

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

/** 探测第一行的分隔符：取候选中出现次数最多者。 */
export function detectDelimiter(text: string): Delimiter | string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  let best: Delimiter | string = ',';
  let bestCount = -1;
  for (const d of DELIMITERS) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/** 解析 CSV 文本为 表头 + 二维数据行。 */
export function parseCsv(text: string, opts: CsvParseOptions = {}): CsvTable {
  let src = text;
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1); // 剥离 UTF-8 BOM
  const delim = opts.delimiter ?? detectDelimiter(src);
  const skipEmpty = opts.skipEmptyRows ?? true;

  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delim) {
      record.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      if (src[i + 1] === '\n') i++;
      record.push(field);
      field = '';
      records.push(record);
      record = [];
      i++;
      continue;
    }
    if (c === '\n') {
      record.push(field);
      field = '';
      records.push(record);
      record = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // 收尾：处理最后一个字段 / 行
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  let parsed = records;
  if (skipEmpty) parsed = parsed.filter((r) => r.some((c) => c.trim() !== ''));

  if (opts.hasHeader === false || parsed.length === 0) {
    const width = parsed.reduce((m, r) => Math.max(m, r.length), 0);
    return { headers: Array.from({ length: width }, (_, k) => `列${k + 1}`), rows: parsed };
  }
  const headers = parsed[0].map((h, k) => (h.trim() === '' ? `列${k + 1}` : h));
  const width = Math.max(headers.length, ...parsed.slice(1).map((r) => r.length));
  const rows = parsed.slice(1).map((r) => {
    const row = r.slice();
    while (row.length < width) row.push('');
    return row;
  });
  return { headers, rows };
}

function needsQuote(v: string, sep: string): boolean {
  return v === '' || v.includes(sep) || v.includes('"') || v.includes('\n') || v.includes('\r');
}

/** 序列化 表头 + 二维数据行 为 CSV 文本。 */
export function serializeCsv(headers: string[], rows: string[][], sep: string = ',', newline = '\n'): string {
  const esc = (v: string) => (needsQuote(v, sep) ? '"' + v.replace(/"/g, '""') + '"' : v);
  const lines: string[] = [];
  if (headers.length) lines.push(headers.map(esc).join(sep));
  for (const row of rows) lines.push(row.map(esc).join(sep));
  return lines.join(newline);
}

/** 字符串 -> 推断类型（数字 / 布尔 / null）。仅在开启类型推断时调用。 */
export function coerceValue(s: string): unknown {
  if (s === '') return '';
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

/** 表头 + 数据行 -> 对象数组（可关闭类型推断以保留前导零等原始字符串）。 */
export function csvToObjects(headers: string[], rows: string[][], opts: { coerce?: boolean } = {}): Record<string, unknown>[] {
  const coerce = opts.coerce ?? true;
  return rows.map((r) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const v = r[i] ?? '';
      obj[h] = coerce ? coerceValue(v) : v;
    });
    return obj;
  });
}

/** 任意 JSON -> CSV 文本（对象数组 / 单对象 / 标量数组）。 */
export function jsonToCsv(input: string): string {
  const data = JSON.parse(input);
  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    if (data.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
      const headers = new Set<string>();
      for (const item of data) Object.keys(item as Record<string, unknown>).forEach((k) => headers.add(k));
      const cols = [...headers];
      const rows = (data as Record<string, unknown>[]).map((item) => cols.map((c) => cellToCsv(item[c])));
      return serializeCsv(cols, rows);
    }
    return serializeCsv(['value'], data.map((v) => [cellToCsv(v)]));
  }
  if (data && typeof data === 'object') {
    const rows = Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, cellToCsv(v)]);
    return serializeCsv(['key', 'value'], rows);
  }
  throw new Error('CSV 导出需要「对象数组」或「对象」形式的 JSON');
}

function cellToCsv(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** 表头 + 数据行 -> GitHub 风格 Markdown 表格。 */
export function csvToMarkdown(headers: string[], rows: string[][], sep = '|'): string {
  const esc = (v: string) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const lines: string[] = [];
  lines.push('| ' + headers.map(esc).join(' | ') + ' |');
  lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');
  for (const row of rows) lines.push('| ' + headers.map((_, i) => esc(row[i] ?? '')).join(' | ') + ' |');
  return lines.join('\n');
}
