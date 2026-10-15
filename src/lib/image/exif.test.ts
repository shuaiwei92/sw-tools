import { describe, it, expect } from 'vitest';
import { stripImageMetadata, summarizeMetadata, detectFormat } from './exif';

function jpegWithApp1(): Uint8Array {
  // SOI + APP1(Exif, 2 字节数据) + EOI
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x04, 0x41, 0x42, 0xff, 0xd9]);
}
function pngWithText(): Uint8Array {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const ihdr = [0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const text = [0x00, 0x00, 0x00, 0x03, 0x74, 0x45, 0x58, 0x74, 0x61, 0x62, 0x63, 0x00, 0x00, 0x00, 0x00];
  const iend = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0x00, 0x00, 0x00, 0x00];
  return Uint8Array.from([...sig, ...ihdr, ...text, ...iend]);
}

describe('detectFormat', () => {
  it('识别 JPEG / PNG / 未知', () => {
    expect(detectFormat(jpegWithApp1())).toBe('jpeg');
    expect(detectFormat(pngWithText())).toBe('png');
    expect(detectFormat(Uint8Array.from([1, 2, 3]))).toBe('unknown');
  });
});

describe('stripImageMetadata - JPEG', () => {
  it('移除 APP1(Exif) 并保留图像数据', () => {
    const buf = jpegWithApp1();
    const r = stripImageMetadata(buf);
    expect(r.format).toBe('jpeg');
    expect(r.removed).toEqual(['Exif (APP1)']);
    // SOI(FFD8) + EOI(FFD9)
    expect([...r.cleaned]).toEqual([0xff, 0xd8, 0xff, 0xd9]);
    expect(r.cleanedSize).toBeLessThan(r.originalSize);
  });
});

describe('stripImageMetadata - PNG', () => {
  it('移除 tEXt 块并保留 IHDR/IEND', () => {
    const buf = pngWithText();
    const r = stripImageMetadata(buf);
    expect(r.format).toBe('png');
    expect(r.removed).toEqual(['tEXt']);
    // 清后不应再包含 tEXt 的 ASCII
    const text = String.fromCharCode(...r.cleaned);
    expect(text).not.toContain('tEXt');
    expect(text).toContain('IHDR');
    expect(text).toContain('IEND');
  });
});

describe('summarizeMetadata', () => {
  it('预览检测到的元数据类型', () => {
    expect(summarizeMetadata(jpegWithApp1()).found).toContain('Exif (APP1)');
    expect(summarizeMetadata(pngWithText()).found).toContain('tEXt');
  });
  it('无元数据时报 hasMetadata=false', () => {
    // 仅 SOI+EOI 的 JPEG
    const clean = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
    expect(summarizeMetadata(clean).hasMetadata).toBe(false);
  });
});
