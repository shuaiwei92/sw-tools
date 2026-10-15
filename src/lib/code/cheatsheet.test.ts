import { describe, it, expect } from 'vitest';
import { CHEAT_GROUPS, searchShortcuts, countShortcuts } from './cheatsheet';

describe('数据完整性', () => {
  it('六组数据齐全', () => {
    expect(CHEAT_GROUPS.map((g) => g.id)).toEqual(['git', 'vim', 'linux', 'windows', 'vscode', 'excel']);
    expect(countShortcuts()).toBeGreaterThanOrEqual(100);
  });

  it('每条 keys 与 desc 非空', () => {
    for (const g of CHEAT_GROUPS) {
      expect(g.name).toBeTruthy();
      for (const item of g.items) {
        expect(item.keys.trim()).toBeTruthy();
        expect(item.desc.trim()).toBeTruthy();
      }
    }
  });

  it('组内 keys 不重复', () => {
    for (const g of CHEAT_GROUPS) {
      const keys = g.items.map((i) => i.keys);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('searchShortcuts', () => {
  it('空查询返回全部', () => {
    const r = searchShortcuts('');
    expect(r).toHaveLength(6);
    expect(r[0].items).toHaveLength(CHEAT_GROUPS[0].items.length);
  });

  it('按 keys 搜索', () => {
    const r = searchShortcuts('stash');
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('git');
    expect(r[0].items.map((i) => i.keys)).toEqual(['git stash', 'git stash pop']);
  });

  it('按描述搜索', () => {
    const r = searchShortcuts('撤销');
    const ids = r.map((g) => g.id);
    expect(ids).toContain('vim');
    expect(ids).toContain('windows');
    expect(r.find((g) => g.id === 'vim')!.items[0].keys).toBe('u');
  });

  it('大小写不敏感', () => {
    const r = searchShortcuts('GIT INIT');
    expect(r).toHaveLength(1);
    expect(r[0].items[0].keys).toBe('git init');
  });

  it('keys 命中排在描述命中前', () => {
    // 查询 ":w"：只命中 keys（:w、:wq），按原顺序
    const r = searchShortcuts(':w');
    const vim = r.find((g) => g.id === 'vim')!;
    expect(vim.items.map((i) => i.keys)).toEqual([':w', ':wq']);
    // 查询 "保存"：只命中描述，且保持数据原顺序
    const r2 = searchShortcuts('保存');
    const vim2 = r2.find((g) => g.id === 'vim')!;
    expect(vim2.items.map((i) => i.keys)).toEqual([':w', ':wq', ':q!']);
  });

  it('组名命中返回整组', () => {
    const r = searchShortcuts('excel');
    expect(r).toHaveLength(1);
    expect(r[0].items).toHaveLength(CHEAT_GROUPS[5].items.length);
  });

  it('无匹配返回空', () => {
    expect(searchShortcuts('zzz不存在的关键词zzz')).toEqual([]);
  });

  it('首尾空白被忽略', () => {
    expect(searchShortcuts('  stash  ')).toHaveLength(1);
  });
});
