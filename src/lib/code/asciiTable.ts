// ASCII / 扩展 Latin-1 码表与常用键盘键值数据（静态速查表数据源）。

export interface AsciiEntry {
  dec: number;
  hex: string;
  bin: string;
  /** 可打印字符；控制字符为 '' */
  char: string;
  /** 控制字符的助记名或字符分类说明 */
  desc: string;
  group: '控制字符' | '可打印字符';
}

const CTRL_NAMES: Record<number, string> = {
  0: 'NUL 空字符',
  1: 'SOH 标题开始',
  2: 'STX 正文开始',
  3: 'ETX 正文结束',
  4: 'EOT 传输结束',
  5: 'ENQ 请求',
  6: 'ACK 确认',
  7: 'BEL 响铃',
  8: 'BS 退格',
  9: 'HT 水平制表符',
  10: 'LF 换行',
  11: 'VT 垂直制表符',
  12: 'FF 换页',
  13: 'CR 回车',
  14: 'SO 移出',
  15: 'SI 移入',
  16: 'DLE 转义',
  17: 'DC1 设备控制1',
  18: 'DC2 设备控制2',
  19: 'DC3 设备控制3',
  20: 'DC4 设备控制4',
  21: 'NAK 否定确认',
  22: 'SYN 同步空闲',
  23: 'ETB 传输块结束',
  24: 'CAN 取消',
  25: 'EM 介质结束',
  26: 'SUB 替换',
  27: 'ESC 转义',
  28: 'FS 文件分隔',
  29: 'GS 组分隔',
  30: 'RS 记录分隔',
  31: 'US 单元分隔',
  32: 'Space 空格',
  127: 'DEL 删除',
};

/** 常见可打印字符的补充说明。 */
const PRINT_HINTS: Record<number, string> = {
  9: '制表符 Tab',
  32: '空格',
  34: '双引号',
  39: '单引号',
  92: '反斜杠',
  96: '反引号',
};

function build(): AsciiEntry[] {
  const list: AsciiEntry[] = [];
  for (let i = 0; i <= 255; i++) {
    const isCtrl = i < 32 || i === 127;
    const char = i >= 32 && i !== 127 ? String.fromCharCode(i) : '';
    list.push({
      dec: i,
      hex: i.toString(16).toUpperCase().padStart(2, '0'),
      bin: i.toString(2).padStart(8, '0'),
      char,
      desc: isCtrl ? CTRL_NAMES[i] ?? '' : PRINT_HINTS[i] ?? '',
      group: isCtrl ? '控制字符' : '可打印字符',
    });
  }
  return list;
}

export const ASCII_TABLE: AsciiEntry[] = build();

/** 常用键盘键值（KeyboardEvent.code 速查）。 */
export interface KeyEntry {
  code: string;
  key: string;
  note: string;
}

export const KEY_CODES: KeyEntry[] = [
  { code: 'Backspace', key: 'Backspace', note: '退格' },
  { code: 'Tab', key: 'Tab', note: '制表符' },
  { code: 'Enter', key: 'Enter', note: '回车' },
  { code: 'ShiftLeft', key: 'Shift', note: '左 Shift' },
  { code: 'ShiftRight', key: 'Shift', note: '右 Shift' },
  { code: 'ControlLeft', key: 'Control', note: '左 Ctrl' },
  { code: 'ControlRight', key: 'Control', note: '右 Ctrl' },
  { code: 'AltLeft', key: 'Alt', note: '左 Alt' },
  { code: 'AltRight', key: 'Alt', note: '右 Alt（部分键盘 AltGr）' },
  { code: 'Space', key: ' ', note: '空格' },
  { code: 'Escape', key: 'Escape', note: 'Esc' },
  { code: 'ArrowUp', key: 'ArrowUp', note: '上' },
  { code: 'ArrowDown', key: 'ArrowDown', note: '下' },
  { code: 'ArrowLeft', key: 'ArrowLeft', note: '左' },
  { code: 'ArrowRight', key: 'ArrowRight', note: '右' },
  { code: 'Digit0', key: '0', note: '主键区 0' },
  { code: 'Digit9', key: '9', note: '主键区 9' },
  { code: 'KeyA', key: 'a', note: '字母 A' },
  { code: 'KeyZ', key: 'z', note: '字母 Z' },
  { code: 'Numpad0', key: '0', note: '小键盘 0' },
  { code: 'NumpadEnter', key: 'Enter', note: '小键盘回车' },
  { code: 'F1', key: 'F1', note: '功能键' },
  { code: 'F12', key: 'F12', note: '功能键' },
  { code: 'Semicolon', key: ';', note: '分号' },
  { code: 'Equal', key: '=', note: '等号' },
  { code: 'Minus', key: '-', note: '减号' },
  { code: 'BracketLeft', key: '[', note: '左方括号' },
  { code: 'Quote', key: "'", note: '单引号键' },
];

/** 按下键盘实时显示键值（页面探测框用）。 */
export function describeKey(e: KeyboardEvent): { code: string; key: string; keyCode: number } {
  return { code: e.code, key: e.key, keyCode: e.keyCode };
}
