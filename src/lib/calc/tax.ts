// 个税 / 五险一金计算库（中国大陆税制，2019 年起综合所得税制）。
// 税率表来源：国家税务总局关于个人所得税综合所得汇算清缴涉及年度税率表；
// 专项附加扣除为标准提高后（2023 年起）口径。数据为静态常量，页面需注明"仅供参考"。

export interface TaxBracket {
  /** 级距上限（年应纳税所得额，元）；Infinity 为最高档 */
  upTo: number;
  rate: number;
  /** 速算扣除数 */
  deduct: number;
}

/** 年度综合所得税率表（工资薪金等综合所得合并计税）。 */
export const ANNUAL_TAX_BRACKETS: TaxBracket[] = [
  { upTo: 36000, rate: 0.03, deduct: 0 },
  { upTo: 144000, rate: 0.10, deduct: 2520 },
  { upTo: 300000, rate: 0.20, deduct: 16920 },
  { upTo: 420000, rate: 0.25, deduct: 31920 },
  { upTo: 660000, rate: 0.30, deduct: 52920 },
  { upTo: 960000, rate: 0.35, deduct: 85920 },
  { upTo: Infinity, rate: 0.45, deduct: 181920 },
];

/** 全年一次性奖金单独计税：按月换算后的月度税率表。 */
export const BONUS_MONTHLY_BRACKETS: TaxBracket[] = [
  { upTo: 3000, rate: 0.03, deduct: 0 },
  { upTo: 12000, rate: 0.10, deduct: 210 },
  { upTo: 25000, rate: 0.20, deduct: 1410 },
  { upTo: 35000, rate: 0.25, deduct: 2660 },
  { upTo: 55000, rate: 0.30, deduct: 4410 },
  { upTo: 80000, rate: 0.35, deduct: 7160 },
  { upTo: Infinity, rate: 0.45, deduct: 15160 },
];

/** 基本减除费用（起征点）：60,000 元/年。 */
export const ANNUAL_BASIC_DEDUCTION = 60000;

/** 按 bracket 表计算税额（速算扣除数法）。 */
export function taxByBrackets(taxable: number, brackets: TaxBracket[]): { tax: number; bracket: TaxBracket } {
  const t = Math.max(0, taxable);
  const bracket = brackets.find((b) => t <= b.upTo) ?? brackets[brackets.length - 1];
  return { tax: Math.max(0, t * bracket.rate - bracket.deduct), bracket };
}

/** 年度综合所得应纳税额。 */
export function calcIncomeTax(annualTaxable: number): { tax: number; rate: number } {
  const { tax, bracket } = taxByBrackets(annualTaxable, ANNUAL_TAX_BRACKETS);
  return { tax: round2(tax), rate: bracket.rate };
}

/** 年终奖单独计税：bonus/12 找月度税率表，税率作用于全额奖金。 */
export function calcBonusTaxSeparate(bonus: number): { tax: number; rate: number; net: number } {
  if (bonus <= 0) return { tax: 0, rate: 0, net: 0 };
  const monthly = bonus / 12;
  const { bracket } = taxByBrackets(monthly, BONUS_MONTHLY_BRACKETS);
  const tax = Math.max(0, bonus * bracket.rate - bracket.deduct);
  return { tax: round2(tax), rate: bracket.rate, net: round2(bonus - tax) };
}

// ── 五险一金 ──

export interface SocialRates {
  pensionPersonal: number;      // 养老 个人
  medicalPersonal: number;      // 医疗 个人
  unemploymentPersonal: number; // 失业 个人
  housingFundPersonal: number;  // 公积金 个人（5%~12% 可选）
  medicalExtraMonthly: number;  // 医疗大病固定额（元/月，如北京 3 元）
  pensionEmployer: number;      // 养老 单位
  medicalEmployer: number;      // 医疗 单位
  unemploymentEmployer: number; // 失业 单位
  injuryEmployer: number;       // 工伤 单位
  maternityEmployer: number;    // 生育 单位
  housingFundEmployer: number;  // 公积金 单位
}

