// 房贷 / 贷款计算器核心：区分商贷、公积金、组合贷、其他贷款四种类型。
//
// 利率环境（2026-10 实际值，供默认值与说明使用，用户可改）：
// - LPR（2026-09-20 报价）：1 年期 3.00%，5 年期以上 3.50%；房贷参考 5 年期以上
// - 首套房贷主流定价：LPR - 30BP ≈ 3.20%；LPR - 45BP ≈ 3.05%
// - 公积金贷款（2026 执行）：首套 5 年以下 2.1% / 5 年以上 2.6%；二套 2.525% / 3.075%
// - 重定价日：商贷常见「次年 1 月 1 日」或「对年对月」（放款对应日）

export type LoanType = 'commercial' | 'provident' | 'combo' | 'other';
export type LoanMethod = 'equal-installment' | 'equal-principal';
/** 定价方式：lpr = LPR + 基点（浮动）；fixed = 固定利率 */
export type PricingMode = 'lpr' | 'fixed';
/** 重定价日：jan1 = 次年 1 月 1 日；anniversary = 对年对月（贷款发放对应日） */
export type RepricingDay = 'jan1' | 'anniversary';

export interface LoanTypeMeta {
  id: LoanType;
  name: string;
  /** 一句话定位 */
  short: string;
  /** 与其他贷款的关键差异 */
  points: string[];
}

export const LOAN_TYPE_META: LoanTypeMeta[] = [
  {
    id: 'commercial',
    name: '商贷（住房）',
    short: '个人住房商业贷款，利率随 LPR 浮动',
    points: [
      '利率 = 5 年期以上 LPR + 基点（BP），如主流首套 LPR − 30BP',
      '浮动利率，约每 12 个月按重定价日最新 LPR 重新定价',
      '额度取决于房屋评估价与首付比例，常见首付 15% 起',
    ],
  },
  {
    id: 'provident',
    name: '公积金贷款',
    short: '住房公积金贷款，央行统一固定利率，成本最低',
    points: [
      '利率全国统一固定：首套 5 年以上 2.6%，二套 3.075%（2026 执行）',
      '不随 LPR 变动；遇法定利率调整时次年 1 月 1 日起执行新利率',
      '额度有上限（各地常见单人 60 万 / 双职工 100~120 万），期限最长 30 年',
    ],
  },
  {
    id: 'combo',
    name: '组合贷',
    short: '商贷 + 公积金同时使用，两段分别计息',
    points: [
      '公积金部分用尽额度后，差额走商贷，两段本金、利率各自独立',
      '月供为两段之和；还款方式通常一致（均为等额本息或等额本金）',
      '综合成本介于纯商贷与纯公积金之间',
    ],
  },
  {
    id: 'other',
    name: '其他贷款',
    short: '消费贷 / 经营贷 / 信用贷等，固定利率',
    points: [
      '利率由银行产品定价，一般为固定利率，不挂钩 LPR',
      '期限较短（常见 1~5 年），额度与用途受监管约束',
      '资金不得流入楼市股市，利率通常高于房贷',
    ],
  },
];

/** LPR 报价（%）。房贷（5 年以上）参考 fiveYearPlus。 */
export const LPR_QUOTE = { oneYear: 3.0, fiveYearPlus: 3.5, updated: '2026-09-20' };

/** 常用基点快捷档（BP，1BP = 0.01 个百分点） */
export const BP_PRESETS = [-45, -30, 0, 30, 60];

/** 公积金贷款利率（%）：首套 / 二套，按贷款年限是否超过 5 年分档 */
export const PROVIDENT_RATES = {
  first: { upTo5: 2.1, over5: 2.6 },
  second: { upTo5: 2.525, over5: 3.075 },
} as const;

export type HouseType = 'first' | 'second';

/** 公积金贷款执行利率：houseType 首套/二套；years > 5 取 over5 档，否则 upTo5 档 */
export function providentRate(houseType: HouseType, years: number): number {
  const table = PROVIDENT_RATES[houseType];
  return years > 5 ? table.over5 : table.upTo5;
}

/** 定价方式 → 实际年利率（%）。lpr 模式：LPR + 基点/100；fixed 模式：直接取固定利率。 */
export function effectiveRate(
  pricing: PricingMode,
  opt: { lpr?: number; bp?: number; fixedRate?: number }
): number {
  if (pricing === 'lpr') {
    const lpr = opt.lpr ?? LPR_QUOTE.fiveYearPlus;
    return lpr + (opt.bp ?? 0) / 100;
  }
  return opt.fixedRate ?? 0;
}

