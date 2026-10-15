// TOTP / HOTP 双因素验证码（纯函数，零依赖，同步 HMAC-SHA1 实现）。
// 兼容 Google Authenticator / Microsoft Authenticator 的 Base32 密钥与 otpauth URI。

/* ---------- SHA-1 / HMAC-SHA1（同步实现） ---------- */

function sha1(bytes: Uint8Array): Uint8Array {
  const l = bytes.length;
  // 消息填充：1 字节 0x80 + 零填充到 56 mod 64 + 8 字节大端位长
  const total = Math.ceil((l + 9) / 64) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[l] = 0x80;
  const dv = new DataView(buf.buffer);
  const bits = l * 8;
  dv.setUint32(total - 8, Math.floor(bits / 2 ** 32), false);
  dv.setUint32(total - 4, bits >>> 0, false);

  let h0 = 0x67452301 | 0,
    h1 = 0xefcdab89 | 0,
    h2 = 0x98badcfe | 0,
    h3 = 0x10325476 | 0,
    h4 = 0xc3d2e1f0 | 0;
  const w = new Int32Array(80);
  for (let off = 0; off < total; off += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getInt32(off + j * 4, false);
    for (let j = 16; j < 80; j++) {
      const x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (x << 1) | (x >>> 31);
    }
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4;
    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999 | 0;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1 | 0;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc | 0;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6 | 0;
      }
      const t = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }
  const out = new Uint8Array(20);
  const odv = new DataView(out.buffer);
  odv.setInt32(0, h0, false);
  odv.setInt32(4, h1, false);
  odv.setInt32(8, h2, false);
  odv.setInt32(12, h3, false);
  odv.setInt32(16, h4, false);
  return out;
}

/** 导出供调试与单测：SHA-1（同步）。 */
export function sha1Pub(bytes: Uint8Array): Uint8Array {
  return sha1(bytes);
}

/** 导出供调试与单测：HMAC-SHA1（同步）。 */
export function hmacSha1Pub(key: Uint8Array, msg: Uint8Array): Uint8Array {
  return hmacSha1(key, msg);
}

function hmacSha1(key: Uint8Array, msg: Uint8Array): Uint8Array {
  const block = 64;
  const k = key.length > block ? sha1(key) : key;
  const kPad = new Uint8Array(block);
  kPad.set(k);
  const iPad = new Uint8Array(block);
  const oPad = new Uint8Array(block);
  for (let i = 0; i < block; i++) {
    iPad[i] = kPad[i] ^ 0x36;
    oPad[i] = kPad[i] ^ 0x5c;
  }
  const innerMsg = new Uint8Array(block + msg.length);
  innerMsg.set(iPad);
  innerMsg.set(msg, block);
  const inner = sha1(innerMsg);
  const outerMsg = new Uint8Array(block + 20);
  outerMsg.set(oPad);
  outerMsg.set(inner, block);
  return sha1(outerMsg);
}

/* ---------- Base32 ---------- */

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Base32 解码（RFC 4648，自动忽略空白与填充）。 */
export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error(`Base32 字符非法：${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** Base32 编码（带填充）。 */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += B32_ALPHABET[(value >>> bits) & 31];
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += '=';
  return out;
}

/* ---------- HOTP / TOTP ---------- */

function hotp(key: Uint8Array, counter: number, digits: number): string {
  const msg = new Uint8Array(8);
  const dv = new DataView(msg.buffer);
  dv.setUint32(0, Math.floor(counter / 2 ** 32), false);
  dv.setUint32(4, counter >>> 0, false);
  const hs = hmacSha1(key, msg);
  const offset = hs[19] & 0x0f;
  const binary =
    ((hs[offset] & 0x7f) << 24) | (hs[offset + 1] << 16) | (hs[offset + 2] << 8) | hs[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export interface TotpOptions {
  /** Unix 秒；默认当前时间 */
  time?: number;
  /** 时间步长（秒），默认 30 */
  period?: number;
  /** 验证码位数，默认 6 */
  digits?: number;
}

export interface TotpResult {
  code: string;
  /** 距下次刷新的剩余秒数 */
  remaining: number;
}

/** 计算 TOTP 验证码。secret 为 Base32（也兼容纯 ASCII 密钥）。 */
export function totp(secret: string, opts: TotpOptions = {}): TotpResult {
  const { period = 30, digits = 6 } = opts;
  const time = Math.floor(opts.time ?? Date.now() / 1000);
  const counter = Math.floor(time / period);
  let key: Uint8Array;
  try {
    key = base32Decode(secret.trim());
  } catch {
    key = new TextEncoder().encode(secret.trim());
  }
  return {
    code: hotp(key, counter, digits),
    remaining: period - (time % period),
  };
}

/* ---------- otpauth URI ---------- */

export interface OtpauthInfo {
  secret: string;
  issuer: string;
  account: string;
  digits: number;
  period: number;
}

/** 解析 otpauth://totp/... URI；失败返回 { error }。 */
export function parseOtpauth(uri: string): OtpauthInfo | { error: string } {
  const m = uri.trim().match(/^otpauth:\/\/totp\/([^?]+)\?(.*)$/i);
  if (!m) return { error: '不是有效的 otpauth TOTP 链接' };
  let label = decodeURIComponent(m[1]);
  const params = new URLSearchParams(m[2]);
  const secret = (params.get('secret') ?? '').replace(/\s/g, '');
  if (!secret) return { error: '链接中缺少 secret 参数' };
  let issuer = params.get('issuer') ?? '';
  let account = label;
  if (label.includes(':')) {
    const [iss, acc] = label.split(':');
    issuer = issuer || decodeURIComponent(iss);
    account = acc;
  }
  const digits = Number(params.get('digits') ?? 6);
  const period = Number(params.get('period') ?? 30);
  if (![6, 7, 8].includes(digits)) return { error: 'digits 仅支持 6 / 7 / 8' };
  if (period < 10 || period > 300) return { error: 'period 应在 10 ~ 300 秒之间' };
  return { secret, issuer: decodeURIComponent(issuer), account: decodeURIComponent(account), digits, period };
}
