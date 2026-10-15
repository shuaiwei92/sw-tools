// Markdown ↔ HTML 互转（marked 渲染 + DOMPurify 消毒 + turndown 反向转换）。仅客户端使用。

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';

marked.setOptions({ gfm: true, breaks: true });

/** Markdown → 安全 HTML（GFM + 软换行，脚本/事件属性已剥离）。 */
export function mdToHtml(md: string): string {
  if (!md.trim()) return '';
  const raw = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] });
}

/** HTML → Markdown（ATX 标题 + 围栏代码块）。 */
export function htmlToMd(html: string): string {
  if (!html.trim()) return '';
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
  return td.turndown(html);
}
