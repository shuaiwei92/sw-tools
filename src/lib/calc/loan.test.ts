import { describe, expect, it } from 'vitest';
import {
  BP_PRESETS,
  LPR_QUOTE,
  compareMethods,
  calcLoan,
  effectiveRate,
  providentRate,
  type LoanInput,
} from './loan';

const close = (a: number, b: number, tol = 0.5) => Math.abs(a - b) <= tol;

describe('effectiveRate 定价折算', () => {
  it('LPR 模式：LPR + 基点（BP）', () => {
    // 2026-10：5 年期以上 LPR 3.5%，主流首套 LPR − 30BP ≈ 3.2%
    expect(effectiveRate('lpr', { lpr: LPR_QUOTE.fiveYearPlus, bp: -30 })).toBeCloseTo(3.2, 10);
    expect(effectiveRate('lpr', { lpr: 3.5, bp: -45 })).toBeCloseTo(3.05, 10);
    expect(effectiveRate('lpr', { lpr: 3.5, bp: 0 })).toBeCloseTo(3.5, 10);
    expect(effectiveRate('lpr', { lpr: 3.5, bp: 30 })).toBeCloseTo(3.8, 10);
  });

  it('未传 lpr 时回退到 5 年期以上报价', () => {
    expect(effectiveRate('lpr', { bp: -30 })).toBeCloseTo(LPR_QUOTE.fiveYearPlus - 0.3, 10);
  });

  it('fixed 模式直接取固定利率', () => {
    expect(effectiveRate('fixed', { fixedRate: 4.2 })).toBe(4.2);
  });

  it('BP 快捷档均为 0.01 个百分点的整数倍', () => {
    for (const bp of BP_PRESETS) expect(Number.isInteger(bp)).toBe(true);
  });
});

describe('providentRate 公积金利率分档', () => {
  it('首套：5 年以下 2.1%，5 年以上 2.6%', () => {
    expect(providentRate('first', 3)).toBe(2.1);
    expect(providentRate('first', 5)).toBe(2.1); // 含 5 年
    expect(providentRate('first', 6)).toBe(2.6);
    expect(providentRate('first', 30)).toBe(2.6);
  });

  it('二套：5 年以下 2.525%，5 年以上 3.075%', () => {
    expect(providentRate('second', 5)).toBe(2.525);
    expect(providentRate('second', 30)).toBe(3.075);
  });
});

describe('calcLoan 等额本息', () => {
  const input: LoanInput = {
    method: 'equal-installment',
    years: 30,
    segments: [{ label: '商贷', principal: 1_000_000, annualRate: 4.3 }],
  };

  it('100 万 / 4.3% / 30 年：月供 4948.71，总利息约 78.15 万', () => {
    const res = calcLoan(input);
    expect(close(res.monthlyPayment, 4948.71, 0.01)).toBe(true);
    // 末月找平会带来分币级漂移，容差 5 元（约 0.0006%）
    expect(close(res.totalInterest, 781_537, 5)).toBe(true);
    expect(close(res.totalPayment, 1_781_537, 5)).toBe(true);
  });

  it('月供固定：每期月供相同，末月付清剩余本金', () => {
    const res = calcLoan(input);
    expect(res.schedule).toHaveLength(360);
    for (const row of res.schedule) expect(close(row.payment, res.monthlyPayment, 0.01)).toBe(true);
    expect(close(res.schedule[359].remaining, 0)).toBe(true);
  });

  it('明细自洽：本金 + 利息 = 月供；合计 = 总还款', () => {
    const res = calcLoan(input);
    let sum = 0;
    for (const row of res.schedule) {
      expect(close(row.principalPart + row.interestPart, row.payment, 0.01)).toBe(true);
      sum += row.payment;
    }
    expect(close(sum, res.totalPayment, 0.01)).toBe(true);
  });

  it('零利率：月供 = 本金 / 期数，总利息为 0', () => {
    const res = calcLoan({
      method: 'equal-installment',
      years: 1,
      segments: [{ label: '免息', principal: 120_000, annualRate: 0 }],
    });
    expect(close(res.monthlyPayment, 10_000, 0.001)).toBe(true);
    expect(res.totalInterest).toBe(0);
  });
});

describe('calcLoan 等额本金', () => {
  const input: LoanInput = {
    method: 'equal-principal',
    years: 30,
    segments: [{ label: '商贷', principal: 1_000_000, annualRate: 4.3 }],
  };

  it('100 万 / 4.3% / 30 年：首月 6361.11，末月 2787.73，总利息约 64.68 万', () => {
    const res = calcLoan(input);
    expect(close(res.monthlyPayment, 6361.11, 0.01)).toBe(true);
    expect(close(res.lastPayment, 2787.73, 0.01)).toBe(true);
    expect(close(res.totalInterest, 646_792, 2)).toBe(true);
  });

  it('月供逐月递减，每月递减额恒定（= 本金/期数 × 月利率）', () => {
    const res = calcLoan(input);
    const step = (1_000_000 / 360) * (4.3 / 100 / 12);
    for (let i = 1; i < res.schedule.length; i++) {
      const drop = res.schedule[i - 1].payment - res.schedule[i].payment;
      expect(close(drop, step, 0.01)).toBe(true);
    }
  });

  it('每期本金相等（末月找零），剩余本金线性归零', () => {
    const res = calcLoan(input);
    for (let i = 0; i < 359; i++) {
      expect(close(res.schedule[i].principalPart, 1_000_000 / 360, 0.01)).toBe(true);
    }
    expect(close(res.schedule[359].remaining, 0)).toBe(true);
  });
});

