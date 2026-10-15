// 摩斯电码：文本 ↔ 摩斯码互转，并生成播放时序（供声音 / 灯光播放）。

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
  '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', $: '...-..-', '@': '.--.-.',
};

const REVERSE: Record<string, string> = {};
for (const [k, v] of Object.entries(MORSE)) REVERSE[v] = k;

/** 一个「点」的时长（毫秒），播放时序按国际通用比例推导。 */
export const UNIT_MS = 120;

/** 文本 → 摩斯码（字母空格分隔，单词以 / 分隔）。中文等无对应字符抛错。 */
export function textToMorse(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words
    .map((word) =>
      Array.from(word.toUpperCase())
        .map((ch) => {
          const code = MORSE[ch];
          if (!code) throw new Error(`字符「${ch}」没有对应的摩斯码`);
          return code;
        })
        .join(' ')
    )
    .join(' / ');
}

/** 摩斯码 → 文本（支持 . - 字母分隔、/ 或 | 词分隔；未知序列输出 ?）。 */
export function morseToText(morse: string): string {
  return morse
    .trim()
    .split(/\s*\/\s*|\s*\|\s*/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((code) => {
          const ch = REVERSE[code];
          if (!ch) throw new Error(`摩斯序列「${code}」无法识别`);
          return ch;
        })
        .join('')
    )
    .join(' ');
}

export interface MorseTiming {
  /** true = 有声 / 亮灯，false = 静默间隔 */
  on: boolean;
  ms: number;
}

/** 生成摩斯码播放时序：点=1 单位，划=3 单位，元素间隔=1，字母间隔=3，单词间隔=7。 */
export function morseTimings(morse: string): MorseTiming[] {
  const events: MorseTiming[] = [];
  const words = morse.trim().split(/\s*\/\s*/);
  words.forEach((word, wi) => {
    if (wi > 0) events.push({ on: false, ms: UNIT_MS * 7 });
    word
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .forEach((code, li) => {
        if (li > 0) events.push({ on: false, ms: UNIT_MS * 3 });
        for (const sym of code) {
          events.push({ on: true, ms: sym === '.' ? UNIT_MS : UNIT_MS * 3 });
          events.push({ on: false, ms: UNIT_MS });
        }
        // 每个字母末尾已有一个元素间隔，此处不重复添加
      });
  });
  return events;
}