export interface CityPreset {
  name: string;
  rates: SocialRates;
  note: string;
}

/** 城市比例预设（个人+单位口径，约 2025 年水平；比例随政策调整，页面允许自定义）。 */
export const CITY_PRESETS: Record<string, CityPreset> = {
  beijing: {
    name: '北京',
    rates: {
      pensionPersonal: 0.08, medicalPersonal: 0.02, unemploymentPersonal: 0.005, housingFundPersonal: 0.12, medicalExtraMonthly: 3,
      pensionEmployer: 0.16, medicalEmployer: 0.095, unemploymentEmployer: 0.005, injuryEmployer: 0.004, maternityEmployer: 0.008, housingFundEmployer: 0.12,
    },
    note: '生育已并入医疗；公积金比例 5%~12% 可选',
  },
  shanghai: {
    name: '上海',
    rates: {
      pensionPersonal: 0.08, medicalPersonal: 0.02, unemploymentPersonal: 0.005, housingFundPersonal: 0.07, medicalExtraMonthly: 0,
      pensionEmployer: 0.16, medicalEmployer: 0.095, unemploymentEmployer: 0.005, injuryEmployer: 0.0016, maternityEmployer: 0.01, housingFundEmployer: 0.07,
    },
    note: '公积金比例 5%~7%',
  },
  guangzhou: {
    name: '广州',
    rates: {
      pensionPersonal: 0.08, medicalPersonal: 0.02, unemploymentPersonal: 0.002, housingFundPersonal: 0.05, medicalExtraMonthly: 0,
      pensionEmployer: 0.14, medicalEmployer: 0.055, unemploymentEmployer: 0.007, injuryEmployer: 0.002, maternityEmployer: 0.0085, housingFundEmployer: 0.05,
    },
    note: '公积金比例 5%~12%',
  },
  shenzhen: {
    name: '深圳',
    rates: {
      pensionPersonal: 0.08, medicalPersonal: 0.02, unemploymentPersonal: 0.003, housingFundPersonal: 0.05, medicalExtraMonthly: 0,
      pensionEmployer: 0.14, medicalEmployer: 0.052, unemploymentEmployer: 0.007, injuryEmployer: 0.0014, maternityEmployer: 0.0045, housingFundEmployer: 0.05,
    },
    note: '医保一二三档差异大，此处按职工基本医保二档口径',
  },
  hangzhou: {
    name: '杭州',
    rates: {
      pensionPersonal: 0.08, medicalPersonal: 0.02, unemploymentPersonal: 0.005, housingFundPersonal: 0.12, medicalExtraMonthly: 0,
      pensionEmployer: 0.14, medicalEmployer: 0.095, unemploymentEmployer: 0.005, injuryEmployer: 0.002, maternityEmployer: 0.012, housingFundEmployer: 0.12,
    },
    note: '公积金比例 5%~12%',
  },
  custom: {
    name: '自定义',
    rates: {
      pensionPersonal: 0.08, medicalPersonal: 0.02, unemploymentPersonal: 0.005, housingFundPersonal: 0.12, medicalExtraMonthly: 0,
      pensionEmployer: 0.16, medicalEmployer: 0.095, unemploymentEmployer: 0.005, injuryEmployer: 0.004, maternityEmployer: 0.008, housingFundEmployer: 0.12,
    },
    note: '按当地社保公布比例手动填写',
  },
};

export interface SocialItem {
  label: string;
  amount: number;
  rate: number;
}
export interface SocialResult {
  base: number;
  personal: { items: SocialItem[]; total: number };
  employer: { items: SocialItem[]; total: number };
}

