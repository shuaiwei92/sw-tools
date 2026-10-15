import { describe, it, expect } from 'vitest';
import {
  calcIncomeTax, calcBonusTaxSeparate, taxByBrackets, calcSocialInsurance,
  monthlySpecialDeduction, EMPTY_SPECIAL, calcSalary, CITY_PRESETS,
  ANNUAL_TAX_BRACKETS, BONUS_MONTHLY_BRACKETS, ANNUAL_BASIC_DEDUCTION,
} from './tax';

describe('年度综合所得税率表', () => {
  it('税率表结构与速算扣除数（2019 年起）', () => {
    expect(ANNUAL_TAX_BRACKETS).toHaveLength(7);
    expect(ANNUAL_TAX_BRACKETS[0]).toEqual({ upTo: 36000, rate: 0.03, deduct: 0 });
    expect(ANNUAL_TAX_BRACKETS[1]).toEqual({ upTo: 144000, rate: 0.10, deduct: 2520 });
    expect(ANNUAL_TAX_BRACKETS[6]).toEqual({ upTo: Infinity, rate: 0.45, deduct: 181920 });
    expect(ANNUAL_BASIC_DEDUCTION).toBe(60000);
  });
  it('已知案例：年应纳税所得额 → 税额', () => {
    // 12 万收入无扣除：taxable 60000 → 60000×10%−2520 = 3480
    expect(calcIncomeTax(60000).tax).toBe(3480);
    expect(calcIncomeTax(60000).rate).toBe(0.1);
    // 20 万收入无扣除：taxable 140000 → 11480
    expect(calcIncomeTax(140000).tax).toBe(11480);
    // 100 万收入无扣除：taxable 940000 → 940000×35%−85920 = 243080
    expect(calcIncomeTax(940000).tax).toBe(243080);
    // 级距边界
    expect(taxByBrackets(36000, ANNUAL_TAX_BRACKETS).tax).toBe(1080);
    expect(taxByBrackets(36001, ANNUAL_TAX_BRACKETS).tax).toBeCloseTo(1080.1, 2);
    expect(taxByBrackets(144000, ANNUAL_TAX_BRACKETS).tax).toBe(11880);
    // 负数与零
    expect(calcIncomeTax(0).tax).toBe(0);
    expect(calcIncomeTax(-5000).tax).toBe(0);
  });
});

describe('年终奖单独计税', () => {
  it('36000 临界点：36000 按 3%，36001 跳 10%', () => {
    expect(calcBonusTaxSeparate(36000).tax).toBe(1080);
    expect(calcBonusTaxSeparate(36000).net).toBe(34920);
    // 36001/12 = 3000.08 → 10% 档 → 36001×10%−210 = 3390.1
    const r = calcBonusTaxSeparate(36001);
    expect(r.tax).toBeCloseTo(3390.1, 1);
    expect(r.rate).toBe(0.1);
  });
  it('零与负年终奖', () => {
    expect(calcBonusTaxSeparate(0)).toEqual({ tax: 0, rate: 0, net: 0 });
    expect(calcBonusTaxSeparate(-100).tax).toBe(0);
  });
  it('大额年终奖', () => {
    // 120000/12 = 10000 → 10% 档 → 120000×10%−210 = 11790
    expect(calcBonusTaxSeparate(120000).tax).toBe(11790);
  });
});

describe('五险一金', () => {
  it('北京口径：基数 10000 的个人/单位明细', () => {
    const r = calcSocialInsurance(10000, CITY_PRESETS.beijing.rates);
    // 个人：养老 800 + 医疗 200 + 失业 50 + 公积金 1200 + 大病 3 = 2253
    expect(r.personal.total).toBe(2253);
    expect(r.personal.items).toHaveLength(5);
    // 单位：1600 + 950 + 50 + 40 + 80 + 1200 = 3920
    expect(r.employer.total).toBe(3920);
  });
  it('自定义公积金比例', () => {
    const r = calcSocialInsurance(10000, { ...CITY_PRESETS.custom.rates, housingFundPersonal: 0.05, medicalExtraMonthly: 0 });
    expect(r.personal.total).toBe(800 + 200 + 50 + 500);
  });
  it('零基数', () => {
    const r = calcSocialInsurance(0, CITY_PRESETS.beijing.rates);
    expect(r.personal.total).toBe(3); // 仅大病固定额
  });
});

