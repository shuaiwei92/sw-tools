// URL 编解码：encodeURIComponent / decodeURIComponent 语义。
// 额外支持 application/x-www-form-urlencoded 场景下的 + ↔ 空格互转。

export interface UrlOpts {
  /** 编码时把 %20 写成 +（表单语义） */
  spacePlus: boolean;
  /** 解码时把 + 还原为空格（表单语义） */
  plusToSpace: boolean;
}

export const DEFAULT_URL_OPTS: UrlOpts = { spacePlus: false, plusToSpace: true };

export function encodeUrl(text: string, opts: UrlOpts = DEFAULT_URL_OPTS): string {
  let out = encodeURIComponent(text);
  if (opts.spacePlus) out = out.replace(/%20/g, '+');
  return out;
}

export function decodeUrl(text: string, opts: UrlOpts = DEFAULT_URL_OPTS): string {
  const s = opts.plusToSpace ? text.replace(/\+/g, ' ') : text;
  return decodeURIComponent(s);
}

/** 自动识别方向：含 %XX 序列视为待解码。 */
export function looksUrlEncoded(text: string): boolean {
  return /%[0-9A-Fa-f]{2}/.test(text);
}
