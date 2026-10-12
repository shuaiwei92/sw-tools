// Base64 编解码（UTF-8 安全）。浏览器与 Node 18+ 均可运行（btoa/atob/TextEncoder 均内置）。
// 设计要点：先按 UTF-8 编码为字节，再二进制串 → Base64，避免中文等非 ASCII 字符乱码。

export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function decodeBase64(b64: string): string {
  const clean = b64.trim();
  let bin: string;
  try {
    bin = atob(clean);
  } catch {
    throw new Error('不是合法的 Base64 字符串');
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * 启发式判断一段文本是否「看起来像 Base64」。
 * 用于自动识别方向：是则解码，否则编码。
 * 规则：去空白后长度须为 4 的倍数，仅含 A-Za-z0-9+/=，
 * 且至少包含 + / = 之一或长度 >= 16（避免把普通英文单词误判为 Base64）。
 */
export function looksLikeBase64(s: string): boolean {
  const t = s.replace(/\s+/g, '');
  if (!t || t.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(t)) return false;
  if (/[+/=]/.test(t) || t.length >= 16) return true;
  return false;
}
