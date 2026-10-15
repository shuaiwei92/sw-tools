"use strict";
// HMAC 消息认证码：SHA-1 / 256 / 384 / 512 走 Web Crypto，MD5 走本地纯 JS 实现。
Object.defineProperty(exports, "__esModule", { value: true });
exports.HMAC_ALGOS = void 0;
exports.hmacText = hmacText;
exports.hmacTextBase64 = hmacTextBase64;
const md5_1 = require("./md5");
const bytes_1 = require("../codec/bytes");
exports.HMAC_ALGOS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
function subtle() {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        throw new Error('当前环境不支持 Web Crypto（需 HTTPS 或 localhost 环境）');
    }
    return crypto.subtle;
}
async function hmacWebCrypto(text, key, algo) {
    const c = subtle();
    const cryptoKey = await c.importKey('raw', (0, bytes_1.utf8ToBytes)(key), { name: 'HMAC', hash: algo }, false, ['sign']);
    const sig = await c.sign('HMAC', cryptoKey, (0, bytes_1.utf8ToBytes)(text));
    return (0, bytes_1.bytesToHex)(new Uint8Array(sig));
}
function hmacMd5(text, key) {
    const blockSize = 64;
    let k = (0, bytes_1.utf8ToBytes)(key);
    if (k.length > blockSize)
        k = (0, bytes_1.hexToBytes)((0, md5_1.md5Bytes)(k));
    const kPad = new Uint8Array(blockSize);
    kPad.set(k);
    const inner = new Uint8Array(blockSize + (0, bytes_1.utf8ToBytes)(text).length);
    for (let i = 0; i < blockSize; i++)
        inner[i] = kPad[i] ^ 0x36;
    inner.set((0, bytes_1.utf8ToBytes)(text), blockSize);
    const innerHex = (0, md5_1.md5Bytes)(inner);
    const outer = new Uint8Array(blockSize + innerHex.length / 2);
    for (let i = 0; i < blockSize; i++)
        outer[i] = kPad[i] ^ 0x5c;
    outer.set((0, bytes_1.hexToBytes)(innerHex), blockSize);
    return (0, md5_1.md5Bytes)(outer);
}
/** 计算 HMAC，返回小写十六进制字符串。 */
async function hmacText(text, key, algo = 'SHA-256') {
    if (!key)
        throw new Error('请输入密钥');
    if (algo === 'MD5')
        return hmacMd5(text, key);
    return hmacWebCrypto(text, key, algo);
}
/** 计算 HMAC 并返回 Base64（部分接口签名场景需要）。 */
async function hmacTextBase64(text, key, algo = 'SHA-256') {
    const hex = await hmacText(text, key, algo);
    return btoa(String.fromCharCode(...(0, bytes_1.hexToBytes)(hex)));
}
