// RSA 工具：密钥对生成、加解密（RSA-OAEP）、签名 / 验签（RSA-PSS），支持 PEM 导入导出。
// 基于 Web Crypto；注意 RSA-OAEP 单次加密长度有限（2048 位约 190 字节），大文本请用 AES。

import { bytesToBase64, base64ToBytes, utf8ToBytes } from '../codec/bytes';

export type RsaBits = 2048 | 3072 | 4096;

export const RSA_BITS: RsaBits[] = [2048, 3072, 4096];

/** 2048 位 RSA-OAEP/SHA-256 的最大明文字节数。 */
export const OAEP_MAX_BYTES: Record<RsaBits, number> = { 2048: 190, 3072: 318, 4096: 446 };

function subtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('当前环境不支持 Web Crypto（需 HTTPS 或 localhost 环境）');
  }
  return crypto.subtle;
}

const cleanPem = (pem: string): string => pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');

async function exportPem(key: CryptoKey, type: 'spki' | 'pkcs8'): Promise<string> {
  const buf = await subtle().exportKey(type, key);
  const b64 = bytesToBase64(new Uint8Array(buf));
  const label = type === 'spki' ? 'PUBLIC KEY' : 'PRIVATE KEY';
  return `-----BEGIN ${label}-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END ${label}-----`;
}

/** 生成 RSA 密钥对，返回 PEM 格式的公钥 / 私钥。 */
export async function generateRsaKeyPair(bits: RsaBits = 2048): Promise<{ publicKey: string; privateKey: string }> {
  const pair = await subtle().generateKey(
    { name: 'RSA-OAEP', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  );
  return {
    publicKey: await exportPem(pair.publicKey, 'spki'),
    privateKey: await exportPem(pair.privateKey, 'pkcs8'),
  };
}

async function importKey(pem: string, type: 'spki' | 'pkcs8', algo: string, usages: KeyUsage[]): Promise<CryptoKey> {
  const raw = base64ToBytes(cleanPem(pem));
  return subtle().importKey(type, raw, { name: algo, hash: 'SHA-256' }, false, usages);
}

/** 用公钥加密文本，返回 Base64 密文。 */
export async function rsaEncrypt(text: string, publicPem: string): Promise<string> {
  const key = await importKey(publicPem, 'spki', 'RSA-OAEP', ['encrypt']);
  const ct = await subtle().encrypt({ name: 'RSA-OAEP' }, key, utf8ToBytes(text));
  return bytesToBase64(new Uint8Array(ct));
}

/** 用私钥解密 Base64 密文为文本。 */
export async function rsaDecrypt(payloadB64: string, privatePem: string): Promise<string> {
  const key = await importKey(privatePem, 'pkcs8', 'RSA-OAEP', ['decrypt']);
  try {
    const pt = await subtle().decrypt({ name: 'RSA-OAEP' }, key, base64ToBytes(payloadB64.trim().replace(/\s+/g, '')));
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error('解密失败：私钥不匹配或密文损坏');
  }
}

/** 用私钥对文本签名（RSA-PSS/SHA-256），返回 Base64 签名。 */
export async function rsaSign(text: string, privatePem: string): Promise<string> {
  const key = await importKey(privatePem, 'pkcs8', 'RSA-PSS', ['sign']);
  const sig = await subtle().sign({ name: 'RSA-PSS', saltLength: 32 }, key, utf8ToBytes(text));
  return bytesToBase64(new Uint8Array(sig));
}

/** 用公钥验签，返回是否通过。 */
export async function rsaVerify(text: string, sigB64: string, publicPem: string): Promise<boolean> {
  const key = await importKey(publicPem, 'spki', 'RSA-PSS', ['verify']);
  return subtle().verify(
    { name: 'RSA-PSS', saltLength: 32 },
    key,
    base64ToBytes(sigB64.trim().replace(/\s+/g, '')),
    utf8ToBytes(text)
  );
}
