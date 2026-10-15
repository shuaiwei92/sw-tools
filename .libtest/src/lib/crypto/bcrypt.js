"use strict";
// Bcrypt（$2b$）纯 JS 实现：Blowfish + eksblowfish 密钥编排 + bcrypt 专用 Base64。
// 初始 P / S 盒子不是内置大表，而是由 π 的小数十六进制位经 BigInt Machin 公式
// 在运行时精确推导（pi = 16·arctan(1/5) − 4·arctan(1/239)），自包含且零依赖。
Object.defineProperty(exports, "__esModule", { value: true });
exports.piWords = piWords;
exports.initState = initState;
exports.encipher = encipher;
exports.stream2word = stream2word;
exports.expand0 = expand0;
exports.expandSalt = expandSalt;
exports.b64Encode = b64Encode;
exports.b64Decode = b64Decode;
exports.bcryptCore = bcryptCore;
exports.bcryptHash = bcryptHash;
exports.bcryptCompare = bcryptCompare;
exports.parseBcryptHash = parseBcryptHash;
const MAGIC = 'OrpheanBeholderScryDoubt';
const MAX_KEY_BYTES = 72; // bcrypt 规范：密钥（含结尾 NUL）超过 72 字节部分被忽略
// ── π 十六进制位推导（Blowfish 初始常量来源）──────────────────────
function piWords(count) {
    const hexDigits = count * 8;
    const scale = 16n ** BigInt(hexDigits + 8); // 额外 8 个十六进制位作为精度保护
    // arctan(1/x)·scale = Σ (-1)^k · scale / ((2k+1)·x^(2k+1))
    // 迭代时只做大数除小整数（num 每次除以 x²，分母 2k+1 单独除），
    // 截断误差随 x² 几何收敛，累加上限远小于 8 位保护余量，前 count 个字精确。
    const arctanInv = (x) => {
        let total = 0n;
        let num = scale / x; // ≈ scale / x^(2k+1)
        const x2 = x * x;
        let k = 0n;
        let sign = 1n;
        while (num !== 0n) {
            total += sign * (num / (2n * k + 1n));
            sign = -sign;
            k++;
            num /= x2;
        }
        return total;
    };
    const pi = 16n * arctanInv(5n) - 4n * arctanInv(239n); // Machin 公式
    const frac = pi - 3n * scale;
    // 去掉低 32 位（8 个十六进制保护位）后，剩下恰好 count×32 位，按大端顺序取字
    const shifted = frac >> 32n;
    const words = [];
    for (let i = 0; i < count; i++) {
        words.push(Number((shifted >> BigInt((count - 1 - i) * 32)) & 0xffffffffn));
    }
    return words;
}
function initState() {
    const w = piWords(1042); // 18 个 P + 4×256 个 S
    const P = Uint32Array.from(w.slice(0, 18));
    const S = [0, 1, 2, 3].map((i) => Uint32Array.from(w.slice(18 + i * 256, 18 + (i + 1) * 256)));
    return { P, S };
}
function encipher(st, l, r) {
    const { P, S } = st;
    let xl = l >>> 0;
    let xr = r >>> 0;
    for (let i = 0; i < 16; i++) {
        xl ^= P[i];
        const a = (xl >>> 24) & 0xff;
        const b = (xl >>> 16) & 0xff;
        const c = (xl >>> 8) & 0xff;
        const d = xl & 0xff;
        const f = (((((S[0][a] + S[1][b]) >>> 0) ^ S[2][c]) >>> 0) + S[3][d]) >>> 0;
        xr ^= f;
        const t = xl;
        xl = xr;
        xr = t;
    }
    const t = xl; // 还原最后一次交换
    xl = xr;
    xr = t;
    xr ^= P[16];
    xl ^= P[17];
    return [xl >>> 0, xr >>> 0];
}
/** 从字节流循环读取大端 4 字节字（bcrypt 的 stream2word 语义）。 */
function stream2word(bytes, j) {
    let word = 0;
    for (let i = 0; i < 4; i++) {
        word = ((word << 8) | bytes[j.v]) >>> 0;
        j.v = (j.v + 1) % bytes.length;
    }
    return word;
}
/** 仅用密钥扩展 P / S（eksblowfish 的 ExpandKey 步骤）。 */
function expand0(st, key) {
    const { P, S } = st;
    const j = { v: 0 };
    for (let i = 0; i < 18; i++)
        P[i] = (P[i] ^ stream2word(key, j)) >>> 0;
    let l = 0;
    let r = 0;
    for (let i = 0; i < 18; i += 2) {
        [l, r] = encipher(st, l, r);
        P[i] = l;
        P[i + 1] = r;
    }
    for (let s = 0; s < 4; s++) {
        for (let i = 0; i < 256; i += 2) {
            [l, r] = encipher(st, l, r);
            S[s][i] = l;
            S[s][i + 1] = r;
        }
    }
}
/** 初始扩展：先 XOR 密钥，再把 salt 混入每个分组（bcrypt 的 ExpandKey(salt, key)）。 */
function expandSalt(st, salt, key) {
    const { P, S } = st;
    const jk = { v: 0 };
    for (let i = 0; i < 18; i++)
        P[i] = (P[i] ^ stream2word(key, jk)) >>> 0;
    const js = { v: 0 };
    let l = 0;
    let r = 0;
    for (let i = 0; i < 18; i += 2) {
        l ^= stream2word(salt, js);
        r ^= stream2word(salt, js);
        [l, r] = encipher(st, l, r);
        P[i] = l;
        P[i + 1] = r;
    }
    for (let s = 0; s < 4; s++) {
        for (let i = 0; i < 256; i += 2) {
            l ^= stream2word(salt, js);
            r ^= stream2word(salt, js);
            [l, r] = encipher(st, l, r);
            S[s][i] = l;
            S[s][i + 1] = r;
        }
    }
}
// ── bcrypt 专用 Base64（字母表 ./A-Za-z0-9，无填充）───────────────
// 程序化构造，避免手写字母表漏字符（bcrypt 对字母表顺序极其敏感）
const B64 = './' +
    Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).join('') +
    Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)).join('') +
    Array.from({ length: 10 }, (_, i) => String.fromCharCode(48 + i)).join('');
