// 把 JSON 渲染为表格模型（对象数组 → 列表面格；对象 / 标量 → 键值表），
// 并提供 HTML / Markdown 两种输出。纯函数、零依赖、浏览器与 Node 通用。

export interface TableModel {
  headers: string[];
  rows: string[][];
  /** 表格语义：list = 多条记录（首行为字段）；kv = 单条键值对 */
  kind: 'list' | 'kv';
}

export type JsonTableMode = 'auto' | 'list' | 'kv';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cellValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** JSON 文本 → 表格模型。mode=auto 时：对象数组走 list，其余走 kv。 */
export function jsonToTableModel(input: string, mode: JsonTableMode = 'auto'): TableModel {
  const data = JSON.parse(input);
  const isObjArray =
    Array.isArray(data) && data.length > 0 && data.every((x) => x && typeof x === 'object' && !Array.isArray(x));
  const useKv = mode === 'kv' || (mode === 'auto' && !isObjArray);

  if (useKv) {
    const pairs: [string, unknown][] = Array.isArray(data)
      ? data.map((v, i) => [String(i), v])
      : Object.entries(data as Record<string, unknown>);
    return {
      kind: 'kv',
      headers: ['键', '值'],
      rows: pairs.map(([k, v]) => [k, cellValue(v)]),
    };
  }

  if (isObjArray) {
    const items = data as Record<string, unknown>[];
    const headers = new Set<string>();
    for (const item of items) Object.keys(item).forEach((k) => headers.add(k));
    const cols = [...headers];
    return {
      kind: 'list',
      headers: cols,
      rows: items.map((item) => cols.map((c) => cellValue(item[c]))),
    };
  }

  // 列表模式下的标量 / 非对象数组：单列 "value"
  const items = data as unknown[];
  return {
    kind: 'list',
    headers: ['value'],
    rows: items.map((v) => [cellValue(v)]),
  };
}

/** 表格模型 → HTML 表格（含 thead，单元格已转义）。 */
export function tableToHtml(model: TableModel): string {
  const head = '<tr>' + model.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('') + '</tr>';
  const body = model.rows
    .map((r) => '<tr>' + model.headers.map((_, i) => `<td>${escapeHtml(r[i] ?? '')}</td>`).join('') + '</tr>')
    .join('');
  return `<table class="w-full border-collapse text-left text-sm">\n<thead><tr class="bg-slate-100 dark:bg-slate-800">${model.headers
    .map((h) => `<th class="border border-slate-200 dark:border-slate-700 px-2 py-1 font-semibold">${escapeHtml(h)}</th>`)
    .join('')}</tr></thead>\n<tbody>${model.rows
    .map(
      (r) =>
        '<tr>' +
        model.headers.map((_, i) => `<td class="border border-slate-200 dark:border-slate-700 px-2 py-1 align-top">${escapeHtml(r[i] ?? '')}</td>`).join('') +
        '</tr>',
    )
    .join('')}</tbody>\n</table>`;
}

/** 表格模型 → Markdown 表格。 */
export function tableToMarkdown(model: TableModel): string {
  const esc = (v: string) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const lines: string[] = [];
  lines.push('| ' + model.headers.map(esc).join(' | ') + ' |');
  lines.push('| ' + model.headers.map(() => '---').join(' | ') + ' |');
  for (const r of model.rows) lines.push('| ' + model.headers.map((_, i) => esc(r[i] ?? '')).join(' | ') + ' |');
  return lines.join('\n');
}
