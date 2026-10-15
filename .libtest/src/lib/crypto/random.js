"use strict";
// 安全随机生成器：UUID v4 / 随机密码 / 令牌 / PIN。
// 全部基于 crypto.getRandomValues，采用拒绝采样避免取模偏差。
Object.defineProperty(exports, "__esModule", { value: true });
exports.AMBIGUOUS_CHARS = void 0;
exports.uuidV4 = uuidV4;
exports.randomPassword = randomPassword;
exports.randomTokenHex = randomTokenHex;
exports.randomTokenB64Url = randomTokenB64Url;
exports.randomPin = randomPin;
exports.randomInt = randomInt;
const SETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
};
/** 易混淆字符（用于密码生成的排除选项）。 */
exports.AMBIGUOUS_CHARS = '0O1lI|`\'"{}[]()/\\';
function randomBelow(max) {
    if (max <= 0)
        throw new Error('max 必须为正数');
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    for (;;) {
        crypto.getRandomValues(buf);
        if (buf[0] < limit)
            return buf[0] % max;
    }
}
function pickChar(alphabet) {
    return alphabet[randomBelow(alphabet.length)];
}
/** 生成 UUID v4（标准 8-4-4-4-12 格式）。 */
function uuidV4() {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}
/** 生成随机密码；保证每个启用的字符类至少出现一次。 */
function randomPassword(opts = {}) {
    const { length = 16, upper = true, lower = true, digits = true, symbols = true, avoidAmbiguous = false, } = opts;
    if (length < 4 || length > 128)
        throw new Error('长度需在 4 ~ 128 之间');
    let pools = [];
    if (upper)
        pools.push(SETS.upper);
    if (lower)
        pools.push(SETS.lower);
    if (digits)
        pools.push(SETS.digits);
    if (symbols)
        pools.push(SETS.symbols);
    if (!pools.length)
        throw new Error('请至少启用一种字符类型');
    if (avoidAmbiguous) {
        pools = pools.map((p) => Array.from(p).filter((c) => !exports.AMBIGUOUS_CHARS.includes(c)).join(''));
        if (pools.some((p) => !p))
            throw new Error('排除易混淆字符后没有可用字符');
    }
    const chars = [];
    // 每类先取一个，保证复杂度
    for (const p of pools)
        chars.push(pickChar(p));
    while (chars.length < length)
        chars.push(pickChar(pools[randomBelow(pools.length)]));
    // Fisher-Yates 洗牌（crypto 随机）
    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomBelow(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
}
/** 生成随机十六进制令牌（如 API Key）。 */
function randomTokenHex(bytes = 32) {
    return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');
}
/** 生成随机 Base64URL 令牌（URL / 文件名安全）。 */
function randomTokenB64Url(bytes = 32) {
    return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
/** 生成数字 PIN（首位非 0）。 */
function randomPin(digits = 6) {
    if (digits < 1 || digits > 12)
        throw new Error('PIN 位数需在 1 ~ 12 之间');
    let out = String(1 + randomBelow(9));
    for (let i = 1; i < digits; i++)
        out += String(randomBelow(10));
    return out;
}
/** 生成 [min, max] 范围内的安全随机整数。 */
function randomInt(min, max) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new Error('需满足 min ≤ max 且均为整数');
    }
    return min + randomBelow(max - min + 1);
}
