// curl 命令解析与多语言代码生成，全部纯函数。

export interface CurlRequest {
  method: string;
  url: string;
  headers: [string, string][];
  body?: string;
  form?: [string, string][];
  user?: string;
  referer?: string;
  cookie?: string;
  userAgent?: string;
  compressed: boolean;
  insecure: boolean;
  followRedirects: boolean;
  head: boolean;
  warnings: string[];
}

export type CodeLang = 'fetch' | 'axios' | 'python' | 'go' | 'node' | 'php';

export const CODE_LANGS: { id: CodeLang; name: string; hint: string }[] = [
  { id: 'fetch', name: 'JavaScript fetch', hint: '浏览器 / Node 18+' },
  { id: 'axios', name: 'Axios', hint: '需 npm i axios' },
  { id: 'node', name: 'Node.js', hint: 'node >= 18 全局 fetch' },
  { id: 'python', name: 'Python requests', hint: 'pip install requests' },
  { id: 'go', name: 'Go net/http', hint: '标准库' },
  { id: 'php', name: 'PHP cURL', hint: 'ext-curl' },
];

/** 带值短 flag（用于展开 -sL 这类合并写法）。 */
const VALUE_SHORTS = new Set(['X', 'H', 'd', 'u', 'e', 'A', 'F', 'b', 'o', 'O', 'K', 'T']);
/** 可安全忽略的执行行为 flag。 */
const IGNORED = new Set(['-s', '--silent', '-S', '--show-error', '-v', '--verbose', '-i', '--include']);

/** 展开合并短 flag：-sL → -s -L；-sXPOST → -s -X POST。 */
function expandShorts(tokens: string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    if (t.length > 2 && t[0] === '-' && t[1] !== '-') {
      const chars = t.slice(1);
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        out.push('-' + c);
        if (VALUE_SHORTS.has(c)) {
          const rest = chars.slice(i + 1);
          if (rest) out.push(rest);
          break;
        }
      }
    } else {
      out.push(t);
    }
  }
  return out;
}

/** 按 shell 规则切词：单引号字面 / 双引号转义 / 反斜杠转义 / 续行合并。非法（未闭合引号）返回 null。 */
export function tokenize(input: string): string[] | null {
  const s = input.replace(/\\\r?\n/g, ' ');
  const tokens: string[] = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    while (i < n && /\s/.test(s[i])) i++;
    if (i >= n) break;
    let token = '';
    if (s[i] === "'") {
      i++;
      const start = i;
      while (i < n && s[i] !== "'") i++;
      if (i >= n) return null;
      token = s.slice(start, i);
      i++;
    } else if (s[i] === '"') {
      i++;
      while (i < n && s[i] !== '"') {
        if (s[i] === '\\' && i + 1 < n && '"\\$`'.includes(s[i + 1])) {
          token += s[i + 1];
          i += 2;
        } else {
          token += s[i];
          i++;
        }
      }
      if (i >= n) return null;
      i++;
    } else {
      while (i < n && !/\s/.test(s[i])) {
        if (s[i] === '\\' && i + 1 < n) {
          token += s[i + 1];
          i += 2;
        } else {
          token += s[i];
          i++;
        }
      }
    }
    tokens.push(token);
  }
  return tokens;
}

function appendQuery(url: string, query: string): string {
  if (!query) return url;
  return url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
}

