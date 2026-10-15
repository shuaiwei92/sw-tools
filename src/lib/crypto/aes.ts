// AES 加解密：AES-256-GCM / CBC，PBKDF2 从口令派生密钥。
// 输出载荷 = Base64( salt[16] || iv[12|16] || ciphertext(+tag) )，解密时自动拆分。

import { bytesToBase64, base64ToBytes, utf8ToBytes } from '../codec/bytes';

export type AesMode = 'GCM' | 'CBC';

export const AES_MODES: { id: AesMode; label: string; note: string }[] = [
  { id: 'GCM', label: 'AES-256-GCM', note: '认证加密（推荐），自动附带完整性校验' },
  { id: 'CBC', label: 'AES-256-CBC', note: '传统分组模式，无完整性校验' },
];

const PBKDF2_ITERATIONS = 150000;

function subtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('当前环境不支持 Web Crypto（需 HTTPS 或 localhost 环境）');
  }
  return crypto.subtle;
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, mode: AesMode): Promise<CryptoKey> {
  const c = subtle();
  const base = await c.importKey('raw', utf8ToBytes(password), 'PBKDF2', false, ['deriveKey']);
  return c.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: `AES-${mode}`, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

const ivLen = (mode: AesMode) => (mode === 'GCM' ? 12 : 16);

/** 加密文本，返回 Base64 载荷。 */
export async function aesEncrypt(text: string, password: string, mode: AesMode = 'GCM'): Promise<string> {
  if (!password) throw new Error('请输入加密口令');
  const c = subtle();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(ivLen(mode)));
  const key = await deriveKey(password, salt, mode);
  const ct = new Uint8Array(await c.encrypt({ name: `AES-${mode}`, iv }, key, utf8ToBytes(text)));
  const out = new Uint8Array(16 + iv.length + ct.length);
  out.set(salt, 0);
  out.set(iv, 16);
  out.set(ct, 16 + iv.length);
  return bytesToBase64(out);
}

/** 解密 Base64 载荷为文本；口令错误或数据损坏时抛出中文提示。 */
export async function aesDecrypt(payloadB64: string, password: string, mode: AesMode = 'GCM'): Promise<string> {
  if (!password) throw new Error('请输入解密口令');
  const c = subtle();
  const raw = base64ToBytes(payloadB64.trim().replace(/\s+/g, ''));
  const head = 16 + ivLen(mode);
  if (raw.length < head + 1) throw new Error('密文长度不足，可能不是有效的 AES 载荷');
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, head);
  const ct = raw.slice(head);
  const key = await deriveKey(password, salt, mode);
  try {
    const pt = await c.decrypt({ name: `AES-${mode}`, iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error('解密失败：口令错误或数据损坏（请确认加解密两侧模式一致）');
  }
}
