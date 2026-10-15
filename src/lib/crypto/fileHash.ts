// 文件哈希：一次性读取文件，计算 MD5 / SHA-1 / SHA-256 / SHA-512，全程本地不上传。

import { md5Bytes } from './md5';
import { bytesToHex } from '../codec/bytes';

export type FileHashAlgo = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';

export const FILE_HASH_ALGOS: FileHashAlgo[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];

function subtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('当前环境不支持 Web Crypto（需 HTTPS 或 localhost 环境）');
  }
  return crypto.subtle;
}

/** 计算单个文件的多个哈希值；onStep 回调用于进度展示（已完成算法数）。 */
export async function hashFile(
  file: File,
  algos: FileHashAlgo[],
  onStep?: (done: number, total: number) => void
): Promise<Record<FileHashAlgo, string>> {
  if (!algos.length) throw new Error('请至少选择一种算法');
  const buf = new Uint8Array(await file.arrayBuffer());
  const out = {} as Record<FileHashAlgo, string>;
  for (let i = 0; i < algos.length; i++) {
    const algo = algos[i];
    out[algo] =
      algo === 'MD5'
        ? md5Bytes(buf)
        : bytesToHex(new Uint8Array(await subtle().digest(algo, buf)));
    onStep?.(i + 1, algos.length);
  }
  return out;
}

/** 人类可读的文件大小。 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(2)} ${units[i]}`;
}
