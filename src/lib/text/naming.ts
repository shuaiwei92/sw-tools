// 命名风格转换：camelCase / PascalCase / snake_case / kebab-case 等互转。无 DOM 依赖。

export type NameStyle = 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant' | 'dot' | 'space';

export interface NameStyleMeta {
  id: NameStyle;
  label: string;
  example: string;
}

export const NAME_STYLES: NameStyleMeta[] = [
  { id: 'camel', label: '小驼峰 camelCase', example: 'userName' },
  { id: 'pascal', label: '大驼峰 PascalCase', example: 'UserName' },
  { id: 'snake', label: '下划线 snake_case', example: 'user_name' },
  { id: 'kebab', label: '短横线 kebab-case', example: 'user-name' },
  { id: 'constant', label: '常量 CONSTANT_CASE', example: 'USER_NAME' },
  { id: 'dot', label: '点分 dot.case', example: 'user.name' },
  { id: 'space', label: '空格 space case', example: 'user name' },
];

/** 把任意风格的标识符切成小写单词数组。 */
export function splitWords(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  return trimmed
    // 在大写字母前断开（处理连续大写时在后一个字母后断，如 HTTPServer -> HTTP, Server）
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/** 按目标风格拼接单词。 */
export function toStyle(words: string[], style: NameStyle): string {
  if (!words.length) return '';
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
  switch (style) {
    case 'camel':
      return words.map((w, i) => (i === 0 ? w : cap(w))).join('');
    case 'pascal':
      return words.map(cap).join('');
    case 'snake':
      return words.join('_');
    case 'kebab':
      return words.join('-');
    case 'constant':
      return words.join('_').toUpperCase();
    case 'dot':
      return words.join('.');
    case 'space':
      return words.join(' ');
  }
}

/** 按行转换：每行作为一个标识符，输出目标风格（空行保留）。 */
export function convertNaming(text: string, style: NameStyle): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return line;
      // 保留行首缩进
      const indent = line.match(/^\s*/)?.[0] ?? '';
      const words = splitWords(line.trim());
      return indent + toStyle(words, style);
    })
    .join('\n');
}

/** 一次算出所有风格（供页面同时展示多种结果）。 */
export function convertAll(text: string): Record<NameStyle, string> {
  const out = {} as Record<NameStyle, string>;
  for (const s of NAME_STYLES) out[s.id] = convertNaming(text, s.id);
  return out;
}
