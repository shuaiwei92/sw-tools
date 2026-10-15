"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* 临时调试：枚举 bcrypt 结构变体，对照 U*U 已知向量找出正确组合。 */
const bcrypt_1 = require("./src/lib/crypto/bcrypt");
const MAGIC = 'OrpheanBeholderScryDoubt';
function core(password, cost, salt, initMode, // 0: expandSalt(salt,key)  1: expandSalt(key,salt)  2: 无初始
loopOrder, // 0: expand0(key) → expand0(salt)   1: 反向
finalMode // 0: 3 块加密一次   1: 3 块加密 64 次
) {
    const raw = new TextEncoder().encode(password);
    const key = new Uint8Array(raw.length + 1);
    key.set(raw); // 结尾 NUL
    const st = (0, bcrypt_1.initState)();
    if (initMode === 0)
        (0, bcrypt_1.expandSalt)(st, salt, key);
    else if (initMode === 1)
        (0, bcrypt_1.expandSalt)(st, key, salt);
    for (let k = 0; k < 1 << cost; k++) {
        if (loopOrder === 0) {
            (0, bcrypt_1.expand0)(st, key);
            (0, bcrypt_1.expand0)(st, salt);
        }
        else {
            (0, bcrypt_1.expand0)(st, salt);
            (0, bcrypt_1.expand0)(st, key);
        }
    }
    const magic = new TextEncoder().encode(MAGIC);
    const words = [];
    const j = { v: 0 };
    for (let i = 0; i < 6; i++)
        words.push((0, bcrypt_1.stream2word)(magic, j));
    const rounds = finalMode === 1 ? 64 : 1;
    for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < 6; i += 2) {
            const [l, rr] = (0, bcrypt_1.encipher)(st, words[i], words[i + 1]);
            words[i] = l;
            words[i + 1] = rr;
        }
    }
    const out = new Uint8Array(24);
    for (let i = 0; i < 6; i++) {
        out[i * 4] = (words[i] >>> 24) & 0xff;
        out[i * 4 + 1] = (words[i] >>> 16) & 0xff;
        out[i * 4 + 2] = (words[i] >>> 8) & 0xff;
        out[i * 4 + 3] = words[i] & 0xff;
    }
    return (0, bcrypt_1.b64Encode)(out, 23);
}
const salt = (0, bcrypt_1.b64Decode)('CCCCCCCCCCCCCCCCCCCCC.', 16);
const EXPECT = 'E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW';
for (let initMode = 0; initMode <= 2; initMode++) {
    for (let loopOrder = 0; loopOrder <= 1; loopOrder++) {
        for (let finalMode = 0; finalMode <= 1; finalMode++) {
            const got = core('U*U', 5, salt, initMode, loopOrder, finalMode);
            const mark = got === EXPECT ? ' ★★★ MATCH' : '';
            console.log(`init=${initMode} loop=${loopOrder} final=${finalMode} → ${got}${mark}`);
        }
    }
}
console.log('expect:', EXPECT);
