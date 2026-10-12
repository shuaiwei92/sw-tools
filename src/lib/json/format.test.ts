import { describe, it, expect } from 'vitest';
import {
  validateJson,
  formatJson,
  minifyJson,
  sortKeysDeep,
  sortKeysJson,
  escapeJsonString,
  unescapeJsonString,
} from './format';

describe('validateJson', () => {
  it('合法 JSON 返回 ok 与解析值', () => {
    const r = validateJson('{"a":1}');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 1 });
  });

  it('非法 JSON 返回错误并定位行列', () => {
    const r = validateJson('{"a":1,}');
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
    expect(r.line).toBeGreaterThan(0);
    expect(r.column).toBeGreaterThan(0);
  });

  it('空输入报错', () => {
    expect(validateJson('   ').ok).toBe(false);
  });
});

describe('formatJson', () => {
  it('按缩进美化', () => {
    expect(formatJson('{"a":1}', 2)).toBe('{\n  "a": 1\n}');
  });
  it('非法输入抛错', () => {
    expect(() => formatJson('{')).toThrow();
  });
});

describe('minifyJson', () => {
  it('去除空白', () => {
    expect(minifyJson('{\n "a": 1\n}')).toBe('{"a":1}');
  });
});

describe('sortKeysDeep', () => {
  it('递归排序嵌套 key', () => {
    const input = { b: 1, a: { d: 2, c: 3 } };
    expect(JSON.stringify(sortKeysDeep(input))).toBe(
      JSON.stringify({ a: { c: 3, d: 2 }, b: 1 })
    );
  });
  it('sortKeysJson 输出排序后字符串', () => {
    expect(sortKeysJson('{"b":1,"a":2}', 0)).toBe('{"a":2,"b":1}');
  });
});

describe('escape / unescape', () => {
  it('escape 包裹为 JSON 字符串', () => {
    expect(escapeJsonString('hi')).toBe('"hi"');
    expect(escapeJsonString('a\nb')).toBe('"a\\nb"');
  });
  it('unescape 还原文本', () => {
    expect(unescapeJsonString('"hi"')).toBe('hi');
    expect(unescapeJsonString('"a\\nb"')).toBe('a\nb');
  });
});