function b64Encode(bytes, len) {
    let out = '';
    let i = 0;
    while (i < len) {
        let c1 = bytes[i++];
        out += B64[c1 >> 2];
        c1 = (c1 & 0x03) << 4;
        if (i >= len) {
            out += B64[c1];
            break;
        }
        let c2 = bytes[i++];
        c1 |= (c2 >> 4) & 0x0f;
        out += B64[c1];
        c1 = (c2 & 0x0f) << 2;
        if (i >= len) {
            out += B64[c1];
            break;
        }
        c2 = bytes[i++];
        c1 |= (c2 >> 6) & 0x03;
        out += B64[c1];
        out += B64[c2 & 0x3f];
    }
    return out;
}
function b64Decode(str, outLen) {
    const out = new Uint8Array(outLen);
    let i = 0;
    let o = 0;
    while (o < outLen) {
        const c1 = B64.indexOf(str[i++]);
        const c2 = B64.indexOf(str[i++]);
        if (c1 < 0 || c2 < 0)
            throw new Error('含有非法 bcrypt Base64 字符');
        out[o++] = ((c1 << 2) | ((c2 & 0x30) >> 4)) & 0xff;
        if (o >= outLen)
            break;
        const c3 = B64.indexOf(str[i++]);
        if (c3 < 0)
            throw new Error('含有非法 bcrypt Base64 字符');
        out[o++] = (((c2 & 0x0f) << 4) | ((c3 & 0x3c) >> 2)) & 0xff;
        if (o >= outLen)
            break;
        const c4 = B64.indexOf(str[i++]);
        if (c4 < 0)
            throw new Error('含有非法 bcrypt Base64 字符');
        out[o++] = (((c3 & 0x03) << 6) | c4) & 0xff;
    }
    return out;
}
// ── 核心：给定口令 / cost / 16 字节 salt，产出 31 字符哈希段 ────────
function bcryptCore(password, cost, salt) {
    if (cost < 4 || cost > 31)
        throw new Error('cost 需在 4 ~ 31 之间');
    if (salt.length !== 16)
        throw new Error('salt 必须是 16 字节');
    const raw = new TextEncoder().encode(password);
    const key = new Uint8Array(Math.min(raw.length + 1, MAX_KEY_BYTES)); // 口令 + NUL，超长截断
    key.set(raw.subarray(0, key.length - (raw.length < MAX_KEY_BYTES ? 1 : 0)));
    const st = initState();
    expandSalt(st, salt, key);
    for (let k = 0; k < 1 << cost; k++) {
        expand0(st, key);
        expand0(st, salt);
    }
    // 加密 24 字节魔术串（6 个字 = 3 个分组），重复 64 轮（bcrypt 规范）
    const magic = new TextEncoder().encode(MAGIC);
    const words = [];
    const j = { v: 0 };
    for (let i = 0; i < 6; i++)
        words.push(stream2word(magic, j));
    for (let r = 0; r < 64; r++) {
        for (let i = 0; i < 6; i += 2) {
            const [l, r2] = encipher(st, words[i], words[i + 1]);
            words[i] = l;
            words[i + 1] = r2;
        }
    }
    const out = new Uint8Array(24);
    for (let i = 0; i < 6; i++) {
        out[i * 4] = (words[i] >>> 24) & 0xff;
        out[i * 4 + 1] = (words[i] >>> 16) & 0xff;
        out[i * 4 + 2] = (words[i] >>> 8) & 0xff;
        out[i * 4 + 3] = words[i] & 0xff;
    }
    return b64Encode(out, 23); // 24 字节中前 23 字节 → 31 字符
}
const HASH_RE = /^\$2[abxy]?\$(\d{2})\$([./A-Za-z0-9]{22})([./A-Za-z0-9]{31})$/;
/** 生成 bcrypt 哈希（$2b$ 格式），cost 默认 10。 */
async function bcryptHash(password, cost = 10) {
    if (typeof password !== 'string')
        throw new Error('口令必须是字符串');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const core = bcryptCore(password, cost, salt);
    return `$2b$${String(cost).padStart(2, '0')}$${b64Encode(salt, 16)}${core}`;
}
/** 校验口令是否匹配给定 bcrypt 哈希。 */
async function bcryptCompare(password, hash) {
    const m = hash.trim().match(HASH_RE);
    if (!m)
        throw new Error('不是合法的 bcrypt 哈希（应为 $2a$/$2b$ + 2 位 cost + 22 位 salt + 31 位哈希）');
    const cost = parseInt(m[1], 10);
    const salt = b64Decode(m[2], 16);
    const core = bcryptCore(password, cost, salt);
    return core === m[3];
}
/** 解析哈希中的 cost 与 salt（供页面展示）。 */
function parseBcryptHash(hash) {
    const m = hash.trim().match(/^\$2[abxy]?\$(\d{2})\$([./A-Za-z0-9]{22})/);
    return m ? { cost: parseInt(m[1], 10), saltB64: m[2] } : null;
}