describe('专项附加扣除', () => {
  it('月度合计：1 娃教育 + 直辖市租房 + 独生赡养 = 6500', () => {
    expect(monthlySpecialDeduction({ ...EMPTY_SPECIAL, childrenEducation: 1, rentTier: 1, elderlySupport: 1 })).toBe(2000 + 1500 + 3000);
  });
  it('租金分档', () => {
    expect(monthlySpecialDeduction({ ...EMPTY_SPECIAL, rentTier: 2 })).toBe(1100);
    expect(monthlySpecialDeduction({ ...EMPTY_SPECIAL, rentTier: 3 })).toBe(800);
    expect(monthlySpecialDeduction({ ...EMPTY_SPECIAL, rentTier: 0 })).toBe(0);
  });
  it('两个婴幼儿 + 房贷 + 继续教育', () => {
    expect(monthlySpecialDeduction({ ...EMPTY_SPECIAL, infantCare: 2, mortgageInterest: 1, continuingEducation: 1 })).toBe(2000 * 2 + 1000 + 400);
  });
});

describe('calcSalary 汇总', () => {
  it('月薪 20000 北京无专项：年税 10076.4，月到手 14657.3', () => {
    const r = calcSalary({ monthlySalary: 20000, rates: CITY_PRESETS.beijing.rates, special: EMPTY_SPECIAL });
    expect(r.months).toBe(12);
    expect(r.annual.gross).toBe(240000);
    expect(r.annual.socialPersonal).toBe(4503 * 12);
    expect(r.annual.taxableMerged).toBe(240000 - 60000 - 54036);
    expect(r.annual.taxMerged).toBeCloseTo(10076.4, 1);
    expect(r.monthly.net).toBeCloseTo(14657.3, 1);
    expect(r.annual.effectiveRate).toBeCloseTo(4.2, 1);
  });
  it('年终奖两种计税对比：50000 奖金单独计税更优', () => {
    const r = calcSalary({ monthlySalary: 20000, annualBonus: 50000, rates: CITY_PRESETS.beijing.rates, special: EMPTY_SPECIAL });
    // 合并：taxable 290000−60000−54036 = 175964 → 175964×20%−16920 = 18272.8
    expect(r.annual.taxMerged).toBeCloseTo(18272.8, 1);
    // 单独：工资 10076.4 + 奖金 50000×10%−210 = 4790 → 14866.4
    expect(r.annual.bonusTax).toBe(4790);
    expect(r.annual.taxSeparate).toBeCloseTo(14866.4, 1);
    expect(r.annual.betterMethod).toBe('separate');
    expect(r.annual.taxSavedByChoice).toBeCloseTo(3406.4, 1);
  });
  it('低薪 + 高奖金场景：合并计税可能更优', () => {
    // 月薪 5000（年 6 万）+ 奖金 10 万：合并 taxable = 160000−60000−社保；单独奖金税高
    const r = calcSalary({ monthlySalary: 5000, annualBonus: 100000, rates: { ...CITY_PRESETS.custom.rates, housingFundPersonal: 0.05, medicalExtraMonthly: 0 }, special: EMPTY_SPECIAL });
    // 合并：taxable = 160000−60000−(5000×0.155×12=9300) = 90700 → 90700×10%−2520 = 6550
    expect(r.annual.taxMerged).toBeCloseTo(6550, 0);
    // 单独：工资 taxable = 60000−60000−9300 → 0 税；奖金 100000/12=8333 → 10% → 9790
    expect(r.annual.taxSeparate).toBeCloseTo(9790, 0);
    expect(r.annual.betterMethod).toBe('merged');
  });
  it('用人成本 = 年收入 + 单位社保×12 + 奖金', () => {
    const r = calcSalary({ monthlySalary: 10000, annualBonus: 20000, rates: CITY_PRESETS.beijing.rates, special: EMPTY_SPECIAL });
    expect(r.employerCost).toBe(120000 + 3920 * 12 + 20000);
  });
  it('专项扣除降低税负', () => {
    const base = { monthlySalary: 30000, rates: CITY_PRESETS.beijing.rates } as const;
    const noDeduct = calcSalary({ ...base, special: EMPTY_SPECIAL });
    const withDeduct = calcSalary({ ...base, special: { ...EMPTY_SPECIAL, childrenEducation: 1, mortgageInterest: 1, rentTier: 1, elderlySupport: 1 } });
    expect(withDeduct.annual.taxMerged).toBeLessThan(noDeduct.annual.taxMerged);
  });
  it('months 参数生效', () => {
    const r = calcSalary({ monthlySalary: 10000, months: 13, rates: CITY_PRESETS.beijing.rates, special: EMPTY_SPECIAL });
    expect(r.annual.gross).toBe(130000);
  });
});
