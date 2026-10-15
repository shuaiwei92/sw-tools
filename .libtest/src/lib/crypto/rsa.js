"use strict";
// RSA 工具：密钥对生成、加解密（RSA-OAEP）、签名 / 验签（RSA-PSS），支持 PEM 导入导出。
// 基于 Web Crypto；注意 RSA-OAEP 单次加密长度有限（2048 位约 190 字节），大文本请用 AES。
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAEP_MAX_BYTES = exports.RSA_BITS = void 0;
exports.generateRsaKeyPair = generateRsaKeyPair;
exports.rsaEncrypt = rsaEncrypt;
exports.rsaDecrypt = rsaDecrypt;
exports.rsaSign = rsaSign;
exports.rsaVerify = rsaVerify;
const bytes_1 = require("../codec/bytes");
exports.RSA_BITS = [2048, 3072, 4096];
/** 2048 位 RSA-OAEP/SHA-256 的最大明文字节数。 */
exports.OAEP_MAX_BYTES = { 2048: 190, 3072: 318, 4096: 446 };
function subtle() {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        throw new Error('当前环境不支持 Web Crypto（需 HTTPS 或 localhost 环境）');
    }
    return crypto.subtle;
}
const cleanPem = (pem) => pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
async function exportPem(key, type) {
    const buf = await subtle().exportKey(type, key);
    const b64 = (0, bytes_1.bytesToBase64)(new Uint8Array(buf));
    const label = type === 'spki' ? 'PUBLIC KEY' : 'PRIVATE KEY';
    return `-----BEGIN ${label}-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END ${label}-----`;
}
/** 生成 RSA 密钥对，返回 PEM 格式的公钥 / 私钥。 */
async function generateRsaKeyPair(bits = 2048) {
    const pair = await subtle().generateKey({ name: 'RSA-OAEP', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
    return {
        publicKey: await exportPem(pair.publicKey, 'spki'),
        privateKey: await exportPem(pair.privateKey, 'pkcs8'),
    };
}
async function importKey(pem, type, algo, usages) {
    const raw = (0, bytes_1.base64ToBytes)(cleanPem(pem));
    return subtle().importKey(type, raw, { name: algo, hash: 'SHA-256' }, false, usages);
}
/** 用公钥加密文本，返回 Base64 密文。 */
async function rsaEncrypt(text, publicPem) {
    const key = await importKey(publicPem, 'spki', 'RSA-OAEP', ['encrypt']);
    const ct = await subtle().encrypt({ name: 'RSA-OAEP' }, key, (0, bytes_1.utf8ToBytes)(text));
    return (0, bytes_1.bytesToBase64)(new Uint8Array(ct));
}
/** 用私钥解密 Base64 密文为文本。 */
async function rsaDecrypt(payloadB64, privatePem) {
    const key = await importKey(privatePem, 'pkcs8', 'RSA-OAEP', ['decrypt']);
    try {
        const pt = await subtle().decrypt({ name: 'RSA-OAEP' }, key, (0, bytes_1.base64ToBytes)(payloadB64.trim().replace(/\s+/g, '')));
        return new TextDecoder().decode(pt);
    }
    catch {
        throw new Error('解密失败：私钥不匹配或密文损坏');
    }
}
/** 用私钥对文本签名（RSA-PSS/SHA-256），返回 Base64 签名。 */
async function rsaSign(text, privatePem) {
    const key = await importKey(privatePem, 'pkcs8', 'RSA-PSS', ['sign']);
    const sig = await subtle().sign({ name: 'RSA-PSS', saltLength: 32 }, key, (0, bytes_1.utf8ToBytes)(text));
    return (0, bytes_1.bytesToBase64)(new Uint8Array(sig));
}
/** 用公钥验签，返回是否通过。 */
async function rsaVerify(text, sigB64, publicPem) {
    const key = await importKey(publicPem, 'spki', 'RSA-PSS', ['verify']);
    return subtle().verify({ name: 'RSA-PSS', saltLength: 32 }, key, (0, bytes_1.base64ToBytes)(sigB64.trim().replace(/\s+/g, '')), (0, bytes_1.utf8ToBytes)(text));
}
