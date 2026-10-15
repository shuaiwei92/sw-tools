// Chmod 权限计算：八进制 ↔ rwx 符号 ↔ 符号子句互转，全部纯函数。

export interface TriBits {
  r: boolean;
  w: boolean;
  x: boolean;
}

export interface PermBits {
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
  user: TriBits;
  group: TriBits;
  other: TriBits;
}

export type Who = 'user' | 'group' | 'other';

export function emptyBits(): PermBits {
  return {
    setuid: false,
    setgid: false,
    sticky: false,
    user: { r: false, w: false, x: false },
    group: { r: false, w: false, x: false },
    other: { r: false, w: false, x: false },
  };
}

export function cloneBits(bits: PermBits): PermBits {
  return {
    setuid: bits.setuid,
    setgid: bits.setgid,
    sticky: bits.sticky,
    user: { ...bits.user },
    group: { ...bits.group },
    other: { ...bits.other },
  };
}

function triValue(t: TriBits): number {
  return (t.r ? 4 : 0) + (t.w ? 2 : 0) + (t.x ? 1 : 0);
}

function valueTri(n: number): TriBits {
  return { r: !!(n & 4), w: !!(n & 2), x: !!(n & 1) };
}

/** 解析八进制权限串（3~4 位，如 "755"、"4755"、"0o755"），非法返回 null。 */
export function parseOctal(input: string | number): PermBits | null {
  if (typeof input === 'number') {
    if (!Number.isInteger(input) || input < 0) return null;
    input = String(input);
  }
  const s = input.trim().replace(/^0o/i, '');
  if (!/^[0-7]{3,4}$/.test(s)) return null;
  const padded = s.padStart(4, '0');
  const special = Number(padded[0]);
  const bits = emptyBits();
  bits.setuid = !!(special & 4);
  bits.setgid = !!(special & 2);
  bits.sticky = !!(special & 1);
  bits.user = valueTri(Number(padded[1]));
  bits.group = valueTri(Number(padded[2]));
  bits.other = valueTri(Number(padded[3]));
  return bits;
}

/** 权限位 → 4 位八进制串。 */
export function bitsToOctal(bits: PermBits): string {
  const special = (bits.setuid ? 4 : 0) + (bits.setgid ? 2 : 0) + (bits.sticky ? 1 : 0);
  return `${special}${triValue(bits.user)}${triValue(bits.group)}${triValue(bits.other)}`;
}

/** 权限位 → 9 字符 rwx 符号串（特殊位体现为 s/S/t/T）。 */
export function bitsToSymbolic(bits: PermBits): string {
  const userX = bits.user.x ? (bits.setuid ? 's' : 'x') : bits.setuid ? 'S' : '-';
  const groupX = bits.group.x ? (bits.setgid ? 's' : 'x') : bits.setgid ? 'S' : '-';
  const otherX = bits.other.x ? (bits.sticky ? 't' : 'x') : bits.sticky ? 'T' : '-';
  return (
    (bits.user.r ? 'r' : '-') +
    (bits.user.w ? 'w' : '-') +
    userX +
    (bits.group.r ? 'r' : '-') +
    (bits.group.w ? 'w' : '-') +
    groupX +
    (bits.other.r ? 'r' : '-') +
    (bits.other.w ? 'w' : '-') +
    otherX
  );
}

/** 八进制 → 9 字符 rwx 符号串，非法输入返回 null。 */
export function octalToSymbolic(input: string | number): string | null {
  const bits = parseOctal(input);
  return bits ? bitsToSymbolic(bits) : null;
}

/** 9 字符符号串（可带前导文件类型字符，如 "-rwxr-xr-x"）→ 4 位八进制，非法返回 null。 */
export function symbolicToOctal(sym: string): string | null {
  const s = sym.trim();
  const body = s.length === 10 ? s.slice(1) : s;
  if (body.length !== 9) return null;
  const at = (i: number, set: string) => set.includes(body[i]);
  // r/w 位只允许 r w -；三个 x 位分别允许 x s S - / x s S - / x t T -
  if (!at(0, 'rw-') || !at(1, 'rw-') || !at(3, 'rw-') || !at(4, 'rw-') || !at(6, 'rw-') || !at(7, 'rw-')) return null;
  if (!at(2, 'xsS-') || !at(5, 'xsS-') || !at(8, 'xtT-')) return null;
  const bits = emptyBits();
  bits.user.r = body[0] === 'r';
  bits.user.w = body[1] === 'w';
  bits.setuid = body[2] === 's' || body[2] === 'S';
  bits.user.x = body[2] === 'x' || body[2] === 's';
  bits.group.r = body[3] === 'r';
  bits.group.w = body[4] === 'w';
  bits.setgid = body[5] === 's' || body[5] === 'S';
  bits.group.x = body[5] === 'x' || body[5] === 's';
  bits.other.r = body[6] === 'r';
  bits.other.w = body[7] === 'w';
  bits.sticky = body[8] === 't' || body[8] === 'T';
  bits.other.x = body[8] === 'x' || body[8] === 't';
  return bitsToOctal(bits);
}

