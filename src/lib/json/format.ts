// 纯函数 JSON 工具集（无 DOM 依赖，可单测、可被任意岛/框架复用）。

export interface ValidateResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  /** 出错所在行（从 1 开始） */
  line?: number;
  /** 出错所在列（从 1 开始） */
  column?: number;
}

/** 由字符偏移量换算行列号（用于把 JSON.parse 的 position 转成人能读的位置）。 */
export function positionToLineColumn(text: string, index: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  const end = Math.min(index, text.length);
  for (let i = 0; i < end; i++) {
    if (text[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

/** 校验 JSON，返回结果 + 出错行列（若有）。 */
export function validateJson(input: string): ValidateResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: '输入为空' };
  try {
    const value = JSON.parse(input);
    return { ok: true, value };
  } catch (e) {
    const message = (e as Error).message;

    // V8 两种报错形态：
    //   "Unexpected token } in JSON at position 123"
    //   "Expected ',' or '}' after property value in JSON at position 45 (line 3 column 5)"
    let line: number | undefined;
    let column: number | undefined;

    const posMatch = message.match(/position (\d+)/);
    if (posMatch) {
      const idx = parseInt(posMatch[1], 10);
      const pos = positionToLineColumn(input, idx);
      line = pos.line;
      column = pos.column;
    }

    const lcMatch = message.match(/line (\d+) column (\d+)/);
    if (lcMatch) {
      line = parseInt(lcMatch[1], 10);
      column = parseInt(lcMatch[2], 10);
    }

    return { ok: false, error: message, line, column };
  }
}

/** 格式化（美化）JSON。indent 可为数字(空格数)或字符(如 '\t')。 */
export function formatJson(input: string, indent: number | string = 2): string {
  const res = validateJson(input);
  if (!res.ok) throw new Error(res.error);
  return JSON.stringify(res.value, null, indent);
}

/** 压缩为单行 JSON。 */
export function minifyJson(input: string): string {
  const res = validateJson(input);
  if (!res.ok) throw new Error(res.error);
  return JSON.stringify(res.value);
}

/** 递归按字母序排序对象 key。 */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeysDeep(obj[key]);
    }
    return sorted;
  }
  return value;
}

/** 排序 key 后格式化输出。 */
export function sortKeysJson(input: string, indent: number | string = 2): string {
  const res = validateJson(input);
  if (!res.ok) throw new Error(res.error);
  return JSON.stringify(sortKeysDeep(res.value), null, indent);
}

/** 把任意文本转成合法的 JSON 字符串字面量（如换行、引号会被转义）。 */
export function escapeJsonString(input: string): string {
  return JSON.stringify(input);
}

/** 解析 JSON 字符串字面量，还原原始文本。 */
export function unescapeJsonString(input: string): string {
  return JSON.parse(input) as string;
}