/** 计算中的一段贷款（组合贷 = 两段） */
export interface LoanSegment {
  label: string;
  principal: number;
  annualRate: number; // 年利率（%）
}

export interface LoanInput {
  method: LoanMethod;
  years: number;
  segments: LoanSegment[];
}

export interface LoanRow {
  month: number;
  payment: number;
  principalPart: number;
  interestPart: number;
  remaining: number;
}

export interface SegmentResult {
  label: string;
  principal: number;
  annualRate: number;
  /** 等额本息为固定月供；等额本金为首月月供 */
  monthlyPayment: number;
  lastPayment: number;
  totalPayment: number;
  totalInterest: number;
}

export interface LoanResult {
  /** 等额本息为固定月供；等额本金为首月月供 */
  monthlyPayment: number;
  lastPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: LoanRow[];
  segments: SegmentResult[];
}

function calcSegment(seg: LoanSegment, method: LoanMethod, n: number): SegmentResult & { rows: LoanRow[] } {
  const P = seg.principal;
  const r = seg.annualRate / 100 / 12;
  const rows: LoanRow[] = [];
  let remain = P;
  let first = 0;

  if (method === 'equal-installment') {
    let M = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    for (let m = 1; m <= n; m++) {
      const interest = remain * r;
      let principalPart = M - interest;
      let payment = M;
      if (m === n) {
        principalPart = remain;
        payment = principalPart + interest;
        remain = 0;
      } else {
        remain -= principalPart;
      }
      rows.push({ month: m, payment, principalPart, interestPart: interest, remaining: Math.max(remain, 0) });
    }
    first = M;
  } else {
    const perMonth = P / n;
    for (let m = 1; m <= n; m++) {
      const interest = remain * r;
      let principalPart = perMonth;
      if (m === n) principalPart = remain;
      const payment = principalPart + interest;
      remain = Math.max(remain - principalPart, 0);
      rows.push({ month: m, payment, principalPart, interestPart: interest, remaining: remain });
    }
    first = rows[0].payment;
  }

  const totalPayment = rows.reduce((s, x) => s + x.payment, 0);
  return {
    label: seg.label,
    principal: P,
    annualRate: seg.annualRate,
    monthlyPayment: first,
    lastPayment: rows[rows.length - 1].payment,
    totalPayment,
    totalInterest: totalPayment - P,
    rows,
  };
}

/** 主计算：分段独立计算后按月合并（组合贷月供 = 各段之和）。 */
export function calcLoan(input: LoanInput): LoanResult {
  const segs = input.segments.filter((s) => s.principal > 0);
  const totalPrincipal = segs.reduce((s, x) => s + x.principal, 0);
  if (totalPrincipal <= 0) throw new Error('贷款金额需大于 0');
  const n = Math.max(1, Math.round(input.years * 12));

  const parts = segs.map((s) => calcSegment(s, input.method, n));
  const schedule: LoanRow[] = [];
  for (let m = 1; m <= n; m++) {
    let payment = 0;
    let principalPart = 0;
    let interestPart = 0;
    let remaining = 0;
    for (const p of parts) {
      const row = p.rows[m - 1];
      payment += row.payment;
      principalPart += row.principalPart;
      interestPart += row.interestPart;
      remaining += row.remaining;
    }
    schedule.push({ month: m, payment, principalPart, interestPart, remaining });
  }

  const totalPayment = schedule.reduce((s, x) => s + x.payment, 0);
  return {
    monthlyPayment: parts.reduce((s, p) => s + p.monthlyPayment, 0),
    lastPayment: schedule[schedule.length - 1].payment,
    totalPayment,
    totalInterest: totalPayment - totalPrincipal,
    schedule,
    segments: parts.map(({ rows: _rows, ...rest }) => rest),
  };
}

/** 同一参数下两种还款方式的对比：interestSaved > 0 表示等额本金比等额本息少付利息。 */
export function compareMethods(input: Omit<LoanInput, 'method'>): {
  installment: LoanResult;
  principal: LoanResult;
  interestSaved: number;
} {
  const installment = calcLoan({ ...input, method: 'equal-installment' });
  const principal = calcLoan({ ...input, method: 'equal-principal' });
  return {
    installment,
    principal,
    interestSaved: installment.totalInterest - principal.totalInterest,
  };
}
