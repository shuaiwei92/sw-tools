// BMI 计算器：体质指数、体型分类与健康体重范围（采用国内通用标准：18.5 / 24 / 28）

export interface BMIResult {
  bmi: number;
  category: string;
  healthyMin: number; // kg
  healthyMax: number; // kg
  healthyRangeText: string;
}

export function calcBMI(weightKg: number, heightCm: number): BMIResult {
  if (heightCm <= 0) throw new Error('身高需大于 0');
  const h = heightCm / 100;
  const bmi = weightKg / (h * h);
  let category: string;
  if (bmi < 18.5) category = '偏瘦';
  else if (bmi < 24) category = '正常';
  else if (bmi < 28) category = '超重';
  else category = '肥胖';
  const healthyMin = 18.5 * h * h;
  const healthyMax = 24 * h * h;
  return {
    bmi,
    category,
    healthyMin,
    healthyMax,
    healthyRangeText: `${healthyMin.toFixed(1)} ~ ${healthyMax.toFixed(1)} kg`,
  };
}
