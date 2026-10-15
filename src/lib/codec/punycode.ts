// Punycode（RFC 3492）：中文域名 ↔ xn-- 形式互转，纯函数零依赖。

const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128; // 'a' 之前的 ASCII 均视为基本码位

function adapt(delta: number, numPoints: number, firstTime: boolean): number {
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) / 2) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
}

function digitToBasic(digit: number): number {
  // 0-25 → 'a'-'z'，26-35 → '0'-'9'
  return digit + 22 + 75 * (digit < 26 ? 1 : 0);
}

function basicToDigit(cp: number): number {
  if (cp - 48 < 10) return cp - 22; // '0'-'9' → 26-35
  if (cp - 65 < 26) return cp - 65; // 'A'-'Z' → 0-25
  if (cp - 97 < 26) return cp - 97; // 'a'-'z' → 0-25
  return BASE; // 非法
}

/** 单个标签（label）编码为 punycode（不含 xn-- 前缀）。 */
export function punycodeEncodeLabel(input: string): string {
  const codes = Array.from(input.normalize('NFC'), (ch) => ch.codePointAt(0)!);
  const output: number[] = [];
  for (const c of codes) if (c < 0x80) output.push(c);
  const b = output.length;
  let h = b;
  if (b > 0) output.push(0x2d); // '-'
  let n = INITIAL_N;
  let delta = 0;
  let bias = INITIAL_BIAS;
  while (h < codes.length) {
    let m = Infinity;
    for (const c of codes) if (c >= n && c < m) m = c;
    delta += (m - n) * (h + 1);
    n = m;
    for (const c of codes) {
      if (c < n) delta++;
      if (c !== n) continue;
      let q = delta;
      for (let k = BASE; ; k += BASE) {
        const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
        if (q < t) break;
        output.push(digitToBasic(t + ((q - t) % (BASE - t))));
        q = Math.floor((q - t) / (BASE - t));
      }
      output.push(digitToBasic(q));
      bias = adapt(delta, h + 1, h === b);
      delta = 0;
      h++;
    }
    delta++;
    n++;
  }
  return String.fromCharCode(...output);
}

/** 单个标签的 punycode（不含 xn-- 前缀）解码回 Unicode 文本。 */
export function punycodeDecodeLabel(input: string): string {
  const output: number[] = [];
  let n = INITIAL_N;
  let i = 0;
  let bias = INITIAL_BIAS;
  const inputLen = input.length;
  let pos = input.lastIndexOf('-');
  if (pos > 0) {
    for (let j = 0; j < pos; j++) output.push(input.charCodeAt(j));
    pos++;
  } else {
    pos = 0;
  }
  while (pos < inputLen) {
    const oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (pos >= inputLen) throw new Error('Punycode 输入不完整');
      const digit = basicToDigit(input.charCodeAt(pos++));
      if (digit >= BASE) throw new Error(`非法 Punycode 字符：${input[pos - 1]}`);
      i += digit * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    bias = adapt(i - oldi, output.length + 1, oldi === 0);
    if (Math.floor(i / (output.length + 1)) > 0x7fffffff - n) {
      throw new Error('Punycode 解码溢出');
    }
    n += Math.floor(i / (output.length + 1));
    i = i % (output.length + 1);
    output.splice(i, 0, n);
    i++;
  }
  return String.fromCodePoint(...output);
}

/** 整域名字符串编码：非 ASCII 标签加 xn-- 前缀，ASCII 标签原样保留。 */
export function encodeDomain(domain: string): string {
  return domain
    .split('.')
    .map((label) =>
      /[^\x00-\x7f]/.test(label)
        ? 'xn--' + punycodeEncodeLabel(label.toLowerCase())
        : label
    )
    .join('.');
}

/** 整域名字符串解码：xn-- 标签还原为 Unicode，其余原样保留。 */
export function decodeDomain(domain: string): string {
  return domain
    .split('.')
    .map((label) =>
      /^xn--/i.test(label) ? punycodeDecodeLabel(label.slice(4).toLowerCase()) : label
    )
    .join('.');
}
