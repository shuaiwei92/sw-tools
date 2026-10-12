// JSONPath 查询（jsonpath-plus）。纯函数，可单测。

import { JSONPath } from 'jsonpath-plus';

/**
 * 在 JSON 文本上执行 JSONPath 表达式，返回美化后的结果 JSON。
 * wrap: true 保证结果始终是数组（便于统一展示）。
 */
export function queryJson(input: string, expr: string): string {
  if (!expr || !expr.trim()) throw new Error('请输入 JSONPath 表达式');
  const data = JSON.parse(input);
  const result = JSONPath({ path: expr, json: data, wrap: true });
  return JSON.stringify(result, null, 2);
}
