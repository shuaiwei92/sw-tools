// Base 系列编码：Base16 / Base32 / Base58 / Base64 / Base64URL / Base85(Ascii85)。
// 全部按 UTF-8 字节处理，非 ASCII 文本可安全编解码；零依赖。

import { bytesToBase64, base64ToBytes, base64ToUrl, urlToBase64, bytesToBin, binToBytes } from './bytes';

export type BaseAlgo = 'base16' | 'base32' | 'base58' | 'base64' | 'base64url' | 'base85';

export const BASE_ALGOS: { id: BaseAlgo; label: string }[] = [
  { id: 'base16', label: 'Base16（Hex）' },
  { id: 'base32', label: 'Base32（RFC 4648）' },
  { id: 'base58', label: 'Base58（比特币字母表）' },
  { id: 'base64', label: 'Base64' },
  { id: 'base64url', label: 'Base64URL' },
  { id: 'base85', label: 'Base85（Ascii85）' },
];

const B16 = '0123456789ABCDEF';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** 按指定算法把字节编码为字符串。 */
export function baseEncode(bytes: Uint8Array, algo: BaseAlgo): string {
  switch (algo) {
    case 'base16':
      return Array.from(bytes, (b) => B16[b >> 4] + B16[b & 15]).join('');
    case 'base32':
      return b32Encode(bytes);
    case 'base58':
      return b58Encode(bytes);
    case 'base64':
      return bytesToBase64(bytes);
    case 'base64url':
      return base64ToUrl(bytesToBase64(bytes));
    case 'base85':
      return b85Encode(bytes);
  }
}

/** 按指定算法把字符串解码为字节；非法输入抛错（带中文提示）。 */
export function baseDecode(text: string, algo: BaseAlgo): Uint8Array {
  switch (algo) {
    case 'base16': {
      const clean = text.replace(/\s+/g, '');
      if (!/^[0-9A-Fa-f]*$/.test(clean)) throw new Error('Base16 含有非十六进制字符');
      if (clean.length % 2) throw new Error('Base16 长度必须是偶数');
      const out = new Uint8Array(clean.length / 2);
      for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
      return out;
    }
    case 'base32':
      return b32Decode(text);
    case 'base58':
      return b58Decode(text);
    case 'base64':
      return base64ToBytes(text.replace(/\s+/g, ''));
    case 'base64url':
      return base64ToBytes(urlToBase64(text.replace(/\s+/g, '')));
    case 'base85':
      return b85Decode(text);
  }
}

/** 一步到位：UTF-8 文本 → 指定算法字符串。 */
export const baseEncodeText = (text: string, algo: BaseAlgo): string =>
  baseEncode(new TextEncoder().encode(text), algo);

/** 一步到位：指定算法字符串 → UTF-8 文本。 */
export const baseDecodeText = (text: string, algo: BaseAlgo): string =>
  new TextDecoder().decode(baseDecode(text, algo));

/** 粗略判断文本是否符合某算法的字符集与长度规则（用于自动方向识别）。 */
export function looksLikeAlgo(text: string, algo: BaseAlgo): boolean {
  const t = text.trim();
  if (!t) return false;
  switch (algo) {
    case 'base16':
      return /^[0-9A-Fa-f\s]+$/.test(t) && t.replace(/\s+/g, '').length % 2 === 0;
    case 'base32':
      return /^[A-Z2-7=\s]+$/i.test(t);
    case 'base58':
      return /^[1-9A-HJ-NP-Za-km-z]+$/.test(t);
    case 'base64':
      return /^[A-Za-z0-9+/\s]+={0,2}$/.test(t) && t.replace(/\s+/g, '').length % 4 === 0;
    case 'base64url':
      return /^[A-Za-z0-9-_\s]+$/.test(t);
    case 'base85':
      return /^[!-u\s]+$/.test(t);
  }
}

// ── Base32（RFC 4648，5 位一组，'=' 填充）──────────────────────────
function b32Encode(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const b of bytes) {
    buffer = (buffer << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(buffer >> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(buffer << (5 - bits)) & 31];
  while (out.length % 8) out += '=';
  return out;
}

function b32Decode(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '').replace(/\s+/g, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = B32.indexOf(ch.toUpperCase());
    if (v < 0) throw new Error(`Base32 含有非法字符：${ch}`);
    buffer = (buffer << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

// ── Base58（大整数风格：前导 0 字节 → '1'）─────────────────────────
function b58Encode(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits: number[] = []; // 小端 base58 位
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  return '1'.repeat(zeros) + digits.reverse().map((d) => B58[d]).join('');
}

function b58Decode(text: string): Uint8Array {
  const clean = text.replace(/\s+/g, '');
  let zeros = 0;
  while (zeros < clean.length && clean[zeros] === '1') zeros++;
  const bytes: number[] = []; // 小端 base256 位
  for (let i = zeros; i < clean.length; i++) {
    const v = B58.indexOf(clean[i]);
    if (v < 0) throw new Error(`Base58 含有非法字符：${clean[i]}`);
    let carry = v;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) out[zeros + i] = bytes[bytes.length - 1 - i];
  return out;
}

// ── Base85（Ascii85：字符 33~117，全零组简写为 'z'，末尾组按 n+1 字符规则）──
function b85Encode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 4) {
    const remain = Math.min(4, bytes.length - i);
    let v = 0;
    for (let j = 0; j < 4; j++) v = v * 256 + (i + j < bytes.length ? bytes[i + j] : 0);
    if (remain === 4 && v === 0) {
      out += 'z';
      continue;
    }
    const chars: number[] = [];
    for (let j = 0; j < 5; j++) {
      chars.push(33 + (v % 85));
      v = Math.floor(v / 85);
    }
    if (remain < 4) chars.length = remain + 1; // 部分组只取前 n+1 个字符
    out += String.fromCharCode(...chars.reverse());
  }
  return out;
}

function b85Decode(text: string): Uint8Array {
  const clean = text.replace(/\s+/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 5) {
    const raw = clean.slice(i, i + 5);
    if (raw === 'z') {
      out.push(0, 0, 0, 0);
      continue;
    }
    const full = raw.length === 5;
    if (!full && raw.length < 2) throw new Error('Base85 分组长度不合法（末尾组至少 2 个字符）');
    const group = full ? raw : raw.padEnd(5, 'u');
    let v = 0;
    for (const ch of group) {
      const c = ch.charCodeAt(0);
      if (c < 33 || c > 117) throw new Error(`Base85 含有非法字符：${ch}`);
      v = v * 85 + (c - 33);
    }
    if (v >= 2 ** 32) throw new Error('Base85 分组数值溢出');
    const bs: number[] = [];
    for (let j = 0; j < 4; j++) {
      bs.push(v & 0xff);
      v = Math.floor(v / 256);
    }
    bs.reverse();
    out.push(...(full ? bs : bs.slice(0, raw.length - 1)));
  }
  return new Uint8Array(out);
}

// 供需要「字节 ↔ 二进制串」调用的外部复用
export { bytesToBin, binToBytes };
