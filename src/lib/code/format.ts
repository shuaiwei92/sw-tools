// 代码格式化 / 压缩库。
// 格式化用 js-beautify（npm 依赖，纯 JS 无原生模块，Astro/Vite 可直接打包）；
// 压缩为手写的字符串安全扫描器：尊重字符串 / 模板字面量 / 注释 / 正则，只去注释与多余空白，不改变语义。

import beautify from 'js-beautify';

export type FormatLang = 'js' | 'css' | 'html';

/** 格式化（美化）。indentSize 为空格数，传 '\t' 表示 Tab 缩进。 */
export function formatCode(src: string, lang: FormatLang, indentSize: number | '\t' = 2): string {
  const indentChar = indentSize === '\t' ? '\t' : ' ';
  const indentSizeOpt = indentSize === '\t' ? 1 : indentSize;
  const opts = { indent_size: indentSizeOpt, indent_char: indentChar, end_with_newline: false };
  if (!src.trim()) return '';
  try {
    if (lang === 'js') return beautify.js(src, { ...opts, brace_style: 'collapse,preserve-inline' });
    if (lang === 'css') return beautify.css(src, { ...opts, newline_between_rules: true });
    return beautify.html(src, { ...opts, indent_inner_html: true, extra_liners: [] });
  } catch {
    return src; // 解析失败时原样返回，不破坏用户输入
  }
}

/** 压缩（去注释 + 收空白，字符串内容原样保留）。 */
export function minifyCode(src: string, lang: FormatLang): string {
  if (!src.trim()) return '';
  try {
    if (lang === 'js') return minifyJs(src);
    if (lang === 'css') return minifyCss(src);
    return minifyHtml(src);
  } catch {
    return src;
  }
}

export interface CodeStats {
  lines: number;
  chars: number;
  /** UTF-8 字节数 */
  bytes: number;
}

export function codeStats(src: string): CodeStats {
  return {
    lines: src ? src.split('\n').length : 0,
    chars: src.length,
    bytes: new TextEncoder().encode(src).length,
  };
}

// ── JS 压缩：逐字符状态机 ──

type JsState = 'code' | 'single' | 'double' | 'template' | 'regex';

/** 判断 / 是正则还是除号：看上一个有意义的 token。 */
function regexAllowedAfter(prevSig: string): boolean {
  if (!prevSig) return true;
  const last = prevSig.slice(-1);
  if (last === ')' || last === ']') return false; // ) ] 后多为除号
  if (/[A-Za-z_$\d]/.test(last)) {
    // 标识符/数字后：仅关键字可接正则，其余为除号
    return /\b(return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/.test(prevSig);
  }
  return true; // ( , = : [ ! & | ? { ; + - * % ^ ~ < > } 之后均可接正则
}

/**
 * JS 压缩：去注释 + 收空白。
 * 安全策略：含换行的空白一律保留换行（防止 ASI 语义变化）；其余空白按上下文决定保留单空格或删除
 * （闭括号/标点前、开括号后、函数调用的 ( 前、) 后的 { 前可删）。字符串 / 模板 / 正则内容原样保留。
 */
export function minifyJs(src: string): string {
  let out = '';
  let state: JsState = 'code';
  let prevSig = ''; // 最近输出的有意义字符（滚动窗口，用于正则/除号判别）
  let wsPending = false; // 有未决空白（含被删除的注释）
  let wsNL = false; // 未决空白中是否含换行
  let regexClass = false; // 正则字符类内（/ 不结束正则）

  const flushWs = (nc: string) => {
    if (!wsPending) return;
    wsPending = false;
    const hadNL = wsNL;
    wsNL = false;
    if (!out || !nc) return;
    if (hadNL) { out += '\n'; return; } // 含换行：永远保留换行，保证 ASI 安全
    const prev = out.slice(-1);
    if (/[)\]},;:.]/.test(nc)) return; // 闭括号/标点前不留空格
    if (/[([{]/.test(prev)) return; // 开括号后不留空格
    if (nc === '(' && /[A-Za-z_$\d)\]}]/.test(prev)) return; // 调用/关键字后的 (
    if (nc === '{' && /[)\]}]/.test(prev)) return; // ) 后的 {
    out += ' ';
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1] ?? '';
    if (state === 'code') {
      if (/\s/.test(c)) {
        if (c === '\n') wsNL = true;
        wsPending = true;
        continue;
      }
      if (c === '/' && next === '/') {
        // 行注释：跳到行尾（换行符留到下一轮处理以标记 wsNL）
        const nl = src.indexOf('\n', i);
        i = nl === -1 ? src.length - 1 : nl - 1;
        wsPending = true;
        continue;
      }
      if (c === '/' && next === '*') {
        const end = src.indexOf('*/', i + 2);
        i = end === -1 ? src.length : end + 1;
        wsPending = true;
        continue;
      }
      if (c === "'") { flushWs(c); state = 'single'; out += c; prevSig += c; continue; }
      if (c === '"') { flushWs(c); state = 'double'; out += c; prevSig += c; continue; }
      if (c === '`') { flushWs(c); state = 'template'; out += c; prevSig += c; continue; }
      if (c === '/' && regexAllowedAfter(prevSig)) { flushWs(c); state = 'regex'; regexClass = false; out += c; prevSig += c; continue; }
      flushWs(c);
      out += c;
      prevSig = (prevSig + c).slice(-24);
      continue;
    }
    // 字符串 / 模板 / 正则：内容原样输出
    out += c;
    prevSig = (prevSig + c).slice(-24);
    if (state === 'single' || state === 'double') {
      if (c === '\\') { out += next; i++; }
      else if ((state === 'single' && c === "'") || (state === 'double' && c === '"')) state = 'code';
    } else if (state === 'template') {
      if (c === '\\') { out += next; i++; }
      else if (c === '`') state = 'code';
    } else {
      // 正则：处理转义与字符类
      if (c === '\\') { out += next; i++; }
      else if (c === '[') regexClass = true;
      else if (c === ']') regexClass = false;
      else if (c === '/' && !regexClass) state = 'code';
    }
  }
  // 行尾空白清理 + 连续空行折叠
  return out
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── CSS 压缩 ──

