import { describe, expect, it } from 'vitest';
import { toChineseNumber, toChineseUpper } from './numberCn';

describe('toChineseUpper (人民币大写)', () => {
  const cases: [string, string][] = [
    ['0', '零元整'],
    ['1', '壹元整'],
    ['10', '壹拾元整'],
    ['100', '壹佰元整'],
    ['1000', '壹仟元整'],
    ['10000', '壹万元整'],
    ['100000', '壹拾万元整'],
    ['1000000', '壹佰万元整'],
    ['1234.56', '壹仟贰佰叁拾肆元伍角陆分'],
    ['105', '壹佰零伍元整'],
    ['101', '壹佰零壹元整'],
    ['1001', '壹仟零壹元整'],
    ['1010', '壹仟零壹拾元整'],
    ['1100', '壹仟壹佰元整'],
    ['10500.05', '壹万零伍佰元零伍分'],
    ['0.05', '零元零伍分'],
    ['0.5', '零元伍角'],
    ['600105.07', '陆拾万零壹佰零伍元零柒分'],
    ['123456789', '壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖元整'],
    ['-99.9', '负玖拾玖元玖角'],
    ['1,234.50', '壹仟贰佰叁拾肆元伍角'],
  ];
  for (const [input, expected] of cases) {
    it(`${input} → ${expected}`, () => {
      expect(toChineseUpper(input)).toBe(expected);
    });
  }

  it('rejects invalid input', () => {
    expect(toChineseUpper('abc')).toBe('');
    expect(toChineseUpper('')).toBe('');
  });

  it('rounds to fen', () => {
    // 0.005 四舍五入到分 → 壹分
    expect(toChineseUpper('0.005')).toBe('零元零壹分');
  });
});

describe('toChineseNumber (普通读法)', () => {
  const cases: [string, string][] = [
    ['0', '零'],
    ['7', '七'],
    ['10', '十'],
    ['15', '十五'],
    ['110', '一百一十'],
    ['1000', '一千'],
    ['1001', '一千零一'],
    ['1010', '一千零一十'],
    ['1234', '一千二百三十四'],
    ['10000', '一万'],
    ['100000', '十万'],
    ['12345', '一万二千三百四十五'],
    ['100000000', '一亿'],
    ['3.14', '三点一四'],
    ['-5', '负五'],
  ];
  for (const [input, expected] of cases) {
    it(`${input} → ${expected}`, () => {
      expect(toChineseNumber(input)).toBe(expected);
    });
  }
});