/** 解析 curl 命令；无法提取 URL 或引号未闭合时返回 null。 */
export function parseCurl(input: string): CurlRequest | null {
  const raw = tokenize(input.trim());
  if (!raw || !raw.length) return null;
  const tokens = expandShorts(raw);
  let idx = 0;
  if (tokens[0] === 'curl') idx = 1;

  const req: CurlRequest = {
    method: '',
    url: '',
    headers: [],
    compressed: false,
    insecure: false,
    followRedirects: false,
    head: false,
    warnings: [],
  };
  const dataParts: string[] = [];
  const formParts: [string, string][] = [];
  let explicitMethod = '';
  let forceGet = false;
  let jsonFlag = false;

  const note = (w: string) => {
    if (!req.warnings.includes(w)) req.warnings.push(w);
  };
  const next = (): string | null => (idx < tokens.length ? tokens[idx++] : null);
  const takeValue = (flag: string): string | null => {
    const v = next();
    if (v === null) {
      note(`${flag} 缺少参数值`);
      return null;
    }
    return v;
  };
  const addHeader = (rawHeader: string) => {
    const s = rawHeader.trim();
    if (s.endsWith(';')) {
      // curl 删除请求头的语法：-H "Accept;"
      const k = s.slice(0, -1).trim();
      if (k) req.headers = req.headers.filter(([hk]) => hk.toLowerCase() !== k.toLowerCase());
      else note(`无法解析的请求头「${rawHeader}」`);
      return;
    }
    const ci = s.indexOf(':');
    if (ci === -1) {
      note(`无法解析的请求头「${rawHeader}」`);
      return;
    }
    const k = s.slice(0, ci).trim();
    const v = s.slice(ci + 1).trim();
    if (!k) {
      note(`无法解析的请求头「${rawHeader}」`);
      return;
    }
    if (!v) {
      req.headers = req.headers.filter(([hk]) => hk.toLowerCase() !== k.toLowerCase());
    } else {
      req.headers.push([k, v]);
    }
  };

  while (idx < tokens.length) {
    const flag = tokens[idx++];
    if (!flag.startsWith('-')) {
      if (!req.url) req.url = flag;
      else note(`忽略多余参数「${flag}」`);
      continue;
    }
    switch (flag) {
      case '-X':
      case '--request': {
        const v = takeValue(flag);
        if (v) explicitMethod = v.toUpperCase();
        break;
      }
      case '-H':
      case '--header': {
        const v = takeValue(flag);
        if (v !== null) addHeader(v);
        break;
      }
      case '-d':
      case '--data':
      case '--data-raw':
      case '--data-binary':
      case '--data-ascii': {
        const v = takeValue(flag);
        if (v !== null) {
          if (v.startsWith('@')) note(`${flag} 读取文件内容暂不支持，已忽略`);
          else dataParts.push(v);
        }
        break;
      }
      case '--data-urlencode': {
        const v = takeValue(flag);
        if (v !== null) {
          if (v.startsWith('@')) note('--data-urlencode @文件 暂不支持，已忽略');
          else {
            const eq = v.indexOf('=');
            if (eq === -1) dataParts.push(encodeURIComponent(v));
            else dataParts.push(`${encodeURIComponent(v.slice(0, eq))}=${encodeURIComponent(v.slice(eq + 1))}`);
          }
        }
        break;
      }
      case '--json': {
        const v = takeValue(flag);
        if (v !== null) {
          if (v.startsWith('@')) note('--json @文件 暂不支持，已忽略');
          else {
            dataParts.push(v);
            jsonFlag = true;
            if (!req.headers.some(([k]) => k.toLowerCase() === 'content-type')) {
              req.headers.push(['Content-Type', 'application/json']);
            }
          }
        }
        break;
      }
      case '-F':
      case '--form': {
        const v = takeValue(flag);
        if (v !== null) {
          const eq = v.indexOf('=');
          if (eq === -1) note(`无法解析的表单字段「${v}」`);
          else if (v.slice(eq + 1).startsWith('@')) note('表单文件上传（@文件）暂不支持，已忽略');
          else formParts.push([v.slice(0, eq), v.slice(eq + 1)]);
        }
        break;
      }
      case '-u':
      case '--user': {
        const v = takeValue(flag);
        if (v) req.user = v;
        break;
      }
      case '-A':
      case '--user-agent': {
        const v = takeValue(flag);
        if (v) req.userAgent = v;
        break;
      }
      case '-e':
      case '--referer': {
        const v = takeValue(flag);
        if (v) req.referer = v;
        break;
      }
      case '-b':
      case '--cookie': {
        const v = takeValue(flag);
        if (v) req.cookie = v;
        break;
      }
      case '--url': {
        const v = takeValue(flag);
        if (v) req.url = v;
        break;
      }
      case '-G':
      case '--get':
        forceGet = true;
        break;
      case '-I':
      case '--head':
        req.head = true;
        break;
      case '-k':
      case '--insecure':
        req.insecure = true;
        break;
      case '-L':
      case '--location':
        req.followRedirects = true;
        break;
      case '--compressed':
        req.compressed = true;
        break;
      case '-o':
      case '--output':
      case '-O':
      case '--remote-name':
      case '--max-time':
      case '--connect-timeout':
      case '--retry':
        takeValue(flag);
        note(`${flag} 已忽略（生成代码不含此行为）`);
        break;
      default:
        if (IGNORED.has(flag)) break;
        note(`未识别的参数「${flag}」，已忽略`);
    }
  }

  if (!req.url) return null;
  if (formParts.length) req.form = formParts;
  if (dataParts.length) req.body = dataParts.join('&');

  if (explicitMethod) req.method = explicitMethod;
  else if (req.head) req.method = 'HEAD';
  else if (req.body || req.form || jsonFlag) req.method = 'POST';
  else req.method = 'GET';

  if (forceGet) {
    req.method = 'GET';
    if (req.body) {
      req.url = appendQuery(req.url, req.body);
      req.body = undefined;
    }
  }
  return req;
}

