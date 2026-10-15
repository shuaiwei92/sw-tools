"use strict";
// CRC 循环冗余校验：通用位运算实现，内置 9 个常用参数模型（CRC-8/16/32/64）。
// 输入为文本的 UTF-8 字节；模型参数遵循 Rocksoft 命名（width/poly/init/refin/refout/xorout）。
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRC_MODELS = void 0;
exports.crcOfBytes = crcOfBytes;
exports.crcOfText = crcOfText;
exports.findCrcModel = findCrcModel;
exports.CRC_MODELS = [
    { id: 'crc8-smbus', name: 'CRC-8/SMBUS', width: 8, poly: 0x07n, init: 0x00n, refin: false, refout: false, xorout: 0x00n },
    { id: 'crc8-maxim', name: 'CRC-8/MAXIM（1-Wire）', width: 8, poly: 0x31n, init: 0x00n, refin: true, refout: true, xorout: 0x00n },
    { id: 'crc16-ccitt-false', name: 'CRC-16/CCITT-FALSE', width: 16, poly: 0x1021n, init: 0xffffn, refin: false, refout: false, xorout: 0x0000n },
    { id: 'crc16-xmodem', name: 'CRC-16/XMODEM', width: 16, poly: 0x1021n, init: 0x0000n, refin: false, refout: false, xorout: 0x0000n },
    { id: 'crc16-modbus', name: 'CRC-16/MODBUS', width: 16, poly: 0x8005n, init: 0xffffn, refin: true, refout: true, xorout: 0x0000n },
    { id: 'crc16-arc', name: 'CRC-16/ARC（IBM）', width: 16, poly: 0x8005n, init: 0x0000n, refin: true, refout: true, xorout: 0x0000n },
    { id: 'crc32-iso-hdlc', name: 'CRC-32/ISO-HDLC（ZIP）', width: 32, poly: 0x04c11db7n, init: 0xffffffffn, refin: true, refout: true, xorout: 0xffffffffn },
    { id: 'crc32-bzip2', name: 'CRC-32/BZIP2', width: 32, poly: 0x04c11db7n, init: 0xffffffffn, refin: false, refout: false, xorout: 0xffffffffn },
    { id: 'crc64-xz', name: 'CRC-64/XZ', width: 64, poly: 0x42f0e1eba9ea3693n, init: 0xffffffffffffffffn, refin: true, refout: true, xorout: 0xffffffffffffffffn },
];
function reflect8(b) {
    let r = 0;
    for (let i = 0; i < 8; i++)
        if (b & (1 << i))
            r |= 1 << (7 - i);
    return r;
}
function reflectN(v, n) {
    let r = 0n;
    for (let i = 0; i < n; i++)
        if ((v >> BigInt(i)) & 1n)
            r |= 1n << BigInt(n - 1 - i);
    return r;
}
/** 按模型计算字节数组的 CRC，返回 bigint 原始值。 */
function crcOfBytes(bytes, m) {
    const mask = (1n << BigInt(m.width)) - 1n;
    let crc = m.init & mask;
    const w = BigInt(m.width);
    for (const b of bytes) {
        const byte = BigInt(m.refin ? reflect8(b) : b);
        crc = (crc ^ (byte << (w - 8n))) & mask;
        for (let i = 0; i < 8; i++) {
            const top = (crc >> (w - 1n)) & 1n;
            crc = (crc << 1n) & mask;
            if (top)
                crc ^= m.poly;
            crc &= mask;
        }
    }
    // MSB-First 算法下：refin 反射输入字节，refout 无条件反射输出寄存器
    if (m.refout)
        crc = reflectN(crc, m.width);
    return (crc ^ m.xorout) & mask;
}
/** 按模型计算文本（UTF-8）的 CRC，返回补齐宽度的小写十六进制字符串。 */
function crcOfText(text, m) {
    const v = crcOfBytes(new TextEncoder().encode(text), m);
    return v.toString(16).padStart(m.width / 4, '0');
}
/** 按模型 id 查找模型。 */
function findCrcModel(id) {
    const m = exports.CRC_MODELS.find((x) => x.id === id);
    if (!m)
        throw new Error(`未知 CRC 模型：${id}`);
    return m;
}
