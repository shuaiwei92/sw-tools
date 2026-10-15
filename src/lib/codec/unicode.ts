// Unicode 转义：文本 ↔ \uXXXX 序列（含 emoji 等星区字符的代理对处理）。

/** 把文本转义为 \uXXXX 序列；nonAsciiOnly=true 时仅转义非 ASCII 字符。 */
export function unicodeEscape(text: string, nonAsciiOnly = true): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (!nonAsciiOnly || cp > 0x7f) {
      if (cp > 0xffff) {
        // 星区字符（如 emoji）拆为 UTF-16 代理对
        const v = cp - 0x10000;
        out += `\\u${(0xd800 + (v >> 10)).toString(16).toUpperCase().padStart(4, '0')}`;
        out += `\\u${(0xdc00 + (v & 0x3ff)).toString(16).toUpperCase().padStart(4, '0')}`;
      } else {
        out += `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

/** 把 \uXXXX 序列还原为文本；非转义部分原样保留。 */
export function unicodeUnescape(text: string): string {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

/** 粗略判断一段文本是否「看起来已转义」（含成规模的 \uXXXX 序列）。 */
export function looksEscaped(text: string): boolean {
  const m = text.match(/\\u[0-9a-fA-F]{4}/g);
  return !!m && m.length >= 1 && !/[一-鿿]/.test(text);
}
