import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, parseOtpauth, totp } from './totp';

describe('base32', () => {
  it('round-trips bytes', () => {
    const bytes = new TextEncoder().encode('12345678901234567890');
    const encoded = base32Encode(bytes);
    expect(encoded).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect([...base32Decode(encoded)]).toEqual([...bytes]);
  });

  it('ignores spaces and padding', () => {
    expect([...base32Decode('GEZD GNBV=')]).toEqual([...base32Decode('GEZDGNBV')]);
  });

  it('rejects illegal characters', () => {
    expect(() => base32Decode('ABC1')).toThrow('Base32 字符非法');
  });
});

describe('totp (RFC 6238 SHA-1 test vectors)', () => {
  // RFC 6238 使用的 SHA-1 测试密钥为 ASCII "12345678901234567890"，先 Base32 编码
  const secret = base32Encode(new TextEncoder().encode('12345678901234567890'));

  it('matches all reference vectors', () => {
    const vectors: [number, string][] = [
      [59, '94287082'],
      [1111111109, '07081804'],
      [1111111111, '14050471'],
      [1234567890, '89005924'],
      [2000000000, '69279037'],
      [20000000000, '65353130'],
    ];
    for (const [time, expected] of vectors) {
      const { code } = totp(secret, { time, period: 30, digits: 8 });
      expect(code, `time=${time}`).toBe(expected);
    }
  });

  it('computes 6-digit codes and remaining seconds', () => {
    const r = totp(secret, { time: 59, period: 30, digits: 6 });
    expect(r.code).toBe('287082');
    expect(r.remaining).toBe(30 - (59 % 30));
  });

  it('falls back to ASCII secrets', () => {
    // 直接传 ASCII 密钥时应走 TextEncoder 分支，结果与 Base32 编码后一致
    expect(totp('12345678901234567890', { time: 59, digits: 8 }).code).toBe('94287082');
  });
});

describe('parseOtpauth', () => {
  it('parses a full otpauth URI', () => {
    const r = parseOtpauth(
      'otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&digits=6&period=30'
    );
    expect('error' in r ? r.error : '').toBe('');
    if (!('error' in r)) {
      expect(r.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(r.issuer).toBe('Example');
      expect(r.account).toBe('alice@google.com');
      expect(r.digits).toBe(6);
      expect(r.period).toBe(30);
    }
  });

  it('handles URI without issuer param', () => {
    const r = parseOtpauth('otpauth://totp/alice@google.com?secret=JBSWY3DPEHPK3PXP');
    if (!('error' in r)) {
      expect(r.account).toBe('alice@google.com');
      expect(r.issuer).toBe('');
    } else {
      throw new Error('should not fail');
    }
  });

  it('rejects invalid input', () => {
    expect(parseOtpauth('https://example.com')).toHaveProperty('error');
    expect(parseOtpauth('otpauth://totp/a?digits=6')).toHaveProperty('error');
    expect(parseOtpauth('otpauth://totp/a?secret=XXX&digits=7&period=30')).not.toHaveProperty('error');
  });
});
