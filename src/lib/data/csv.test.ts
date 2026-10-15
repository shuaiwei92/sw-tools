import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  serializeCsv,
  csvToObjects,
  csvToMarkdown,
  jsonToCsv,
  detectDelimiter,
  coerceValue,
} from './csv';

describe('detectDelimiter', () => {
  it('自动识别常见分隔符', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
    expect(detectDelimiter('a|b|c')).toBe('|');
  });
});

describe('parseCsv', () => {
  it('基础逗号解析 + 表头', () => {
    const r = parseCsv('name,age\nAlice,30\nBob,25');
    expect(r.headers).toEqual(['name', 'age']);
    expect(r.rows).toEqual([['Alice', '30'], ['Bob', '25']]);
  });

  it('剥离 UTF-8 BOM', () => {
    const r = parseCsv('﻿name,age\nA,1');
    expect(r.headers).toEqual(['name', 'age']);
  });

  it('引号内包含分隔符与换行', () => {
    const r = parseCsv('a,b\n"x,y","line1\nline2"');
    expect(r.rows).toEqual([['x,y', 'line1\nline2']]);
  });

  it('双引号转义', () => {
    const r = parseCsv('a\n"He said ""hi"""');
    expect(r.rows).toEqual([['He said "hi"']]);
  });

  it('CRLF 换行', () => {
    const r = parseCsv('a,b\r\n1,2\r\n');
    expect(r.rows).toEqual([['1', '2']]);
  });

  it('无表头时生成列名', () => {
    const r = parseCsv('1,2,3', { hasHeader: false });
    expect(r.headers).toEqual(['列1', '列2', '列3']);
    expect(r.rows).toEqual([['1', '2', '3']]);
  });

  it('跳过空行（默认）', () => {
    const r = parseCsv('a,b\n1,2\n\n3,4');
    expect(r.rows).toEqual([['1', '2'], ['3', '4']]);
  });

  it('保留前导零（默认不推断）', () => {
    const r = parseCsv('code\n007\n012');
    expect(r.rows).toEqual([['007'], ['012']]);
  });

  it('行宽自动补齐', () => {
    const r = parseCsv('a,b,c\n1,2');
    expect(r.headers).toEqual(['a', 'b', 'c']);
    expect(r.rows).toEqual([['1', '2', '']]);
  });
});

describe('serializeCsv', () => {
  it('含特殊字符时加引号', () => {
    expect(serializeCsv(['a', 'b'], [['x,y', 'has "q"']])).toBe('a,b\n"x,y","has ""q"""');
  });
  it('可指定分隔符与换行', () => {
    expect(serializeCsv(['a', 'b'], [['1', '2']], ';', '\r\n')).toBe('a;b\r\n1;2');
  });
});

describe('csvToObjects', () => {
  it('默认类型推断', () => {
    const o = csvToObjects(['a', 'b'], [['1', 'true']]);
    expect(o).toEqual([{ a: 1, b: true }]);
  });
  it('关闭推断保留字符串', () => {
    const o = csvToObjects(['a'], [['007']], { coerce: false });
    expect(o).toEqual([{ a: '007' }]);
  });
});

describe('jsonToCsv', () => {
  it('对象数组 → CSV', () => {
    const csv = jsonToCsv('[{"a":1,"b":2},{"a":3,"b":4}]');
    expect(csv).toBe('a,b\n1,2\n3,4');
  });
  it('单对象 → 键值 CSV', () => {
    expect(jsonToCsv('{"k":"v"}')).toBe('key,value\nk,v');
  });
  it('标量数组 → 单列', () => {
    expect(jsonToCsv('[1,2,3]')).toBe('value\n1\n2\n3');
  });
});

describe('csvToMarkdown', () => {
  it('生成 Markdown 表格', () => {
    const md = csvToMarkdown(['a', 'b'], [['1', '2']]);
    expect(md).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |');
  });
  it('转义管道符', () => {
    const md = csvToMarkdown(['a'], [['x|y']]);
    expect(md).toContain('x\\|y');
  });
});

describe('coerceValue', () => {
  it('数字字符串转为数字', () => {
    expect(coerceValue('007')).toBe(7);
    expect(coerceValue('3.5')).toBe(3.5);
  });
  it('非数字保留字符串', () => {
    expect(coerceValue('abc')).toBe('abc');
  });
});
