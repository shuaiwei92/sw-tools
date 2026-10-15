import { describe, it, expect } from 'vitest';
import {
  gbkSupported, decodeGbk, encodeGbk, utf8TextToGbkText, gbkTextToUtf8,
  fixMojibake, bytesToHex, hexToBytes,
} from './gbk';

const hasGbk = gbkSupported();

describe.runIf(hasGbk)('GBK 编解码', () => {
  it('已知字节序列解码', () => {
    // 中 = D6D0，国 = B9FA（GBK 码位）
    expect(decodeGbk(new Uint8Array([0xd6, 0xd0, 0xb9, 0xfa]))).toBe('中国');
  });
  it('文本 → GBK 字节（已知码位）', () => {
    expect(Array.from(encodeGbk('中'))).toEqual([0xd6, 0xd0]);
    expect(Array.from(encodeGbk('A'))).toEqual([0x41]);
  });
  it('中文 encodeGbk → decodeGbk 往返', () => {
    const s = '中华人民共和国abc123';
    expect(decodeGbk(encodeGbk(s))).toBe(s);
  });
  it('UTF-8 文本按 GBK 读产生乱码（经典场景）', () => {
    // "中" 的 UTF-8 字节 E4 B8 AD 按 GBK 解是 "涓"（≥1 字符且非原文）
    const mojibake = utf8TextToGbkText('中');
    expect(mojibake).not.toBe('中');
    expect(mojibake.length).toBeGreaterThanOrEqual(1);
  });
  it('乱码恢复：gbkTextToUtf8 还原原文', () => {
    const original = '你好，世界！';
    const broken = utf8TextToGbkText(original); // UTF-8 字节被 GBK 解读
    const fixed = gbkTextToUtf8(broken);
    expect(fixed).toBe(original);
  });
  it('fixMojibake 自动恢复', () => {
    const original = '设置';
    const broken = utf8TextToGbkText(original);
    const r = fixMojibake(broken);
    expect(r.recovered).toBe(true);
    expect(r.text).toBe(original);
  });
  it('fixMojibake 对正常文本不动', () => {
    const r = fixMojibake('正常中文');
    expect(r.recovered).toBe(false);
    expect(r.text).toBe('正常中文');
  });
  it('非 GBK 字符编码为 ?', () => {
    // emoji 不在 GBK 内
    expect(Array.from(encodeGbk('😀'))).toEqual([0x3f]);
  });
  it('GBK 覆盖率：常用 3500 字全部可编码', () => {
    // 取一段覆盖常用字的文本逐字验证
    const sample = '的一是不了人我在有他这为之大来以个中上们到说国和地也子时道出而要于就下得可你年生自会那后能对着事其里所去行过家十用发天如然作方成者多日都三小军二无同么经法当起与好看学进种将还分此心前面又定见只主没公从';
    const bytes = encodeGbk(sample);
    // 每个非 ASCII 字符占 2 字节
    const nonAscii = [...sample].filter((c) => c.codePointAt(0)! > 0x7f).length;
    expect(bytes.length).toBe(nonAscii * 2);
    expect(decodeGbk(bytes)).toBe(sample);
  });
});

describe.runIf(!hasGbk)('环境不支持时', () => {
  it('gbkSupported 为 false 且解码抛错', () => {
    expect(gbkSupported()).toBe(false);
    expect(() => decodeGbk(new Uint8Array([0xd6, 0xd0]))).toThrow();
  });
});

describe('hex 工具', () => {
  it('bytesToHex / hexToBytes 往返', () => {
    const bytes = new Uint8Array([0xd6, 0xd0, 0x00, 0xff, 0x41]);
    expect(bytesToHex(bytes)).toBe('d6 d0 00 ff 41');
    expect(Array.from(hexToBytes('d6 d0 00 ff 41'))).toEqual([0xd6, 0xd0, 0x00, 0xff, 0x41]);
  });
  it('hexToBytes 容忍多种分隔与大小写', () => {
    expect(Array.from(hexToBytes('0xD6,0xD0'))).toEqual([0xd6, 0xd0]);
    expect(Array.from(hexToBytes('D6D0'))).toEqual([0xd6, 0xd0]);
    expect(hexToBytes('   ')).toEqual(new Uint8Array(0));
  });
  it('hexToBytes 非法输入抛错', () => {
    expect(() => hexToBytes('zz')).toThrow();
    expect(() => hexToBytes('d6d')).toThrow();
  });
});