/** 合并显式请求头与 -A/-e/-b/--compressed 推导出的头。 */
function effectiveHeaders(req: CurlRequest): [string, string][] {
  const headers = [...req.headers];
  if (req.userAgent && !headers.some(([k]) => k.toLowerCase() === 'user-agent')) headers.push(['User-Agent', req.userAgent]);
  if (req.referer && !headers.some(([k]) => k.toLowerCase() === 'referer')) headers.push(['Referer', req.referer]);
  if (req.cookie && !headers.some(([k]) => k.toLowerCase() === 'cookie')) headers.push(['Cookie', req.cookie]);
  if (req.compressed && !headers.some(([k]) => k.toLowerCase() === 'accept-encoding')) headers.push(['Accept-Encoding', 'gzip, deflate']);
  return headers;
}

/** 尝试把 body 解析为 JSON（成功返回美化后的对象文本）。 */
function prettyJsonBody(body: string): string | null {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return null;
  }
}

function jsString(s: string): string {
  return JSON.stringify(s);
}

function headersObject(req: CurlRequest, indent: string): string {
  const headers = effectiveHeaders(req);
  if (!headers.length) return '{}';
  const entries = headers.map(([k, v]) => `${indent}  ${jsString(k)}: ${jsString(v)}`);
  return `{\n${entries.join(',\n')},\n${indent}}`;
}

/** Basic 认证的 [user, pass] 拆分。 */
function splitUser(user: string): [string, string] {
  const i = user.indexOf(':');
  return i === -1 ? [user, ''] : [user.slice(0, i), user.slice(i + 1)];
}

/** 生成目标语言代码。 */
export function toCode(req: CurlRequest, lang: CodeLang): string {
  switch (lang) {
    case 'fetch':
      return genFetch(req);
    case 'axios':
      return genAxios(req);
    case 'node':
      return genNode(req);
    case 'python':
      return genPython(req);
    case 'go':
      return genGo(req);
    case 'php':
      return genPhp(req);
  }
}

function genFetch(req: CurlRequest): string {
  const lines: string[] = [];
  lines.push(`const url = ${jsString(req.url)};`);
  if (req.form?.length) {
    lines.push('');
    lines.push('const form = new FormData();');
    for (const [k, v] of req.form) lines.push(`form.append(${jsString(k)}, ${jsString(v)});`);
  }
  lines.push('');
  lines.push('const options = {');
  lines.push(`  method: ${jsString(req.method)},`);
  const headers = effectiveHeaders(req);
  if (headers.length) {
    lines.push('  headers: {');
    for (const [k, v] of headers) lines.push(`    ${jsString(k)}: ${jsString(v)},`);
    lines.push('  },');
  }
  if (req.body) {
    const pretty = prettyJsonBody(req.body);
    if (pretty) lines.push(`  body: JSON.stringify(${pretty}),`);
    else lines.push(`  body: ${jsString(req.body)},`);
  } else if (req.form?.length) {
    lines.push('  body: form,');
  }
  lines.push('};');
  lines.push('');
  lines.push('fetch(url, options)');
  lines.push('  .then((res) => res.text())');
  lines.push('  .then((text) => console.log(text))');
  lines.push('  .catch((err) => console.error(err));');
  if (req.insecure) lines.push('', '// 注：curl 的 -k（跳过证书校验）在浏览器 fetch 中无对应能力');
  return lines.join('\n');
}

