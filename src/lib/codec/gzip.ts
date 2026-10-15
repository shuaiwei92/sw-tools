// 文本 Gzip / Deflate 压缩与解压（基于浏览器 / Node 原生 CompressionStream，零依赖）。
// 压缩结果以字节返回；页面层负责 Base64 展示与体积统计。

export type GzipFormat = 'gzip' | 'deflate' | 'deflate-raw';

export const GZIP_FORMATS: { id: GzipFormat; label: string }[] = [
  { id: 'gzip', label: 'Gzip' },
  { id: 'deflate', label: 'Deflate（zlib 封装）' },
  { id: 'deflate-raw', label: 'Deflate（原始流）' },
];

async function pipeThrough(
  bytes: Uint8Array<ArrayBuffer>,
  format: GzipFormat,
  compress: boolean
): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof CompressionStream === 'undefined' || typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持 CompressionStream（需 Chrome 80+ / Firefox 113+ / Safari 16.4+）');
  }
  const stream = compress ? new CompressionStream(format) : new DecompressionStream(format);
  const writer = stream.writable.getWriter();
  // 大输入分片写入，避免单次超大 ArrayBuffer
  const CHUNK = 1 << 20;
  void (async () => {
    try {
      for (let i = 0; i < bytes.length; i += CHUNK) {
        await writer.write(bytes.subarray(i, i + CHUNK));
      }
      await writer.close();
    } catch (e) {
      // 读取端会因流中断而报错，这里保证 writer 不会悬挂
      try { await writer.abort(); } catch { /* ignore */ }
      throw e;
    }
  })();
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value!);
    total += value!.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** UTF-8 文本 → 压缩后的字节。 */
export const compressToBytes = (text: string, format: GzipFormat = 'gzip'): Promise<Uint8Array<ArrayBuffer>> =>
  pipeThrough(new TextEncoder().encode(text), format, true);

/** 压缩字节 → UTF-8 文本（解压）。 */
export async function decompressToText(
  bytes: Uint8Array<ArrayBuffer>,
  format: GzipFormat = 'gzip'
): Promise<string> {
  return new TextDecoder().decode(await pipeThrough(bytes, format, false));
}
