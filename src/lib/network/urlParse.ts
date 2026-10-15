// URL 解析纯函数库：把任意 URL 拆成结构化部件与 query 参数表。基于 WHATWG URL（浏览器与 Node 均内置）。

export interface QueryParam {
  key: string;
  value: string;
  /** 键和值是否发生过百分号编码（用于提示"已自动解码"） */
  wasEncoded: boolean;
}
export interface UrlSection {
  label: string;
  value: string;
  note?: string;
}
export interface ParsedUrl {
  input: string;
  href: string;
  protocol: string;
  username: string;
  password: string;
  host: string;
  hostname: string;
  port: string;
  /** 该协议的默认端口（http→80，https→443，ws→80，wss→443，ftp→21） */
  defaultPort: string | null;
  origin: string;
  pathname: string;
  /** pathname 分段（已逐段解码，空串表示首尾斜杠） */
  pathSegments: string[];
  search: string;
  params: QueryParam[];
  hash: string;
  isHttps: boolean;
  isLocalhost: boolean;
  /** 是否为 IPv4 字面量 */
  isIPv4: boolean;
  /** 是否为 IPv6 字面量（hostname 形如 [::1]） */
  isIPv6: boolean;
  /** 是否内网 / 回环 / 保留地址（IPv4） */
  isPrivateIPv4: boolean;
  /** 协议是否常见 */
  knownProtocol: boolean;
}

const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80', 'https:': '443', 'ws:': '80', 'wss:': '443', 'ftp:': '21', 'ssh:': '22',
};
const KNOWN_PROTOCOLS = new Set([...Object.keys(DEFAULT_PORTS), 'file:', 'mailto:', 'tel:', 'data:']);

function isIPv4Literal(h: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  return !!m && m.slice(1).every((x) => Number(x) <= 255);
}
function isIPv6Literal(h: string): boolean {
  return h.startsWith('[') && h.endsWith(']');
}
function isPrivateIPv4(h: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254) || (a === 0) || (a === 100 && b >= 64 && b <= 127);
}

/** 无协议输入时按 https 尝试补全；整体无法解析返回 null。 */
export function parseUrl(input: string): ParsedUrl | null {
  const raw = input.trim();
  if (!raw) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || /^(mailto|tel|data|file|urn|magnet):/i.test(raw);
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    if (hasScheme) return null; // 有协议但仍无法解析，不做补全猜测
    try {
      u = new URL('https://' + raw);
    } catch {
      return null;
    }
  }
  const params: QueryParam[] = [];
  const rawQuery = u.search.startsWith('?') ? u.search.slice(1) : '';
  if (rawQuery) {
    for (const pair of rawQuery.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const rk = eq === -1 ? pair : pair.slice(0, eq);
      const rv = eq === -1 ? '' : pair.slice(eq + 1);
      const dec = (s: string) => {
        try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch { return s; }
      };
      params.push({ key: dec(rk), value: dec(rv), wasEncoded: dec(rk) !== rk || dec(rv) !== rv });
    }
  }
  const hostname = u.hostname;
  // 分段：去掉首段空串与末尾斜杠产生的空段
  const rawSegs = u.pathname.split('/').slice(1);
  if (rawSegs.length && rawSegs[rawSegs.length - 1] === '') rawSegs.pop();
  return {
    input: raw,
    href: u.href,
    protocol: u.protocol,
    username: u.username,
    password: u.password,
    host: u.host,
    hostname,
    port: u.port,
    defaultPort: DEFAULT_PORTS[u.protocol] ?? null,
    origin: u.origin,
    pathname: u.pathname,
    pathSegments: rawSegs.map((s) => {
      try { return decodeURIComponent(s); } catch { return s; }
    }),
    search: u.search,
    params,
    hash: u.hash,
    isHttps: u.protocol === 'https:',
    isLocalhost: hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1',
    isIPv4: isIPv4Literal(hostname),
    isIPv6: isIPv6Literal(hostname),
    isPrivateIPv4: isPrivateIPv4(hostname),
    knownProtocol: KNOWN_PROTOCOLS.has(u.protocol),
  };
}

/** 组织成"分段展示"用的小节（端口含默认端口提示）。 */
export function urlSections(p: ParsedUrl): UrlSection[] {
  const out: UrlSection[] = [];
  out.push({ label: '协议 Protocol', value: p.protocol, note: p.knownProtocol ? undefined : '非常见协议' });
  if (p.username || p.password) {
    out.push({ label: '认证 Userinfo', value: `${p.username}${p.password ? ':' + '•'.repeat(p.password.length) : ''}`, note: 'URL 中包含凭据，请注意保密' });
  }
  out.push({ label: '主机 Host', value: p.host });
  if (p.port) out.push({ label: '端口 Port', value: p.port, note: p.defaultPort && p.port === p.defaultPort ? '默认端口，可省略' : undefined });
  else if (p.defaultPort) out.push({ label: '端口 Port', value: p.defaultPort, note: '默认端口，URL 中已省略' });
  out.push({ label: '域名 Hostname', value: p.hostname });
  out.push({ label: '路径 Path', value: p.pathname });
  if (p.search) out.push({ label: '查询 Query', value: p.search, note: `${p.params.length} 个参数` });
  if (p.hash) out.push({ label: '片段 Hash', value: p.hash });
  const tags: string[] = [];
  if (p.isHttps) tags.push('HTTPS 加密');
  if (p.isLocalhost) tags.push('本机地址');
  if (p.isIPv4) tags.push('IPv4 字面量');
  if (p.isIPv6) tags.push('IPv6 字面量');
  if (p.isPrivateIPv4) tags.push('内网 / 保留地址');
  if (tags.length) out.push({ label: '识别标签', value: tags.join(' · ') });
  return out;
}
