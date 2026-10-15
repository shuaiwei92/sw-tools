// 复利计算器：本金 + 每期定投，计算终值与本息构成

export interface CompoundInput {
  principal: number;
  monthlyContribution: number; // 每期投入
  annualRate: number; // 年利率（百分比）
  years: number;
  compoundsPerYear?: number; // 每年复利/投入期数，默认 12（按月）
}

export interface CompoundResult {
  futureValue: number;
  totalContributions: number;
  totalInterest: number;
}

export function calcCompound(input: CompoundInput): CompoundResult {
  const P = Math.max(0, input.principal);
  const C = Math.max(0, input.monthlyContribution);
  const annual = input.annualRate / 100;
  const m = input.compoundsPerYear ?? 12;
  const n = m * input.years;
  const i = annual / m;

  const growth = Math.pow(1 + i, n);
  const fvPrincipal = P * growth;
  const fvContrib = i === 0 ? C * n : C * (growth - 1) / i;
  const futureValue = fvPrincipal + fvContrib;
  const totalContributions = P + C * n;
  return { futureValue, totalContributions, totalInterest: futureValue - totalContributions };
}
