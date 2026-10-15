// 进制转换与位运算（2 ~ 36 任意进制，支持小数与 AND/OR/XOR/NOT/移位）

export function parseNum(value: string, base: number): number {
  const v = (value || '').trim();
  if (!v) return 0;
  const neg = v.startsWith('-');
  const body = neg ? v.slice(1) : v;
  const [intPart, fracPart = ''] = body.split('.');
  const intVal = parseInt(intPart || '0', base);
  let num = intVal;
  if (fracPart) {
    let f = 0;
    for (let i = 0; i < fracPart.length; i++) {
      const d = parseInt(fracPart[i], base);
      if (Number.isNaN(d)) continue;
      f += d / Math.pow(base, i + 1);
    }
    num = intVal + f;
  }
  if (Number.isNaN(num)) throw new Error('无法解析为 ' + base + ' 进制数字');
  return neg ? -num : num;
}

export function formatNum(num: number, base: number): string {
  if (!isFinite(num)) throw new Error('数值无效');
  const neg = num < 0;
  const n = Math.abs(num);
  const intPart = Math.floor(n);
  const frac = n - intPart;
  const intStr = intPart.toString(base);
  let fracStr = '';
  if (frac > 1e-12) {
    let f = frac;
    for (let i = 0; i < 12 && f > 1e-12; i++) {
      f *= base;
      const d = Math.floor(f);
      fracStr += d.toString(base);
      f -= d;
    }
  }
  const out = intStr + (fracStr ? '.' + fracStr : '');
  return (neg ? '-' : '') + out;
}

export function convertBase(value: string, from: number, to: number): string {
  const num = parseNum(value, from);
  return formatNum(num, to);
}

export function bitwise(
  aStr: string,
  bStr: string,
  op: 'and' | 'or' | 'xor' | 'not' | 'shl' | 'shr',
  base: number
): string {
  const a = Math.trunc(parseNum(aStr, base));
  const b = Math.trunc(parseNum(bStr, base));
  let r: number;
  switch (op) {
    case 'and':
      r = a & b;
      break;
    case 'or':
      r = a | b;
      break;
    case 'xor':
      r = a ^ b;
      break;
    case 'not':
      r = ~a;
      break;
    case 'shl':
      r = a << b;
      break;
    case 'shr':
      r = a >> b;
      break;
    default:
      throw new Error('未知位运算');
  }
  return formatNum(r, base);
}
