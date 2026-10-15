"use strict";
// 字节 ↔ 字符串 / Base64 的通用小工具（编解码、加解密、哈希等模块共用）。
// 浏览器与 Node（18+）均可运行：TextEncoder / atob / btoa 均为全局可用。
Object.defineProperty(exports, "__esModule", { value: true });
exports.bytesToUtf8 = exports.utf8ToBytes = void 0;
exports.bytesToBin = bytesToBin;
exports.binToBytes = binToBytes;
exports.bytesToBase64 = bytesToBase64;
exports.base64ToBytes = base64ToBytes;
exports.base64ToUrl = base64ToUrl;
exports.urlToBase64 = urlToBase64;
exports.bytesToHex = bytesToHex;
exports.hexToBytes = hexToBytes;
const utf8ToBytes = (s) => new TextEncoder().encode(s);
exports.utf8ToBytes = utf8ToBytes;
const bytesToUtf8 = (b) => new TextDecoder().decode(b);
exports.bytesToUtf8 = bytesToUtf8;
/** 字节 → 二进制字符串（每字符一个字节，latin1 语义），供 btoa 使用。 */
function bytesToBin(bytes) {
    let s = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return s;
}
/** 二进制字符串 → 字节。 */
function binToBytes(bin) {
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
        out[i] = bin.charCodeAt(i) & 0xff;
    return out;
}
function bytesToBase64(bytes) {
    return btoa(bytesToBin(bytes));
}
function base64ToBytes(b64) {
    return binToBytes(atob(b64));
}
/** Base64 → Base64URL（替换 +/ 为 -_ 并去填充）。 */
function base64ToUrl(b64) {
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** Base64URL → Base64（还原 +/ 与填充）。 */
function urlToBase64(b64url) {
    let s = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4)
        s += '=';
    return s;
}
/** 字节 → 小写十六进制字符串。 */
function bytesToHex(bytes) {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
/** 十六进制字符串 → 字节（忽略空白，允许 0x 前缀与奇偶校验提示）。 */
function hexToBytes(hex) {
    const clean = hex.replace(/0x/gi, '').replace(/\s+/g, '');
    if (!/^[0-9A-Fa-f]*$/.test(clean))
        throw new Error('含有非十六进制字符');
    if (clean.length % 2)
        throw new Error('十六进制长度必须是偶数');
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++)
        out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    return out;
}
