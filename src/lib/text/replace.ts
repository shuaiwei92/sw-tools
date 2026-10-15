// 查找替换：字面 / 正则两种模式，支持全局与忽略大小写。无 DOM 依赖。

export interface ReplaceOptions {
  pattern: string;
  replacement: string;
  /** true = 正则表达式；false = 字面量 */
  regex: boolean;
  /** 全局替换（正则模式必选，字面量默认即全部替换） */
  global: boolean;
  ignoreCase: boolean;
}

export interface ReplaceResult {
  result: string;
  /** 命中 / 替换次数 */
  count: number;
}

/** 编译用户正则（含 flags 拼接与语法校验）。 */
export function compileRegex(pattern: string, global: boolean, ignoreCase: boolean): RegExp {
  let flags = '';
  if (global) flags += 'g';
  if (ignoreCase) flags += 'i';
  try {
    return new RegExp(pattern, flags);
  } catch (e) {
    throw new Error(`正则表达式无效：${(e as Error).message}`);
  }
}

export function replaceAll(text: string, opts: ReplaceOptions): ReplaceResult {
  const { pattern, replacement, regex, global, ignoreCase } = opts;
  if (!pattern) return { result: text, count: 0 };

  if (!regex) {
    // 字面量：全局替换，忽略大小写时手动实现
    let count = 0;
    let result = text;
    if (ignoreCase) {
      const lower = pattern.toLowerCase();
      let out = '';
      let i = 0;
      while (i < text.length) {
        if (text.slice(i, i + pattern.length).toLowerCase() === lower) {
          out += replacement;
          count++;
          i += pattern.length;
        } else {
          out += text[i];
          i++;
        }
      }
      result = out;
    } else {
      const parts = text.split(pattern);
      count = parts.length - 1;
      result = parts.join(replacement);
    }
    return { result, count };
  }

  const re = compileRegex(pattern, global, ignoreCase);
  // 原生 replace 保留 $1 / $& / $$ 等替换语法；计数用 match（global 时返回全部命中）
  const count = (text.match(re) || []).length;
  const result = text.replace(re, replacement);
  return { result, count };
}