/** 按基数与比例计算五险一金明细（未考虑各地缴费基数上下限）。 */
export function calcSocialInsurance(base: number, rates: SocialRates): SocialResult {
  const b = Math.max(0, base);
  const p = (label: string, rate: number) => ({ label, rate, amount: round2(b * rate) });
  const items: SocialItem[] = [
    p('养老保险', rates.pensionPersonal),
    p('医疗保险', rates.medicalPersonal),
    p('失业保险', rates.unemploymentPersonal),
    p('住房公积金', rates.housingFundPersonal),
  ];
  if (rates.medicalExtraMonthly > 0) items.push({ label: '大病医疗（固定）', rate: 0, amount: rates.medicalExtraMonthly });
  const employerItems: SocialItem[] = [
    p('养老保险', rates.pensionEmployer),
    p('医疗保险', rates.medicalEmployer),
    p('失业保险', rates.unemploymentEmployer),
    p('工伤保险', rates.injuryEmployer),
    p('生育保险', rates.maternityEmployer),
    p('住房公积金', rates.housingFundEmployer),
  ];
  return {
    base: b,
    personal: { items, total: round2(items.reduce((s, x) => s + x.amount, 0)) },
    employer: { items: employerItems, total: round2(employerItems.reduce((s, x) => s + x.amount, 0)) },
  };
}

// ── 专项附加扣除 ──

/** 专项附加扣除月标准（2023 年提高后，元/月）。 */
export const SPECIAL_DEDUCTION_LIMITS = {
  childrenEducation: 2000,   // 子女教育：每个子女
  infantCare: 2000,          // 3 岁以下婴幼儿照护：每个婴幼儿
  continuingEducation: 400,  // 继续教育（学历）
  mortgageInterest: 1000,    // 住房贷款利息（本人或配偶首套）
  rentMetro: 1500,           // 住房租金：省会/直辖市等
  rentCity: 1100,            // 住房租金：市辖区人口超 100 万
  rentSmall: 800,            // 住房租金：其余
  elderlySupport: 3000,      // 赡养老人（独生子女全额；非独生分摊）
} as const;

export interface SpecialDeductions {
  childrenEducation: number;   // 子女数（每人 2000/月）
  infantCare: number;          // 婴幼儿数（每人 2000/月）
  continuingEducation: number; // 人数（400/月）
  mortgageInterest: 0 | 1;     // 是否首套房贷（1000/月）
  rentTier: 0 | 1 | 2 | 3;     // 0 无 / 1 直辖市省会 / 2 大城市 / 3 中小城市
  elderlySupport: number;      // 赡养老人（3000/月，非独生需按分摊额填写）
}

export const EMPTY_SPECIAL: SpecialDeductions = {
  childrenEducation: 0, infantCare: 0, continuingEducation: 0, mortgageInterest: 0, rentTier: 0, elderlySupport: 0,
};

/** 月度专项附加扣除合计。 */
export function monthlySpecialDeduction(d: SpecialDeductions): number {
  const rent = d.rentTier === 1 ? SPECIAL_DEDUCTION_LIMITS.rentMetro : d.rentTier === 2 ? SPECIAL_DEDUCTION_LIMITS.rentCity : d.rentTier === 3 ? SPECIAL_DEDUCTION_LIMITS.rentSmall : 0;
  return (
    d.childrenEducation * SPECIAL_DEDUCTION_LIMITS.childrenEducation +
    d.infantCare * SPECIAL_DEDUCTION_LIMITS.infantCare +
    d.continuingEducation * SPECIAL_DEDUCTION_LIMITS.continuingEducation +
    d.mortgageInterest * SPECIAL_DEDUCTION_LIMITS.mortgageInterest +
    rent +
    d.elderlySupport * SPECIAL_DEDUCTION_LIMITS.elderlySupport
  );
}

// ── 汇总计算 ──