function genAxios(req: CurlRequest): string {
  const lines: string[] = [];
  const headers = effectiveHeaders(req);
  lines.push('const res = await axios({');
  lines.push(`  method: ${jsString(req.method.toLowerCase())},`);
  lines.push(`  url: ${jsString(req.url)},`);
  if (headers.length) {
    lines.push('  headers: {');
    for (const [k, v] of headers) lines.push(`    ${jsString(k)}: ${jsString(v)},`);
    lines.push('  },');
  }
  if (req.user) {
    const [u, p] = splitUser(req.user);
    lines.push('  auth: {');
    lines.push(`    username: ${jsString(u)},`);
    lines.push(`    password: ${jsString(p)},`);
    lines.push('  },');
  }
  if (req.body) {
    const pretty = prettyJsonBody(req.body);
    if (pretty) lines.push(`  data: ${pretty},`);
    else lines.push(`  data: ${jsString(req.body)},`);
  }
  lines.push('});');
  lines.push('');
  lines.push('console.log(res.status, res.data);');
  if (req.insecure) lines.push('', '// 注：Node 环境可用 httpsAgent 关闭证书校验，浏览器端无对应能力');
  return lines.join('\n');
}

function genNode(req: CurlRequest): string {
  const lines: string[] = ['(async () => {'];
  lines.push(`  const url = ${jsString(req.url)};`);
  if (req.form?.length) {
    lines.push('  const form = new FormData();');
    for (const [k, v] of req.form) lines.push(`  form.append(${jsString(k)}, ${jsString(v)});`);
  }
  lines.push('');
  lines.push('  const res = await fetch(url, {');
  lines.push(`    method: ${jsString(req.method)},`);
  const headers = effectiveHeaders(req);
  if (headers.length) {
    lines.push('    headers: {');
    for (const [k, v] of headers) lines.push(`      ${jsString(k)}: ${jsString(v)},`);
    lines.push('    },');
  }
  if (req.body) {
    const pretty = prettyJsonBody(req.body);
    if (pretty) lines.push(`    body: JSON.stringify(${pretty}),`);
    else lines.push(`    body: ${jsString(req.body)},`);
  } else if (req.form?.length) {
    lines.push('    body: form,');
  }
  lines.push('  });');
  lines.push('  const text = await res.text();');
  lines.push('  console.log(res.status, text);');
  lines.push('})();');
  if (req.insecure) lines.push('', '// 注：curl 的 -k（跳过证书校验）在 Node 中可用 undici Agent 关闭');
  return lines.join('\n');
}

function genPython(req: CurlRequest): string {
  const lines: string[] = [];
  lines.push('import requests');
  lines.push('');
  lines.push(`url = ${pyString(req.url)}`);
  const headers = effectiveHeaders(req);
  if (headers.length) {
    lines.push('headers = {');
    for (const [k, v] of headers) lines.push(`    ${pyString(k)}: ${pyString(v)},`);
    lines.push('}');
  }
  if (req.body) lines.push(`data = ${pyString(req.body)}`);
  if (req.form?.length) {
    lines.push('data = {');
    for (const [k, v] of req.form) lines.push(`    ${pyString(k)}: ${pyString(v)},`);
    lines.push('}');
    lines.push('# 注：-F 为 multipart/form-data 语义，requests 中改用 files= 上传');
  }
  const args: string[] = [pyString(req.method), 'url'];
  if (headers.length) args.push('headers=headers');
  if (req.body || req.form?.length) args.push('data=data');
  if (req.user) {
    const [u, p] = splitUser(req.user);
    args.push(`auth=(${pyString(u)}, ${pyString(p)})`);
  }
  lines.push('');
  lines.push(`resp = requests.request(${args.join(', ')})`);
  lines.push('print(resp.status_code)');
  lines.push('print(resp.text)');
  return lines.join('\n');
}

