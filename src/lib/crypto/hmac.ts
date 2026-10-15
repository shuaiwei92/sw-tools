// HMAC 消息认证码：SHA-1 / 256 / 384 / 512 走 Web Crypto，MD5 走本地纯 JS 实现。

import { md5Bytes } from './md5';
import { bytesToHex, hexToBytes, utf8ToBytes } from '../codec/bytes';

export type HmacAlgo = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export const HMAC_ALGOS: HmacAlgo[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

function subtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('当前环境不支持 Web Crypto（需 HTTPS 或 localhost 环境）');
  }
  return crypto.subtle;
}

async function hmacWebCrypto(text: string, key: string, algo: string): Promise<string> {
  const c = subtle();
  const cryptoKey = await c.importKey('raw', utf8ToBytes(key), { name: 'HMAC', hash: algo }, false, ['sign']);
  const sig = await c.sign('HMAC', cryptoKey, utf8ToBytes(text));
  return bytesToHex(new Uint8Array(sig));
}

function hmacMd5(text: string, key: string): string {
  const blockSize = 64;
  let k = utf8ToBytes(key);
  if (k.length > blockSize) k = hexToBytes(md5Bytes(k));
  const kPad = new Uint8Array(blockSize);
  kPad.set(k);
  const inner = new Uint8Array(blockSize + utf8ToBytes(text).length);
  for (let i = 0; i < blockSize; i++) inner[i] = kPad[i] ^ 0x36;
  inner.set(utf8ToBytes(text), blockSize);
  const innerHex = md5Bytes(inner);
  const outer = new Uint8Array(blockSize + innerHex.length / 2);
  for (let i = 0; i < blockSize; i++) outer[i] = kPad[i] ^ 0x5c;
  outer.set(hexToBytes(innerHex), blockSize);
  return md5Bytes(outer);
}

/** 计算 HMAC，返回小写十六进制字符串。 */
export async function hmacText(text: string, key: string, algo: HmacAlgo = 'SHA-256'): Promise<string> {
  if (!key) throw new Error('请输入密钥');
  if (algo === 'MD5') return hmacMd5(text, key);
  return hmacWebCrypto(text, key, algo);
}

/** 计算 HMAC 并返回 Base64（部分接口签名场景需要）。 */
export async function hmacTextBase64(text: string, key: string, algo: HmacAlgo = 'SHA-256'): Promise<string> {
  const hex = await hmacText(text, key, algo);
  return btoa(String.fromCharCode(...hexToBytes(hex)));
}