/** 在 base 权限上应用 chmod 符号子句（如 "u+x"、"go-w"、"a=rx"、"ug=rw,o="），返回新 4 位八进制；非法返回 null。
 *  规则：who 省略或含 a 表示三类用户；'=' 先清空对应 who 的 rwx 及其关联特殊位再设置；
 *  '-' 清除指定位；X 仅当当前已存在任一 x 位时按 x 处理（与目录判定逻辑一致）。 */
export function applyClause(base: string | PermBits, clause: string): string | null {
  const bits = typeof base === 'string' ? parseOctal(base) : cloneBits(base);
  if (!bits) return null;
  const parts = clause.split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  for (const part of parts) {
    const m = part.match(/^([ugoa]*)([+\-=])([rwxXst]*)$/);
    if (!m) return null;
    const whoRaw = m[1];
    const op = m[2];
    const permRaw = m[3];
    let who: Who[];
    if (whoRaw === '' || whoRaw.includes('a')) {
      who = ['user', 'group', 'other'];
    } else {
      who = [];
      if (whoRaw.includes('u')) who.push('user');
      if (whoRaw.includes('g')) who.push('group');
      if (whoRaw.includes('o')) who.push('other');
    }
    if (!who.length) return null;
    const perms = new Set(permRaw.split(''));
    const hasAnyX = bits.user.x || bits.group.x || bits.other.x;
    const wantX = perms.has('x') || (perms.has('X') && hasAnyX);
    const all = who.length === 3;
    for (const w of who) {
      const tri = bits[w];
      if (op === '=') {
        tri.r = false;
        tri.w = false;
        tri.x = false;
        if (w === 'user') bits.setuid = false;
        if (w === 'group') bits.setgid = false;
        if (w === 'other') bits.sticky = false;
      }
      if (op === '=' || op === '+') {
        if (perms.has('r')) tri.r = true;
        if (perms.has('w')) tri.w = true;
        if (wantX) tri.x = true;
      } else {
        if (perms.has('r')) tri.r = false;
        if (perms.has('w')) tri.w = false;
        if (wantX) tri.x = false;
      }
      if (perms.has('s')) {
        if (w === 'user') bits.setuid = op !== '-';
        if (w === 'group') bits.setgid = op !== '-';
        if (all) {
          bits.setuid = op !== '-';
          bits.setgid = op !== '-';
        }
      }
      if (perms.has('t')) {
        if (w === 'other' || all) bits.sticky = op !== '-';
      }
    }
  }
  return bitsToOctal(bits);
}

/** ls -l 风格单行（首字符为文件类型占位 '-'）。 */
export function lsLine(input: string | PermBits, name = 'file'): string {
  const bits = typeof input === 'string' ? parseOctal(input) : input;
  if (!bits) return '';
  return `-${bitsToSymbolic(bits)} ${name}`;
}

/** 中文权限描述（三类用户逐项 + 特殊位说明）。 */
export function describeMode(input: string | PermBits): string {
  const bits = typeof input === 'string' ? parseOctal(input) : input;
  if (!bits) return '';
  const tri = (t: TriBits): string => {
    const parts: string[] = [];
    if (t.r) parts.push('读');
    if (t.w) parts.push('写');
    if (t.x) parts.push('执行');
    return parts.length ? parts.join('、') : '无';
  };
  const lines = [
    `文件主（u）：${tri(bits.user)}`,
    `同组用户（g）：${tri(bits.group)}`,
    `其他用户（o）：${tri(bits.other)}`,
  ];
  if (bits.setuid) lines.push('setuid：以此文件属主身份运行');
  if (bits.setgid) lines.push('setgid：继承目录/文件的属组');
  if (bits.sticky) lines.push('sticky：仅属主可删除自己的文件（公共目录防删）');
  return lines.join('；');
}

export interface ModePreset {
  octal: string;
  label: string;
  desc: string;
}

/** 常用权限预设。 */
export function commonPresets(): ModePreset[] {
  return [
    { octal: '0644', label: '644', desc: '文件标准：属主读写，其他人只读' },
    { octal: '0755', label: '755', desc: '目录 / 可执行文件标准' },
    { octal: '0600', label: '600', desc: '私有文件：仅属主读写' },
    { octal: '0700', label: '700', desc: '私有目录：仅属主完全访问' },
    { octal: '0400', label: '400', desc: '只读保护：仅属主可读' },
    { octal: '0664', label: '664', desc: '组协作：属主组可写' },
    { octal: '0750', label: '750', desc: '属主完全、组只读、其他禁入' },
    { octal: '0444', label: '444', desc: '全部只读' },
    { octal: '0777', label: '777', desc: '所有人完全访问（慎用）' },
    { octal: '1777', label: '1777', desc: '公共临时目录：带 sticky 位' },
    { octal: '2755', label: '2755', desc: '目录带 setgid：新建文件继承属组' },
    { octal: '4755', label: '4755', desc: '可执行文件带 setuid：以属主身份运行' },
  ];
}