function pyString(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function genGo(req: CurlRequest): string {
  const lines: string[] = [];
  lines.push('package main');
  lines.push('');
  lines.push('import (');
  lines.push('\t"fmt"');
  lines.push('\t"io"');
  lines.push('\t"net/http"');
  if (req.body || req.form?.length) lines.push('\t"strings"');
  if (req.insecure) lines.push('\t"crypto/tls"');
  lines.push(')');
  lines.push('');
  lines.push('func main() {');
  lines.push(`\turl := ${goString(req.url)}`);
  if (req.body) lines.push(`\tpayload := strings.NewReader(${goString(req.body)})`);
  else if (req.form?.length) lines.push('\tpayload := strings.NewReader("")');
  lines.push('');
  if (req.body || req.form?.length) lines.push(`\treq, _ := http.NewRequest(${goString(req.method)}, url, payload)`);
  else lines.push(`\treq, _ := http.NewRequest(${goString(req.method)}, url, nil)`);
  for (const [k, v] of effectiveHeaders(req)) lines.push(`\treq.Header.Set(${goString(k)}, ${goString(v)})`);
  if (req.user) {
    const [u, p] = splitUser(req.user);
    lines.push(`\treq.SetBasicAuth(${goString(u)}, ${goString(p)})`);
  }
  if (req.form?.length) {
    lines.push('\t// 注：-F 为 multipart 语义，需改用 mime/multipart.Writer 构建请求体');
  }
  lines.push('');
  if (req.insecure) {
    lines.push('\tclient := &http.Client{');
    lines.push('\t\tTransport: &http.Transport{');
    lines.push('\t\t\tTLSClientConfig: &tls.Config{InsecureSkipVerify: true},');
    lines.push('\t\t},');
    lines.push('\t}');
    lines.push('\tresp, err := client.Do(req)');
  } else {
    lines.push('\tresp, err := http.DefaultClient.Do(req)');
  }
  lines.push('\tif err != nil {');
  lines.push('\t\tfmt.Println(err)');
  lines.push('\t\treturn');
  lines.push('\t}');
  lines.push('\tdefer resp.Body.Close()');
  lines.push('\tbody, _ := io.ReadAll(resp.Body)');
  lines.push('\tfmt.Println(resp.Status)');
  lines.push('\tfmt.Println(string(body))');
  lines.push('}');
  return lines.join('\n');
}

function goString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;
}

function genPhp(req: CurlRequest): string {
  const lines: string[] = [];
  lines.push('<?php');
  lines.push('');
  lines.push('$ch = curl_init();');
  lines.push(`curl_setopt($ch, CURLOPT_URL, ${phpString(req.url)});`);
  lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, ${phpString(req.method)});`);
  lines.push('curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);');
  const headers = effectiveHeaders(req).map(([k, v]) => `${k}: ${v}`);
  if (headers.length) {
    lines.push('curl_setopt($ch, CURLOPT_HTTPHEADER, [');
    for (const h of headers) lines.push(`    ${phpString(h)},`);
    lines.push(']);');
  }
  if (req.body) lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, ${phpString(req.body)});`);
  if (req.form?.length) {
    lines.push('// 注：-F 为 multipart 语义，需改用 CURLFile 上传');
  }
  if (req.user) lines.push(`curl_setopt($ch, CURLOPT_USERPWD, ${phpString(req.user)});`);
  if (req.referer) lines.push(`curl_setopt($ch, CURLOPT_REFERER, ${phpString(req.referer)});`);
  if (req.cookie) lines.push(`curl_setopt($ch, CURLOPT_COOKIE, ${phpString(req.cookie)});`);
  if (req.userAgent) lines.push(`curl_setopt($ch, CURLOPT_USERAGENT, ${phpString(req.userAgent)});`);
  if (req.followRedirects) lines.push('curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);');
  if (req.compressed) lines.push("curl_setopt($ch, CURLOPT_ENCODING, '');");
  if (req.insecure) {
    lines.push('curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);');
    lines.push('curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);');
  }
  lines.push('$response = curl_exec($ch);');
  lines.push('curl_close($ch);');
  lines.push('echo $response;');
  return lines.join('\n');
}

function phpString(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