export function minifyCss(src: string): string {
  let out = '';
  let state: 'code' | 'comment' | 'single' | 'double' = 'code';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1] ?? '';
    if (state === 'comment') {
      if (c === '*' && next === '/') { state = 'code'; i++; }
      continue;
    }
    if (state === 'single' || state === 'double') {
      out += c;
      if (c === '\\') { out += next; i++; }
      else if ((state === 'single' && c === "'") || (state === 'double' && c === '"')) state = 'code';
      continue;
    }
    if (c === '/' && next === '*') { state = 'comment'; i++; continue; }
    if (c === "'") { state = 'single'; out += c; continue; }
    if (c === '"') { state = 'double'; out += c; continue; }
    if (c === ';') {
      // 规则内最后一个声明后的分号可删（容忍 ; 与 } 之间有空白）
      let j = i + 1;
      while (j < src.length && /\s/.test(src[j])) j++;
      if (src[j] === '}') continue;
    }
    if (/\s/.test(c)) {
      let j = i;
      let hasNL = false;
      while (j < src.length && /\s/.test(src[j])) { if (src[j] === '\n') hasNL = true; j++; }
      i = j - 1;
      const nc = src[i + 1] ?? '';
      // 选择器之间的空白（如 "a > b"）不能删；其余空白一律可去
      const keepSpace = nc === '>' || nc === '+' || nc === '~' || nc === '=';
      const prevCh = out.slice(-1);
      const prevKeeps = prevCh === '>' || prevCh === '+' || prevCh === '~' || prevCh === '=' || prevCh === '|';
      if ((keepSpace || prevKeeps) && out && nc) out += ' ';
      continue;
    }
    out += c;
  }
  return out.trim();
}

// ── HTML 压缩 ──

const RAW_TEXT_TAGS = new Set(['pre', 'textarea', 'script', 'style']);

export function minifyHtml(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    // 标签起点
    const lt = src.indexOf('<', i);
    if (lt === -1) { out += collapseText(src.slice(i)); break; }
    if (lt > i) out += collapseText(src.slice(i, lt));
    // 注释（保留条件注释与 SSI）
    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      const comment = src.slice(lt, end === -1 ? src.length : end + 3);
      if (comment.startsWith('<!--[if') || /^<!--#/.test(comment)) out += comment;
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    const gt = src.indexOf('>', lt);
    if (gt === -1) { out += src.slice(lt); break; }
    let tag = src.slice(lt, gt + 1);
    // 标签内属性间多余空白收成一个空格
    tag = tag.replace(/\s+/g, ' ').replace(/\s+>/, '>').replace(/^<\s+/, '<');
    out += tag;
    i = gt + 1;
    // 原始文本元素内部原样保留
    const m = /^<\s*([a-zA-Z][\w-]*)/.exec(tag);
    if (m && RAW_TEXT_TAGS.has(m[1].toLowerCase())) {
      const closeIdx = src.toLowerCase().indexOf(`</${m[1].toLowerCase()}`, i);
      const rawEnd = closeIdx === -1 ? src.length : closeIdx;
      out += src.slice(i, rawEnd);
      i = rawEnd;
    }
  }
  return out.trim();
}

/** 文本节点：折叠连续空白为单空格；纯空白文本节点在两个标签之间时整体删除。 */
function collapseText(s: string): string {
  const collapsed = s.replace(/\s+/g, ' ');
  return collapsed.trim() === '' ? '' : collapsed;
}
