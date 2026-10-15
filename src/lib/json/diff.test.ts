import { describe, it, expect } from 'vitest';
import { diffJson, diffJsonText, formatValue, stableStringify, jsonType } from './diff';

describe('formatValue 与 stableStringify', () => {
  it('叶子值紧凑序列化与截断（截断长度含引号）', () => {
    expect(formatValue('hi')).toBe('"hi"');
    expect(formatValue(42)).toBe('42');
    expect(formatValue(null)).toBe('null');
    expect(formatValue('x'.repeat(200), 10)).toBe('"xxxxxxxxx…（共 202 字符）');
  });
  it('键序无关序列化', () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
    expect(stableStringify({ a: [1, { c: 3, d: 4 }] })).toBe('{"a":[1,{"c":3,"d":4}]}');
  });
  it('jsonType', () => {
    expect(jsonType(null)).toBe('null');
    expect(jsonType([])).toBe('array');
    expect(jsonType({})).toBe('object');
    expect(jsonType(1)).toBe('number');
    expect(jsonType('s')).toBe('string');
    expect(jsonType(true)).toBe('boolean');
  });
});

describe('diffJson 基础对比', () => {
  it('新增 / 删除 / 修改', () => {
    const a = { name: 'old', age: 18, city: 'BJ' };
    const b = { name: 'new', age: 18, email: 'a@b.com' };
    const r = diffJson(a, b);
    expect(r.stats).toMatchObject({ added: 1, removed: 1, modified: 1, unchanged: 1, total: 3 });
    const byType = Object.fromEntries(r.entries.map((e) => [e.path, e]));
    expect(byType['$.name'].type).toBe('modified');
    expect(byType['$.name'].oldValue).toBe('"old"');
    expect(byType['$.name'].newValue).toBe('"new"');
    expect(byType['$.city'].type).toBe('removed');
    expect(byType['$.email'].type).toBe('added');
  });
  it('嵌套对象拍平成路径', () => {
    const a = { user: { profile: { nick: 'x' } } };
    const b = { user: { profile: { nick: 'y' } } };
    const r = diffJson(a, b);
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].path).toBe('$.user.profile.nick');
  });
  it('键名含特殊字符用 ["..."]', () => {
    const r = diffJson({ 'a.b': 1 }, { 'a.b': 2 });
    expect(r.entries[0].path).toBe('$["a.b"]');
  });
  it('相同输入无差异', () => {
    const r = diffJson({ a: [1, 2], b: { c: 3 } }, { a: [1, 2], b: { c: 3 } });
    expect(r.stats.total).toBe(0);
    expect(r.entries).toHaveLength(0);
  });
  it('includeUnchanged 保留未变条目', () => {
    const r = diffJson({ a: 1, b: 2 }, { a: 1, b: 3 }, { includeUnchanged: true });
    expect(r.stats.unchanged).toBe(1);
    expect(r.entries.find((e) => e.path === '$.a')!.type).toBe('unchanged');
  });
});

describe('diffJson 数组与类型变化', () => {
  it('数组按索引对比', () => {
    const r = diffJson({ t: [1, 2, 3] }, { t: [1, 9, 3] });
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].path).toBe('$.t[1]');
    expect(r.entries[0].type).toBe('modified');
  });
  it('数组长度变化：多出为新增、少了为删除', () => {
    const r = diffJson({ t: [1, 2] }, { t: [1, 2, 3] });
    expect(r.stats.added).toBe(1);
    expect(r.entries[0].path).toBe('$.t[2]');
    const r2 = diffJson({ t: [1, 2, 3] }, { t: [1] });
    expect(r2.stats.removed).toBe(2);
  });
  it('id 模式：按 id 匹配而非位置', () => {
    const a = { users: [{ id: 1, name: '甲' }, { id: 2, name: '乙' }] };
    const b = { users: [{ id: 2, name: '乙' }, { id: 1, name: '甲改' }] };
    const idx = diffJson(a, b);
    // 按位置：id 与 name 四个字段全部错位 → 4 条修改
    expect(idx.stats.modified).toBe(4);
    const byId = diffJson(a, b, { arrayMode: 'id' });
    expect(byId.stats.modified).toBe(1);
    expect(byId.entries[0].path).toBe('$.users[id="1"].name');
    expect(byId.entries[0].oldValue).toBe('"甲"');
    expect(byId.entries[0].newValue).toBe('"甲改"');
  });
  it('类型变化算单条 modified 并展示两侧', () => {
    const r = diffJson({ v: 'str' }, { v: { nested: 1 } });
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].path).toBe('$.v');
    expect(r.entries[0].type).toBe('modified');
    expect(r.entries[0].oldValue).toBe('"str"');
    expect(r.entries[0].newValue).toBe('{"nested":1}');
    expect(r.entries[0].valueType).toBe('object');
  });
  it('空对象 → 有键对象：差异落在新增子键上', () => {
    const r = diffJson({ a: {} }, { a: { x: 1 } });
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].path).toBe('$.a.x');
    expect(r.entries[0].type).toBe('added');
  });
});

describe('路径排序', () => {
  it('数字索引按数值排序（[2] 在 [10] 前）', () => {
    const a = { t: Array.from({ length: 12 }, (_, i) => i) };
    const b = { t: Array.from({ length: 12 }, (_, i) => (i === 2 || i === 10 ? i + 100 : i)) };
    const r = diffJson(a, b);
    const paths = r.entries.map((e) => e.path);
    expect(paths).toEqual(['$.t[2]', '$.t[10]']);
  });
});

describe('diffJsonText', () => {
  it('解析失败返回 error', () => {
    const r = diffJsonText('{bad', '{}');
    expect(r.error).toContain('左侧');
    const r2 = diffJsonText('{}', '{bad');
    expect(r2.error).toContain('右侧');
  });
  it('正常解析走 diffJson', () => {
    const r = diffJsonText('{"a":1}', '{"a":2}');
    expect(r.error).toBeUndefined();
    expect(r.stats.modified).toBe(1);
  });
  it('深层嵌套不爆栈', () => {
    let deep = '{"v":1}';
    for (let i = 0; i < 80; i++) deep = `{"n":${deep}}`;
    const deep2 = deep.replace('"v":1', '"v":2');
    const r = diffJsonText(deep, deep2);
    expect(r.error).toBeUndefined();
    expect(r.stats.modified).toBe(1);
  });
});
