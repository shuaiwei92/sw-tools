"use strict";
// 文件哈希：一次性读取文件，计算 MD5 / SHA-1 / SHA-256 / SHA-512，全程本地不上传。
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILE_HASH_ALGOS = void 0;
exports.hashFile = hashFile;
exports.formatSize = formatSize;
const md5_1 = require("./md5");
const bytes_1 = require("../codec/bytes");
exports.FILE_HASH_ALGOS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];
function subtle() {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        throw new Error('当前环境不支持 Web Crypto（需 HTTPS 或 localhost 环境）');
    }
    return crypto.subtle;
}
/** 计算单个文件的多个哈希值；onStep 回调用于进度展示（已完成算法数）。 */
async function hashFile(file, algos, onStep) {
    if (!algos.length)
        throw new Error('请至少选择一种算法');
    const buf = new Uint8Array(await file.arrayBuffer());
    const out = {};
    for (let i = 0; i < algos.length; i++) {
        const algo = algos[i];
        out[algo] =
            algo === 'MD5'
                ? (0, md5_1.md5Bytes)(buf)
                : (0, bytes_1.bytesToHex)(new Uint8Array(await subtle().digest(algo, buf)));
        onStep?.(i + 1, algos.length);
    }
    return out;
}
/** 人类可读的文件大小。 */
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let v = bytes / 1024;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${v.toFixed(2)} ${units[i]}`;
}
