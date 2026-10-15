import { describe, expect, it } from 'vitest';
import { jsonToCode, pascalCase } from './json2code';

describe('pascalCase', () => {
  it('converts common key styles', () => {
    expect(pascalCase('user_name')).toBe('UserName');
    expect(pascalCase('user-name')).toBe('UserName');
    expect(pascalCase('userName')).toBe('UserName');
    expect(pascalCase('user name')).toBe('UserName');
    expect(pascalCase('id')).toBe('Id');
  });
});

describe('jsonToCode', () => {
  const sample = JSON.stringify({
    id: 1,
    name: '张三',
    active: true,
    score: 9.5,
    tags: ['a', 'b'],
    address: { city: '北京', zip: '100000' },
    scores: [{ subject: '语文', value: 90 }],
    deletedAt: null,
  });

  it('generates TypeScript interfaces with nested types', () => {
    const { code, error } = jsonToCode(sample, { lang: 'typescript', rootName: 'User' });
    expect(error).toBeUndefined();
    expect(code).toContain('export interface User {');
    expect(code).toContain('id: number;');
    expect(code).toContain('name: string;');
    expect(code).toContain('active: boolean;');
    expect(code).toContain('score: number;');
    expect(code).toContain('tags: string[];');
    expect(code).toContain('address: Address;');
    expect(code).toContain('export interface Address {');
    expect(code).toContain('scores: Score[];');
    expect(code).toContain('export interface Score {');
    expect(code).toContain('deletedAt?: unknown;');
  });

  it('generates Go struct with json tags', () => {
    const { code } = jsonToCode(JSON.stringify({ user_id: 1, nick_name: 'x' }), { lang: 'go' });
    expect(code).toContain('type Root struct {');
    expect(code).toContain('UserId int64 `json:"user_id"`');
    expect(code).toContain('NickName string `json:"nick_name"`');
  });

  it('generates Java fields', () => {
    const { code } = jsonToCode(JSON.stringify({ id: 1, ratio: 0.5, ok: true }), { lang: 'java' });
    expect(code).toContain('private Long id;');
    expect(code).toContain('private Double ratio;');
    expect(code).toContain('private Boolean ok;');
  });

  it('generates C# properties', () => {
    const { code } = jsonToCode(JSON.stringify({ id: 1, tags: ['x'] }), { lang: 'csharp' });
    expect(code).toContain('public long Id { get; set; }');
    expect(code).toContain('public List<string> Tags { get; set; }');
  });

  it('generates Python dataclass', () => {
    const { code } = jsonToCode(JSON.stringify({ user_name: 'x', age: 18 }), { lang: 'python' });
    expect(code).toContain('class Root:');
    expect(code).toContain('user_name: str');
    expect(code).toContain('age: int');
  });

  it('handles arrays at root', () => {
    const { code } = jsonToCode(JSON.stringify([{ a: 1 }, { a: 2 }]), { lang: 'typescript' });
    expect(code).toContain('export interface Root {');
    expect(code).toContain('a: number;');
  });

  it('reports parse errors', () => {
    const { code, error } = jsonToCode('{bad json', { lang: 'typescript' });
    expect(code).toBe('');
    expect(error).toContain('JSON 解析失败');
  });

  it('handles empty object', () => {
    const { code } = jsonToCode('{}', { lang: 'typescript' });
    expect(code).toContain('export interface Root {');
  });
});