export interface SalaryInput {
  /** 月薪（税前，元） */
  monthlySalary: number;
  /** 计薪月数，默认 12 */
  months?: number;
  /** 年终奖（元，按全年一次性奖金处理） */
  annualBonus?: number;
  /** 社保缴费基数，默认取月薪 */
  socialBase?: number;
  rates: SocialRates;
  special: SpecialDeductions;
  /** 其他月度扣除（如个人商业健康保险，元/月） */
  otherMonthlyDeduction?: number;
}

export interface SalaryResult {
  months: number;
  monthly: {
    gross: number;
    socialPersonal: number;
    special: number;
    other: number;
    /** 当月到手（年终奖按 12 个月平均预扣估算） */
    net: number;
  };
  annual: {
    gross: number;
    socialPersonal: number;
    special: number;
    other: number;
    basicDeduction: number;
    /** 应纳税所得额（合并计税口径，含年终奖） */
    taxableMerged: number;
    taxMerged: number;
    /** 年终奖单独计税口径 */
    bonusTax: number;
    taxSeparate: number;
    betterMethod: 'merged' | 'separate';
    taxSavedByChoice: number;
    net: number;
    effectiveRate: number;
  };
  social: SocialResult;
  employerCost: number;
}

/** 年度工资薪金 + 年终奖测算（月度预扣预缴的年度近似）。 */
export function calcSalary(input: SalaryInput): SalaryResult {
  const months = Math.max(1, Math.round(input.months ?? 12));
  const bonus = Math.max(0, input.annualBonus ?? 0);
  const socialBase = input.socialBase ?? input.monthlySalary;
  const social = calcSocialInsurance(socialBase, input.rates);
  const specialMonthly = monthlySpecialDeduction(input.special);
  const otherMonthly = Math.max(0, input.otherMonthlyDeduction ?? 0);

  const annualGross = round2(input.monthlySalary * months);
  const annualSocial = round2(social.personal.total * months);
  const annualSpecial = round2(specialMonthly * months);
  const annualOther = round2(otherMonthly * months);
  const basic = ANNUAL_BASIC_DEDUCTION;

  // 合并计税：年终奖并入综合所得
  const taxableMerged = Math.max(0, annualGross + bonus - basic - annualSocial - annualSpecial - annualOther);
  const taxMerged = round2(taxByBrackets(taxableMerged, ANNUAL_TAX_BRACKETS).tax);

  // 单独计税：工资部分 + 年终奖单独
  const taxableSalaryOnly = Math.max(0, annualGross - basic - annualSocial - annualSpecial - annualOther);
  const taxSalaryOnly = round2(taxByBrackets(taxableSalaryOnly, ANNUAL_TAX_BRACKETS).tax);
  const bonusTax = calcBonusTaxSeparate(bonus).tax;
  const taxSeparate = round2(taxSalaryOnly + bonusTax);

  const better = taxSeparate <= taxMerged ? 'separate' : 'merged';
  const finalTax = better === 'separate' ? taxSeparate : taxMerged;

  const monthlyNet = round2((annualGross - annualSocial - annualSpecial - annualOther - finalTax) / months);

  return {
    months,
    monthly: {
      gross: round2(input.monthlySalary),
      socialPersonal: social.personal.total,
      special: specialMonthly,
      other: otherMonthly,
      net: monthlyNet,
    },
    annual: {
      gross: annualGross,
      socialPersonal: annualSocial,
      special: annualSpecial,
      other: annualOther,
      basicDeduction: basic,
      taxableMerged,
      taxMerged,
      bonusTax,
      taxSeparate,
      betterMethod: better,
      taxSavedByChoice: round2(Math.abs(taxMerged - taxSeparate)),
      net: round2(annualGross + bonus - annualSocial - annualSpecial - annualOther - finalTax),
      effectiveRate: annualGross + bonus > 0 ? round2((finalTax / (annualGross + bonus)) * 10000) / 100 : 0,
    },
    social,
    employerCost: round2(annualGross + social.employer.total * months + bonus),
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
