import { describe, it, expect } from 'vitest';
import {
  parseOctal,
  bitsToOctal,
  octalToSymbolic,
  symbolicToOctal,
  applyClause,
  lsLine,
  describeMode,
  commonPresets,
  emptyBits,
} from './chmod';

describe('parseOctal', () => {
  it('解析 3 位与 4 位八进制', () => {
    expect(bitsToOctal(parseOctal('755')!)).toBe('0755');
    expect(bitsToOctal(parseOctal('0755')!)).toBe('0755');
    expect(bitsToOctal(parseOctal('4755')!)).toBe('4755');
    expect(bitsToOctal(parseOctal('1777')!)).toBe('1777');
    expect(bitsToOctal(parseOctal('000')!)).toBe('0000');
  });

  it('识别特殊位', () => {
    const b = parseOctal('4755')!;
    expect(b.setuid).toBe(true);
    expect(b.setgid).toBe(false);
    expect(b.sticky).toBe(false);
    expect(b.user).toEqual({ r: true, w: true, x: true });
  });

  it('拒绝非法输入', () => {
    expect(parseOctal('888')).toBeNull();
    expect(parseOctal('75')).toBeNull();
    expect(parseOctal('75555')).toBeNull(); // 5 位
    expect(parseOctal('abc')).toBeNull();
    expect(parseOctal('')).toBeNull();
    expect(parseOctal(-1)).toBeNull();
    expect(parseOctal(755)).not.toBeNull(); // 数字按十进制字面量转成八进制数字串
    expect(bitsToOctal(parseOctal('0o640')!)).toBe('0640');
    // 7555 是合法四位：特殊位 7（suid+sgid+sticky）
    const b = parseOctal('7555')!;
    expect(b.setuid).toBe(true);
    expect(b.setgid).toBe(true);
    expect(b.sticky).toBe(true);
  });
});

describe('符号串互转', () => {
  it('八进制 → rwx', () => {
    expect(octalToSymbolic('755')).toBe('rwxr-xr-x');
    expect(octalToSymbolic('644')).toBe('rw-r--r--');
    expect(octalToSymbolic('000')).toBe('---------');
    expect(octalToSymbolic('4755')).toBe('rwsr-xr-x');
    expect(octalToSymbolic('2755')).toBe('rwxr-sr-x');
    expect(octalToSymbolic('1777')).toBe('rwxrwxrwt');
    expect(octalToSymbolic('4644')).toBe('rwSr--r--'); // setuid 但无 x → S
    expect(octalToSymbolic('1644')).toBe('rw-r--r-T'); // sticky 但无 x → T
  });

  it('rwx → 八进制', () => {
    expect(symbolicToOctal('rwxr-xr-x')).toBe('0755');
    expect(symbolicToOctal('rwsr-xr-x')).toBe('4755');
    expect(symbolicToOctal('rwxrwxrwt')).toBe('1777');
    expect(symbolicToOctal('rwSr--r--')).toBe('4644');
    expect(symbolicToOctal('-rw-r--r--')).toBe('0644'); // 带类型字符
    expect(symbolicToOctal('---------')).toBe('0000');
  });

  it('全部 4096 种模式往返一致', () => {
    for (let special = 0; special < 8; special++) {
      for (let u = 0; u < 8; u++) {
        for (let g = 0; g < 8; g++) {
          for (let o = 0; o < 8; o++) {
            const octal = `${special}${u}${g}${o}`;
            expect(symbolicToOctal(octalToSymbolic(octal)!)).toBe(octal);
          }
        }
      }
    }
  });

  it('拒绝非法符号串', () => {
    expect(symbolicToOctal('rwxr-xr-')).toBeNull();
    expect(symbolicToOctal('rwxr-xr-xa')).toBeNull();
    expect(symbolicToOctal('rwxq-xr-x')).toBeNull();
    expect(symbolicToOctal('rwtrwxrwx')).toBeNull(); // t 不能出现在 user 位
    expect(symbolicToOctal('')).toBeNull();
  });
});

describe('applyClause', () => {
  it('加法与减法', () => {
    expect(applyClause('644', 'u+x')).toBe('0744');
    expect(applyClause('755', 'a-x')).toBe('0644');
    expect(applyClause('600', 'a+rw')).toBe('0666');
    expect(applyClause('755', 'go-w')).toBe('0755'); // 755 的 g/o 本就没有 w
    expect(applyClause('666', 'go-w')).toBe('0644');
  });

  it('赋值先清后设', () => {
    expect(applyClause('000', 'u=rwx,g=rx,o=r')).toBe('0754');
    expect(applyClause('777', 'u=rw')).toBe('0677');
    expect(applyClause('777', 'u=')).toBe('0077'); // u= 无 perm 列表：清空 u 的 rwx
    expect(applyClause('777', 'go=')).toBe('0700');
  });

  it('特殊位', () => {
    expect(applyClause('755', 'u+s')).toBe('4755');
    expect(applyClause('4755', 'u-s')).toBe('0755');
    expect(applyClause('755', 'g+s')).toBe('2755');
    expect(applyClause('755', 'o+t')).toBe('1755');
    expect(applyClause('1777', 'o-t')).toBe('0777');
  });

  it('X 仅在有 x 时生效', () => {
    expect(applyClause('644', 'a+X')).toBe('0644'); // 无任何 x → 不变
    expect(applyClause('755', 'a+X')).toBe('0755'); // 已有 x → 保持
  });

  it('省略 who 表示全部', () => {
    expect(applyClause('644', '+x')).toBe('0755');
    expect(applyClause('644', '=r')).toBe('0444');
  });

  it('拒绝非法子句', () => {
    expect(applyClause('644', 'u+q')).toBeNull();
    expect(applyClause('644', 'ux')).toBeNull();
    expect(applyClause('644', '')).toBeNull();
    expect(applyClause('999', 'u+x')).toBeNull(); // base 非法
    expect(applyClause('644', 'u+x g-w')).toBeNull(); // 空格非法
    expect(applyClause('644', 'u+x,,g-w')).toBe('0744'); // 空段忽略
  });
});

describe('lsLine / describeMode / presets', () => {
  it('ls -l 行', () => {
    expect(lsLine('755', 'run.sh')).toBe('-rwxr-xr-x run.sh');
    expect(lsLine('1777')).toBe('-rwxrwxrwt file');
  });

  it('中文描述', () => {
    const d = describeMode('750');
    expect(d).toContain('文件主（u）：读、写、执行');
    expect(d).toContain('同组用户（g）：读、执行');
    expect(d).toContain('其他用户（o）：无');
    expect(describeMode('4755')).toContain('setuid');
    expect(describeMode('1777')).toContain('sticky');
  });

  it('预设齐全且合法', () => {
    const presets = commonPresets();
    expect(presets.length).toBeGreaterThanOrEqual(10);
    for (const p of presets) {
      expect(parseOctal(p.octal)).not.toBeNull();
      expect(p.label).toBeTruthy();
      expect(p.desc).toBeTruthy();
    }
    expect(presets.map((p) => p.octal)).toContain('0644');
  });

  it('emptyBits 全空', () => {
    expect(bitsToOctal(emptyBits())).toBe('0000');
  });
});
