import { describe, it, expect } from 'vitest';
import { jsonToTableModel, tableToHtml, tableToMarkdown } from './jsonTable';

describe('jsonToTableModel', () => {
  it('对象数组 → list 表', () => {
    const m = jsonToTableModel('[{"a":1,"b":2},{"a":3,"b":4}]');
    expect(m.kind).toBe('list');
    expect(m.headers).toEqual(['a', 'b']);
    expect(m.rows).toEqual([['1', '2'], ['3', '4']]);
  });

  it('单对象 → kv 表', () => {
    const m = jsonToTableModel('{"name":"A","age":3}');
    expect(m.kind).toBe('kv');
    expect(m.headers).toEqual(['键', '值']);
    expect(m.rows).toEqual([['name', 'A'], ['age', '3']]);
  });

  it('嵌套对象序列化为 JSON 文本单元格', () => {
    const m = jsonToTableModel('[{"a":{"x":1}}]');
    expect(m.rows).toEqual([['{"x":1}']]);
  });

  it('mode=list 强制列表（标量数组 → 单列）', () => {
    const m = jsonToTableModel('[1,2,3]', 'list');
    expect(m.kind).toBe('list');
    expect(m.headers).toEqual(['value']);
    expect(m.rows).toEqual([['1'], ['2'], ['3']]);
  });
});

describe('tableToHtml', () => {
  it('转义 HTML 特殊字符', () => {
    const m = jsonToTableModel('[{"a":"<b>&"}]');
    const html = tableToHtml(m);
    expect(html).toContain('&lt;b&gt;&amp;');
    expect(html).toContain('<th');
  });
});

describe('tableToMarkdown', () => {
  it('生成带表头的 Markdown 表', () => {
    const m = jsonToTableModel('[{"a":1}]');
    expect(tableToMarkdown(m)).toBe('| a |\n| --- |\n| 1 |');
  });
});
