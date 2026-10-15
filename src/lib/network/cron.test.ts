import { describe, expect, it } from 'vitest';
import { describeCron, describeCronExpr, nextRuns, parseCron } from './cron';

describe('parseCron', () => {
  it('accepts valid expressions', () => {
    expect(parseCron('* * * * *').error).toBeUndefined();
    expect(parseCron('0 9 * * 1-5').error).toBeUndefined();
    expect(parseCron('*/5 8-18 * * 1,3').error).toBeUndefined();
    expect(parseCron('0 0 1 1 *').error).toBeUndefined();
  });

  it('rejects wrong field count', () => {
    expect(parseCron('0 9 * *').error).toContain('需要 5 个字段');
    expect(parseCron('0 9 * * * *').error).toContain('需要 5 个字段');
  });

  it('rejects out-of-range values', () => {
    expect(parseCron('60 * * * *').error).toContain('分钟字段错误');
    expect(parseCron('0 24 * * *').error).toContain('小时字段错误');
    expect(parseCron('0 0 32 * *').error).toContain('日字段错误');
    expect(parseCron('0 0 * 13 *').error).toContain('月字段错误');
  });
});

describe('describeCron', () => {
  it('describes common expressions', () => {
    expect(describeCronExpr('* * * * *')).toBe('每分钟');
    expect(describeCronExpr('*/5 * * * *')).toBe('每 5 分钟');
    expect(describeCronExpr('0 9 * * *')).toBe('每天 9 时 0 分');
    expect(describeCronExpr('0 9 * * 1')).toBe('每周一 9 时 0 分');
    expect(describeCronExpr('30 8 * * 1-5')).toBe('每周一、二、三、四、五 8 时 30 分');
    expect(describeCronExpr('0 0 1 * *')).toBe('每月 1 日 0 时 0 分');
    expect(describeCronExpr('0 0 1 1 *')).toBe('每年 1 月 1 日 0 时 0 分');
    expect(describeCronExpr('0 0 * * 0')).toBe('每周日 0 时 0 分');
  });
});

describe('nextRuns', () => {
  it('computes daily runs', () => {
    const from = new Date(2024, 0, 1, 5, 30, 0);
    const runs = nextRuns('0 0 * * *', 3, from);
    expect(runs).toHaveLength(3);
    expect(runs[0].toISOString()).toBe('2024-01-01T16:00:00.000Z'); // 北京时间 1/2 00:00
    expect(runs[1].toISOString()).toBe('2024-01-02T16:00:00.000Z');
    expect(runs[2].toISOString()).toBe('2024-01-03T16:00:00.000Z');
  });

  it('computes weekday runs', () => {
    // 2024-01-05 是周五 10:00，下一个工作日的 9:00 应为 01-08（周一）
    const from = new Date(2024, 0, 5, 10, 0, 0);
    const runs = nextRuns('0 9 * * 1-5', 3, from);
    expect(runs[0].getDay()).toBe(1);
    expect(runs[0].getDate()).toBe(8);
    expect(runs[1].getDate()).toBe(9);
    expect(runs[2].getDate()).toBe(10);
  });

  it('treats day-of-month and day-of-week as union (Vixie semantics)', () => {
    // 每月 13 日或周五：2024-09-01（周日）起 → 09-06（周五）、09-13（周五且 13 号）、09-20（周五）
    const from = new Date(2024, 8, 1, 0, 0, 0);
    const runs = nextRuns('0 0 13 * 5', 3, from);
    expect(runs[0].getDate()).toBe(6);
    expect(runs[1].getDate()).toBe(13);
    expect(runs[2].getDate()).toBe(20);
  });

  it('handles step expressions', () => {
    // 从 00:00 起，下一分钟为 00:01，首个命中应为 00:15
    const from = new Date(2024, 0, 1, 0, 0, 0);
    const runs = nextRuns('*/15 * * * *', 4, from);
    expect(runs[0].getMinutes()).toBe(15);
    expect(runs[1].getMinutes()).toBe(30);
    expect(runs[2].getMinutes()).toBe(45);
    expect(runs[3].getMinutes()).toBe(0);
    expect(runs[3].getHours()).toBe(1);
  });

  it('returns empty for invalid expression', () => {
    expect(nextRuns('bad expr', 3)).toEqual([]);
  });
});
