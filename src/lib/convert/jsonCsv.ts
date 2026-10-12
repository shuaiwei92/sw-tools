// JSON ↔ CSV 纯函数（手写，零依赖）。
// - JSON 数组(对象) / 对象 → CSV
// - CSV(首行表头) → JSON 对象数组，自动推断数字/布尔/null

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function coerce(s: string): unknown {
  if (s === '') return '';
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^".*"$/.test(s) || /^\[.*\]$/.test(s) || /^\{.*\}$/.test(s)) {
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }
  return s;
}

/** 极简 CSV 解析（支持引号转义、引号内换行）。返回表头与数据行。 */
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  return { headers, rows: rows.slice(1) };
}

/** JSON 文本 → CSV 文本。支持「对象数组」或「单对象」两种输入。 */
export function jsonToCsv(input: string): string {
  const data = JSON.parse(input);
  if (Array.isArray(data)) {
    if (!data.length) return '';
    const headers = new Set<string>();
    for (const item of data) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.keys(item as Record<string, unknown>).forEach((k) => headers.add(k));
      }
    }
    const cols = [...headers];
    const lines = [cols.join(',')];
    for (const item of data) {
      const rec = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      lines.push(cols.map((c) => csvCell(rec[c])).join(','));
    }
    return lines.join('\n');
  }
  if (data && typeof data === 'object') {
    const lines = ['key,value'];
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      lines.push([csvCell(k), csvCell(v)].join(','));
    }
    return lines.join('\n');
  }
  throw new Error('CSV 导出需要「对象数组」或「对象」形式的 JSON');
}

/** CSV 文本 → 美化 JSON 对象数组。 */
export function csvToJson(input: string): string {
  const { headers, rows } = parseCsv(input);
  if (!headers.length) throw new Error('未解析到表头行');
  const out = rows
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = coerce(r[i] ?? '');
      });
      return obj;
    });
  return JSON.stringify(out, null, 2);
}
