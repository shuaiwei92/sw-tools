// 分数计算：四则运算、化简、小数互转

export interface Frac {
  n: number;
  d: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/** 构造最简分数（自动处理符号与分母为负的情况） */
export function frac(n: number, d = 1): Frac {
  if (d === 0) throw new Error('分母不能为 0');
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

export function fadd(a: Frac, b: Frac): Frac {
  return frac(a.n * b.d + b.n * a.d, a.d * b.d);
}
export function fsub(a: Frac, b: Frac): Frac {
  return frac(a.n * b.d - b.n * a.d, a.d * b.d);
}
export function fmul(a: Frac, b: Frac): Frac {
  return frac(a.n * b.n, a.d * b.d);
}
export function fdiv(a: Frac, b: Frac): Frac {
  if (b.n === 0) throw new Error('除数（第二个分数）不能为 0');
  return frac(a.n * b.d, a.d * b.n);
}

export function toDecimal(f: Frac): number {
  return f.n / f.d;
}

/** 小数转分数（限制分母，避免无限展开） */
export function fromDecimal(x: number): Frac {
  const s = String(x);
  const [intPart, fracPart = ''] = s.split('.');
  if (!fracPart) return frac(parseInt(intPart || '0', 10));
  const den = Math.pow(10, fracPart.length);
  return frac(parseInt(intPart || '0', 10) * den + parseInt(fracPart, 10), den);
}

export function display(f: Frac): string {
  return f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`;
}
