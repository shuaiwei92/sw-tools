// 图片隐私元数据清除：在不重新编码（无损）的前提下，剥离 JPEG 的 APP1(Exif) /
// APP13(IPTC/Photoshop) / COM(注释) 段，以及 PNG 的 tEXt / zTXt / iTXt / eXIf 块。
// 纯字节操作，浏览器与 Node 通用，零依赖。

export type ImageFormat = 'jpeg' | 'png' | 'unknown';

export interface StripResult {
  format: ImageFormat;
  /** 清除后的图片字节 */
  cleaned: Uint8Array;
  /** 被移除的元数据段 / 块类型名（用于展示） */
  removed: string[];
  /** 原始字节数 */
  originalSize: number;
  /** 清除后字节数 */
  cleanedSize: number;
}

export interface MetadataSummary {
  format: ImageFormat;
  /** 检测到的、可能含隐私的元数据段 / 块类型名 */
  found: string[];
  hasMetadata: boolean;
}

const JPEG_SOI = [0xff, 0xd8];
// 需要移除的 JPEG 标记（APP1=Exif, APP13=IPTC/Photoshop, COM=注释）
const JPEG_REMOVE = new Set([0xffe1, 0xffed, 0xfffe]);
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// 需要移除的 PNG 块（文本/EXIF 元数据）
const PNG_REMOVE = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf']);

function eqBytes(buf: Uint8Array, off: number, sig: number[]): boolean {
  for (let i = 0; i < sig.length; i++) if (buf[off + i] !== sig[i]) return false;
  return true;
}

function readUint16BE(buf: Uint8Array, off: number): number {
  return (buf[off] << 8) | buf[off + 1];
}
function readUint32BE(buf: Uint8Array, off: number): number {
  return (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3];
}
function ascii(buf: Uint8Array, off: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(buf[off + i]);
  return s;
}

export function detectFormat(buf: Uint8Array): ImageFormat {
  if (buf.length >= 2 && eqBytes(buf, 0, JPEG_SOI)) return 'jpeg';
  if (buf.length >= 8 && eqBytes(buf, 0, PNG_SIG)) return 'png';
  return 'unknown';
}

/** 仅检测元数据类型（不修改），用于清除前的预览。 */
export function summarizeMetadata(buf: Uint8Array): MetadataSummary {
  const format = detectFormat(buf);
  const found: string[] = [];
  if (format === 'jpeg') {
    let i = 2;
    while (i + 1 < buf.length) {
      if (buf[i] !== 0xff) break;
      const marker = (buf[i] << 8) | buf[i + 1];
      const m = marker & 0xff;
      if (m === 0xd9 || m === 0xda) break; // EOI / SOS：图像数据开始
      if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = readUint16BE(buf, i + 2);
      if (marker === 0xffe1) found.push('Exif (APP1)');
      else if (marker === 0xffed) found.push('IPTC/Photoshop (APP13)');
      else if (marker === 0xfffe) found.push('注释 (COM)');
      else if (marker === 0xffe0) found.push('JFIF (APP0)');
      else if (marker === 0xffe2) found.push('ICC 色彩配置 (APP2)');
      i += 2 + len;
    }
  } else if (format === 'png') {
    let i = 8;
    while (i + 8 <= buf.length) {
      const len = readUint32BE(buf, i);
      const type = ascii(buf, i + 4, 4);
      if (PNG_REMOVE.has(type)) found.push(type);
      i += 12 + len;
    }
  }
  return { format, found, hasMetadata: found.length > 0 };
}

/** 清除图片隐私元数据（无损，仅移除元数据段 / 块）。 */
export function stripImageMetadata(buf: Uint8Array): StripResult {
  const format = detectFormat(buf);
  const originalSize = buf.length;
  if (format === 'jpeg') {
    const out: number[] = [0xff, 0xd8];
    const removed: string[] = [];
    let i = 2;
    while (i + 1 < buf.length) {
      if (buf[i] !== 0xff) break;
      const marker = (buf[i] << 8) | buf[i + 1];
      const m = marker & 0xff;
      if (m === 0xd9 || m === 0xda) break;
      if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
        out.push(buf[i], buf[i + 1]);
        i += 2;
        continue;
      }
      const len = readUint16BE(buf, i + 2);
      if (JPEG_REMOVE.has(marker)) {
        if (marker === 0xffe1) removed.push('Exif (APP1)');
        else if (marker === 0xffed) removed.push('IPTC/Photoshop (APP13)');
        else if (marker === 0xfffe) removed.push('注释 (COM)');
      } else {
        for (let k = 0; k < 2 + len; k++) out.push(buf[i + k]);
      }
      i += 2 + len;
    }
    // 追加剩余（SOS 之后的图像数据 + EOI）
    for (; i < buf.length; i++) out.push(buf[i]);
    const cleaned = Uint8Array.from(out);
    return { format, cleaned, removed, originalSize, cleanedSize: cleaned.length };
  }

  if (format === 'png') {
    const out: number[] = [...PNG_SIG];
    const removed: string[] = [];
    let i = 8;
    while (i + 8 <= buf.length) {
      const len = readUint32BE(buf, i);
      const type = ascii(buf, i + 4, 4);
      const chunkEnd = i + 12 + len;
      if (PNG_REMOVE.has(type)) {
        removed.push(type);
      } else {
        for (let k = i; k < chunkEnd && k < buf.length; k++) out.push(buf[k]);
      }
      i = chunkEnd;
    }
    const cleaned = Uint8Array.from(out);
    return { format, cleaned, removed, originalSize, cleanedSize: cleaned.length };
  }

  // 不支持的格式：原样返回，removed 为空（页面会提示）
  return { format: 'unknown', cleaned: buf, removed: [], originalSize, cleanedSize: buf.length };
}
