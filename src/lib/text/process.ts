// 文本处理：一组纯函数式的文本变换，供「文本处理」工具页面调用。
// 所有函数：string -> string（count 类返回统计文本）。无 DOM 依赖，可单测。

export type TextOp =
  | 'upper'
  | 'lower'
  | 'title'
  | 'trimLines'
  | 'removeEmpty'
  | 'sortAsc'
  | 'sortDesc'
  | 'dedup'
  | 'reverseLines'
  | 'reverseChars'
  | 'collapseSpace'
  | 'urlEncode'
  | 'urlDecode'
  | 'htmlEscape'
  | 'htmlUnescape'
  | 'count';

export interface TextOpMeta {
  id: TextOp;
  label: string;
}

export const TEXT_OPS: TextOpMeta[] = [
  { id: 'upper', label: '转大写' },
  { id: 'lower', label: '转小写' },
  { id: 'title', label: '首字母大写' },
  { id: 'trimLines', label: '行首尾去空白' },
  { id: 'removeEmpty', label: '删除空行' },
  { id: 'sortAsc', label: '行排序（升序）' },
  { id: 'sortDesc', label: '行排序（降序）' },
  { id: 'dedup', label: '行去重（保序）' },
  { id: 'reverseLines', label: '行逆序' },
  { id: 'reverseChars', label: '全文反转' },
  { id: 'collapseSpace', label: '压缩空白' },
  { id: 'urlEncode', label: 'URL 编码' },
  { id: 'urlDecode', label: 'URL 解码' },
  { id: 'htmlEscape', label: 'HTML 转义' },
  { id: 'htmlUnescape', label: 'HTML 反转义' },
  { id: 'count', label: '字数 / 行数统计' },
];

function lines(text: string): string[] {
  return text.split(/\r?\n/);
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}
function htmlUnescape(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function processText(text: string, op: TextOp): string {
  const ls = lines(text);
  switch (op) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    case 'trimLines':
      return ls.map((l) => l.trim()).join('\n');
    case 'removeEmpty':
      return ls.filter((l) => l.trim().length > 0).join('\n');
    case 'sortAsc':
      return [...ls].sort((a, b) => a.localeCompare(b)).join('\n');
    case 'sortDesc':
      return [...ls].sort((a, b) => b.localeCompare(a)).join('\n');
    case 'dedup':
      return [...new Set(ls)].join('\n');
    case 'reverseLines':
      return [...ls].reverse().join('\n');
    case 'reverseChars':
      return [...text].reverse().join('');
    case 'collapseSpace':
      return text.replace(/\s+/g, ' ').trim();
    case 'urlEncode':
      return encodeURIComponent(text);
    case 'urlDecode':
      try {
        return decodeURIComponent(text);
      } catch {
        throw new Error('URL 解码失败：包含非法转义序列');
      }
    case 'htmlEscape':
      return htmlEscape(text);
    case 'htmlUnescape':
      return htmlUnescape(text);
    case 'count': {
      const chars = text.length;
      const nonSpace = (text.replace(/\s/g, '').length);
      const words = (text.trim().match(/\S+/g) || []).length;
      const lineCount = text === '' ? 0 : ls.length;
      return [
        `字符数（含空白）: ${chars}`,
        `字符数（不含空白）: ${nonSpace}`,
        `词数: ${words}`,
        `行数: ${lineCount}`,
      ].join('\n');
    }
    default:
      return text;
  }
}
