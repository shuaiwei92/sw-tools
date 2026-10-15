// GBK / UTF-8 乱码转换库。
// 解码（GBK 字节 → 文本）走浏览器/Node 内置 TextDecoder('gbk')；
// 编码（文本 → GBK 字节）没有内置支持，首次使用时遍历 GBK 码位用 TextDecoder 反推unicode→gbk 映射表（一次约 3 万次解码，毫秒级）。
// 依赖 ICU 对 gbk 的支持：Chrome / Edge / Firefox / Safari 16.4+ / Node（full-icu）均可。

let encMap: Map<number, number> | null = null; // unicode → gbk 双字节码（0xXXXX）

function gbkDecoder(): TextDecoder | null {
  try {
    const d = new TextDecoder('gbk');
    // 用一个已知字节验证解码器真实可用（不支持时会抛错或输出替换符）
    const probe = d.decode(new Uint8Array([0xd6, 0xd0]), { stream: false });
    return probe === '中' ? d : null;
  } catch {
    return null;
  }
}

let cachedDecoder: TextDecoder | null | undefined;
function decoder(): TextDecoder | null {
  if (cachedDecoder === undefined) cachedDecoder = gbkDecoder();
  return cachedDecoder;
}

/** 构建 unicode → GBK 编码映射（惰性，仅一次）。 */
function buildEncMap(): Map<number, number> {
  const dec = decoder();
  const map = new Map<number, number>();
  if (dec) {
    const buf = new Uint8Array(2);
    for (let lead = 0x81; lead <= 0xfe; lead++) {
      for (let trail = 0x40; trail <= 0xfe; trail++) {
        if (trail === 0x7f) continue;
        buf[0] = lead; buf[1] = trail;
        const ch = dec.decode(buf);
        if (ch.length === 1) {
          const code = ch.codePointAt(0)!;
          if (code > 0x7f && !map.has(code)) map.set(code, (lead << 8) | trail);
        }
      }
    }
  }
  return map;
}

function encodeMap(): Map<number, number> {
  if (!encMap) encMap = buildEncMap();
  return encMap;
}

/** 当前环境是否支持 GBK 编解码。 */
export function gbkSupported(): boolean {
  return decoder() !== null;
}

/** GBK 字节数组 → UTF-8 文本。 */
export function decodeGbk(bytes: Uint8Array): string {
  const dec = decoder();
  if (!dec) throw new Error('当前环境不支持 GBK 解码（需要支持 TextDecoder("gbk") 的浏览器）');
  return dec.decode(bytes);
}

/** UTF-8 文本 → GBK 字节数组。不在 GB 字符集内的字符替换为 '?'。 */
export function encodeGbk(text: string): Uint8Array {
  const map = encodeMap();
  const out: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code <= 0x7f) { out.push(code); continue; }
    const gbk = map.get(code);
    if (gbk === undefined) { out.push(0x3f); continue; } // '?'
    out.push((gbk >> 8) & 0xff, gbk & 0xff);
  }
  return new Uint8Array(out);
}

/** 文本的 UTF-8 字节按 GBK 解读（模拟"UTF-8 文件被 GBK 打开"的乱码效果）。 */
export function utf8TextToGbkText(text: string): string {
  return decodeGbk(new TextEncoder().encode(text));
}

/** 乱码文本恢复：把字符按 GBK 编码回字节，再按 UTF-8 解码（模拟"GBK 文件被 UTF-8 打开"的逆向恢复）。 */
export function gbkTextToUtf8(text: string): string {
  const bytes = encodeGbk(text);
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/** 自动恢复：按 GBK 编码后若 UTF-8 解码结果不含替换符则采用，否则原样返回。 */
export function fixMojibake(text: string): { text: string; recovered: boolean } {
  try {
    const fixed = gbkTextToUtf8(text);
    const ok = !fixed.includes('\uFFFD') && fixed !== text;
    return { text: ok ? fixed : text, recovered: ok };
  } catch {
    return { text, recovered: false };
  }
}

/** 字节 → 十六进制串（空格分隔，每字节两位）。 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');
}

/** 十六进制串（容忍空格/0x/逗号分隔）→ 字节数组。非法字符抛错。 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/0x/gi, '').replace(/[\s,:-]+/g, '');
  if (!clean) return new Uint8Array(0);
  if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) throw new Error('十六进制串含非法字符或长度为奇数');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