describe('组合贷：两段合并', () => {
  it('商贷 70 万 @3.2% + 公积金 30 万 @2.6%，月供为两段之和', () => {
    const segs = [
      { label: '商贷', principal: 700_000, annualRate: 3.2 },
      { label: '公积金', principal: 300_000, annualRate: 2.6 },
    ];
    const merged = calcLoan({ method: 'equal-installment', years: 30, segments: segs });
    const solo = segs.map((s) => calcLoan({ method: 'equal-installment', years: 30, segments: [s] }));

    expect(merged.segments).toHaveLength(2);
    expect(close(merged.monthlyPayment, solo[0].monthlyPayment + solo[1].monthlyPayment, 0.01)).toBe(true);
    expect(close(merged.totalPayment, solo[0].totalPayment + solo[1].totalPayment, 0.01)).toBe(true);
    expect(close(merged.totalInterest, solo[0].totalInterest + solo[1].totalInterest, 0.01)).toBe(true);

    // 合并明细与分段明细逐月一致
    for (let m = 1; m <= 360; m++) {
      const row = merged.schedule[m - 1];
      const expectPayment = solo[0].schedule[m - 1].payment + solo[1].schedule[m - 1].payment;
      expect(close(row.payment, expectPayment, 0.01)).toBe(true);
    }
    expect(close(merged.schedule[359].remaining, 0)).toBe(true);
  });

  it('分段结果带出各自的利率与标签', () => {
    const res = calcLoan({
      method: 'equal-installment',
      years: 30,
      segments: [
        { label: '商贷', principal: 700_000, annualRate: 3.2 },
        { label: '公积金', principal: 300_000, annualRate: 2.6 },
      ],
    });
    expect(res.segments.map((s) => s.label)).toEqual(['商贷', '公积金']);
    expect(res.segments.map((s) => s.annualRate)).toEqual([3.2, 2.6]);
  });

  it('金额为 0 的分段被忽略', () => {
    const res = calcLoan({
      method: 'equal-installment',
      years: 30,
      segments: [
        { label: '商贷', principal: 1_000_000, annualRate: 3.2 },
        { label: '公积金', principal: 0, annualRate: 2.6 },
      ],
    });
    expect(res.segments).toHaveLength(1);
    expect(res.segments[0].label).toBe('商贷');
  });
});

describe('compareMethods 还款方式对比', () => {
  it('等额本金总利息更少，差额 > 0', () => {
    const cmp = compareMethods({
      years: 30,
      segments: [{ label: '商贷', principal: 1_000_000, annualRate: 4.3 }],
    });
    expect(cmp.interestSaved).toBeGreaterThan(0);
    // 100 万 / 4.3% / 30 年：两种方式总利息差约 13.47 万
    expect(close(cmp.interestSaved, 134_745, 5)).toBe(true);
    expect(cmp.principal.monthlyPayment).toBeGreaterThan(cmp.installment.monthlyPayment); // 首月更高
    expect(cmp.principal.lastPayment).toBeLessThan(cmp.installment.lastPayment); // 末月更低
  });

  it('零利率时两种方式总利息均为 0，差额为 0', () => {
    const cmp = compareMethods({
      years: 5,
      segments: [{ label: '其他', principal: 100_000, annualRate: 0 }],
    });
    expect(cmp.installment.totalInterest).toBe(0);
    expect(cmp.principal.totalInterest).toBe(0);
    expect(cmp.interestSaved).toBe(0);
  });

  it('组合贷同样支持对比', () => {
    const cmp = compareMethods({
      years: 30,
      segments: [
        { label: '商贷', principal: 700_000, annualRate: 3.2 },
        { label: '公积金', principal: 300_000, annualRate: 2.6 },
      ],
    });
    expect(cmp.interestSaved).toBeGreaterThan(0);
    expect(cmp.installment.schedule).toHaveLength(360);
  });
});

describe('输入校验', () => {
  it('总本金为 0 抛错', () => {
    expect(() =>
      calcLoan({ method: 'equal-installment', years: 30, segments: [{ label: 'x', principal: 0, annualRate: 4 }] })
    ).toThrow('贷款金额需大于 0');
  });

  it('年限向上取整到月', () => {
    const res = calcLoan({
      method: 'equal-installment',
      years: 0.5,
      segments: [{ label: 'x', principal: 12_000, annualRate: 0 }],
    });
    expect(res.schedule).toHaveLength(6);
  });
});
