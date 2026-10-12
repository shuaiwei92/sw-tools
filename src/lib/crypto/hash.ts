// 哈希计算（浏览器 Web Crypto API，纯本地、无依赖、无上传）。
// 支持 SHA-1 / SHA-256 / SHA-384 / SHA-512。MD5 不在 Web Crypto 标准内，暂不提供。

export type HashAlgo = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export const HASH_ALGOS: HashAlgo[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

export async function hashText(text: string, algo: HashAlgo): Promise<string> {
  // crypto.subtle 仅在安全上下文（https / localhost）可用
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('当前环境不支持 Web Crypto（需 https 或 localhost）');
  }
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algo, data);
  return bufToHex(digest);
}

function bufToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}
