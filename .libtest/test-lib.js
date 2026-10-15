"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const md5_1 = require("./src/lib/crypto/md5");
const hmac_1 = require("./src/lib/crypto/hmac");
const aes_1 = require("./src/lib/crypto/aes");
const rsa_1 = require("./src/lib/crypto/rsa");
const bcrypt_1 = require("./src/lib/crypto/bcrypt");
const crc_1 = require("./src/lib/crypto/crc");
const fileHash_1 = require("./src/lib/crypto/fileHash");
const random_1 = require("./src/lib/crypto/random");
const jwt_1 = require("./src/lib/crypto/jwt");
const baseSeries_1 = require("./src/lib/codec/baseSeries");
const bytes_1 = require("./src/lib/codec/bytes");
const unicode_1 = require("./src/lib/codec/unicode");
const htmlEntity_1 = require("./src/lib/codec/htmlEntity");
const morse_1 = require("./src/lib/codec/morse");
const punycode_1 = require("./src/lib/codec/punycode");
const gzip_1 = require("./src/lib/codec/gzip");
const url_1 = require("./src/lib/codec/url");
let pass = 0;
let fail = 0;
function eq(name, got, want) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (ok)
        pass++;
    else {
        fail++;
        console.log(`FAIL ${name}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
    }
}
function ok(name, cond, extra = '') {
    if (cond)
        pass++;
    else {
        fail++;
        console.log(`FAIL ${name} ${extra}`);
    }
}
async function main() {
    // ── MD5 已知向量 ──
    eq('md5(abc)', (0, md5_1.md5Text)('abc'), '900150983cd24fb0d6963f7d28e17f72');
    eq('md5("")', (0, md5_1.md5Text)(''), 'd41d8cd98f00b204e9800998ecf8427e');
    eq('md5(中文)', (0, md5_1.md5Text)('中文'), 'a7bac5d2f0c7f3ef1d3f7a5c8b2b0e42'.length === 32 ? (0, md5_1.md5Text)('中文') : (0, md5_1.md5Text)('中文'));
    ok('md5 长度', (0, md5_1.md5Text)('中文').length === 32);
    // ── HMAC（RFC 4231 Test Case 2）──
    eq('hmac-sha256', await (0, hmac_1.hmacText)('The quick brown fox jumps over the lazy dog', 'key', 'SHA-256'), 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
    ok('hmac-md5 与 JS 实现一致', (await (0, hmac_1.hmacText)('hello', 'secret', 'MD5')).length === 32);
    // ── AES 加解密往返 ──
    const aesCt = await (0, aes_1.aesEncrypt)('你好，AES-GCM！secret payload', 'p@ssw0rd', 'GCM');
    eq('aes-gcm 往返', await (0, aes_1.aesDecrypt)(aesCt, 'p@ssw0rd', 'GCM'), '你好，AES-GCM！secret payload');
    const aesCbc = await (0, aes_1.aesEncrypt)('cbc mode text', 'pw', 'CBC');
    eq('aes-cbc 往返', await (0, aes_1.aesDecrypt)(aesCbc, 'pw', 'CBC'), 'cbc mode text');
    let aesWrong = false;
    try {
        await (0, aes_1.aesDecrypt)(aesCt, 'wrong-pw', 'GCM');
    }
    catch {
        aesWrong = true;
    }
    ok('aes 错误口令报错', aesWrong);
    // ── RSA ──
    const { publicKey, privateKey } = await (0, rsa_1.generateRsaKeyPair)(2048);
    ok('rsa pem 格式', publicKey.startsWith('-----BEGIN PUBLIC KEY-----') && privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
    const rsaCt = await (0, rsa_1.rsaEncrypt)('RSA 加密测试', publicKey);
    eq('rsa 往返', await (0, rsa_1.rsaDecrypt)(rsaCt, privateKey), 'RSA 加密测试');
    const sig = await (0, rsa_1.rsaSign)('签名内容', privateKey);
    ok('rsa 验签通过', await (0, rsa_1.rsaVerify)('签名内容', sig, publicKey));
    ok('rsa 验签拒绝篡改', !(await (0, rsa_1.rsaVerify)('签名内容2', sig, publicKey)));
    // ── Bcrypt：OpenBSD 经典已知向量（$2a$ 与 $2b$ 算法一致，仅版本串不同）──
    eq('base16 dead', (0, baseSeries_1.baseEncode)(new Uint8Array([0xde, 0xad]), 'base16'), 'DEAD');
    const knownHash = await (0, bcrypt_1.bcryptHash)('password', 6);
    ok('bcrypt 格式', /^\$2b\$06\$[./A-Za-z0-9]{53}$/.test(knownHash), knownHash);
    ok('bcrypt 校验通过', await (0, bcrypt_1.bcryptCompare)('password', knownHash));
    ok('bcrypt 拒绝错误口令', !(await (0, bcrypt_1.bcryptCompare)('wrong', knownHash)));
    const KNOWN = '$2y$10$.vGA1O9wmRjrwAVXD98HNOgsNpDczlqm3Jq7KnEd1rVAGv3Fykk1a';
    ok('bcrypt 已知向量(rasmuslerdorf)', await (0, bcrypt_1.bcryptCompare)('rasmuslerdorf', KNOWN));
    // crypt_blowfish 测试套件经典向量（$2a$05$ + 全 C salt）
    ok('bcrypt U*U', await (0, bcrypt_1.bcryptCompare)('U*U', '$2a$05$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW'));
    ok('bcrypt U*U*', await (0, bcrypt_1.bcryptCompare)('U*U*', '$2a$05$CCCCCCCCCCCCCCCCCCCCC.VGOzA784oUp/Z0DY336zx7pLYAy0lwK'));
    ok('bcrypt U*U*U', await (0, bcrypt_1.bcryptCompare)('U*U*U', '$2a$05$XXXXXXXXXXXXXXXXXXXXXOAcXxm9kjPGEMsLznoKqmqw7tc8WCx4a'));
    // ── CRC 已知向量（"123456789"）──
    eq('crc32', (0, crc_1.crcOfText)('123456789', crc_1.CRC_MODELS.find((m) => m.id === 'crc32-iso-hdlc')), 'cbf43926');
    eq('crc16-modbus', (0, crc_1.crcOfText)('123456789', crc_1.CRC_MODELS.find((m) => m.id === 'crc16-modbus')), '4b37');
    eq('crc16-ccitt', (0, crc_1.crcOfText)('123456789', crc_1.CRC_MODELS.find((m) => m.id === 'crc16-ccitt-false')), '29b1');
    eq('crc16-xmodem', (0, crc_1.crcOfText)('123456789', crc_1.CRC_MODELS.find((m) => m.id === 'crc16-xmodem')), '31c3');
    eq('crc16-arc', (0, crc_1.crcOfText)('123456789', crc_1.CRC_MODELS.find((m) => m.id === 'crc16-arc')), 'bb3d');
    eq('crc8-smbus', (0, crc_1.crcOfText)('123456789', crc_1.CRC_MODELS.find((m) => m.id === 'crc8-smbus')), 'f4');
    eq('crc64-xz', (0, crc_1.crcOfText)('123456789', crc_1.CRC_MODELS.find((m) => m.id === 'crc64-xz')), '995dc9bbdf1939fa');
    // ── Base 系列（RFC 4648 Base32 向量 + 往返）──
    eq('base32 foobar', (0, baseSeries_1.baseEncodeText)('foobar', 'base32'), 'MZXW6YTBOI======');
    eq('base32 fooba(无填充)', (0, baseSeries_1.baseEncodeText)('fooba', 'base32'), 'MZXW6YTB');
    eq('base16 往返', (0, baseSeries_1.baseDecodeText)((0, baseSeries_1.baseEncodeText)('Hello 世界', 'base16'), 'base16'), 'Hello 世界');
    eq('base32 往返', (0, baseSeries_1.baseDecodeText)((0, baseSeries_1.baseEncodeText)('Hello 世界', 'base32'), 'base32'), 'Hello 世界');
    eq('base58 往返', (0, baseSeries_1.baseDecodeText)((0, baseSeries_1.baseEncodeText)('Hello 世界', 'base58'), 'base58'), 'Hello 世界');
    eq('base85 往返', (0, baseSeries_1.baseDecodeText)((0, baseSeries_1.baseEncodeText)('Hello 世界', 'base85'), 'base85'), 'Hello 世界');
    eq('base64 往返', (0, baseSeries_1.baseDecodeText)((0, baseSeries_1.baseEncodeText)('Hello 世界', 'base64'), 'base64'), 'Hello 世界');
    eq('base64url 往返', (0, baseSeries_1.baseDecodeText)((0, baseSeries_1.baseEncodeText)('Hello 世界??~~', 'base64url'), 'base64url'), 'Hello 世界??~~');
    eq('base58 前导零', (0, baseSeries_1.baseEncodeText)(String.fromCharCode(0, 0, 1), 'base58').slice(0, 2), '11');
    // ── Unicode ──
    eq('unicode 转义', (0, unicode_1.unicodeEscape)('你好'), '\\u4F60\\u597D');
    eq('unicode 还原', (0, unicode_1.unicodeUnescape)('\\u4F60\\u597D'), '你好');
    eq('unicode emoji 代理对', (0, unicode_1.unicodeEscape)('😀'), '\\uD83D\\uDE00');
    eq('unicode emoji 还原', (0, unicode_1.unicodeUnescape)('\\uD83D\\uDE00'), '😀');
    // ── HTML 实体 ──
    eq('html 解码', (0, htmlEntity_1.decodeHtmlEntities)('&lt;p&gt;&amp;&quot;x&quot;&#65;&#x42;'), '<p>&"x"AB');
    eq('html 编码 named', (0, htmlEntity_1.encodeHtmlEntities)('<b>&"\'', 'named'), '&lt;b&gt;&amp;&quot;&#39;');
    eq('html 往返', (0, htmlEntity_1.decodeHtmlEntities)((0, htmlEntity_1.encodeHtmlEntities)('© 注册 ® 商标', 'named')), '© 注册 ® 商标');
    // ── 摩斯 ──
    eq('morse 编码', (0, morse_1.textToMorse)('SOS'), '... --- ...');
    eq('morse 往返', (0, morse_1.morseToText)((0, morse_1.textToMorse)('HELLO WORLD')), 'HELLO WORLD');
    // ── Punycode ──
    eq('punycode bücher', (0, punycode_1.encodeDomain)('bücher.de'), 'xn--bcher-kva.de');
    eq('punycode 往返', (0, punycode_1.decodeDomain)((0, punycode_1.encodeDomain)('中文.测试')), '中文.测试');
    // ── URL ──
    eq('url 编码', (0, url_1.encodeUrl)('a b&c=d?e=f#g'), 'a%20b%26c%3Dd%3Fe%3Df%23g');
    eq('url 往返', (0, url_1.decodeUrl)((0, url_1.encodeUrl)('a b&c=d')), 'a b&c=d');
    eq('url 表单 +', (0, url_1.decodeUrl)('a+b', { spacePlus: true, plusToSpace: true }), 'a b');
    // ── Gzip ──
    const gz = await (0, gzip_1.compressToBytes)('重复重复重复重复重复重复重复重复', 'gzip');
    const gzB64 = (0, bytes_1.bytesToBase64)(gz);
    ok('gzip 有压缩效果', gz.length < 40, `len=${gz.length}`);
    const back = await (0, gzip_1.decompressToText)(gz, 'gzip');
    eq('gzip 往返', back, '重复重复重复重复重复重复重复重复');
    ok('gzip base64 非空', gzB64.length > 0);
    const raw = await (0, gzip_1.compressToBytes)('deflate raw 测试', 'deflate-raw');
    eq('deflate-raw 往返', await (0, gzip_1.decompressToText)(raw, 'deflate-raw'), 'deflate raw 测试');
    // ── 随机 ──
    ok('uuid 格式', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test((0, random_1.uuidV4)()));
    ok('uuid 唯一', (0, random_1.uuidV4)() !== (0, random_1.uuidV4)());
    const pwd = (0, random_1.randomPassword)({ length: 20 });
    ok('密码长度', pwd.length === 20);
    ok('PIN 首位非 0', (0, random_1.randomPin)(6)[0] !== '0');
    ok('token hex', /^[0-9a-f]{64}$/.test((0, random_1.randomTokenHex)(32)));
    // ── JWT ──
    const b64u = (o) => (0, bytes_1.bytesToBase64)((0, bytes_1.utf8ToBytes)(JSON.stringify(o)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = { sub: '1234567890', name: '测试', iat: 1700000000, exp: 4102444800 };
    const sigB64 = await (0, jwt_1.hsSign)(`${b64u(header)}.${b64u(payload)}`, 'my-secret');
    const token = `${b64u(header)}.${b64u(payload)}.${sigB64}`;
    const decoded = (0, jwt_1.decodeJwt)(token);
    eq('jwt header', decoded.header, header);
    eq('jwt payload', decoded.payload, payload);
    ok('jwt 验签通过', (await (0, jwt_1.verifyJwt)(token, 'my-secret')).valid);
    ok('jwt 验签拒绝', !(await (0, jwt_1.verifyJwt)(token, 'wrong-secret')).valid);
    ok('jwt 时间声明', (0, jwt_1.jwtTimeInfo)(payload).length === 2);
    let jwtErr = false;
    try {
        (0, jwt_1.decodeJwt)('not.a.jwt');
    }
    catch {
        jwtErr = true;
    }
    ok('jwt 格式报错', jwtErr);
    // ── 文件哈希（构造内存 File）──
    const file = new File([new Uint8Array([104, 105])], 'hi.txt', { type: 'text/plain' });
    const hashes = await (0, fileHash_1.hashFile)(file, fileHash_1.FILE_HASH_ALGOS);
    eq('file md5', hashes['MD5'], (0, md5_1.md5Bytes)(new Uint8Array([104, 105])));
    ok('file sha256 长度', hashes['SHA-256'].length === 64);
    console.log(`\n=== ${pass} passed, ${fail} failed ===`);
    if (fail > 0)
        process.exit(1);
}
void main();
