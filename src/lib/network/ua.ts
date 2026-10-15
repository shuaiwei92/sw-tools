// User-Agent 解析（纯函数，零依赖，内置常见浏览器 / 系统 / 引擎 / 爬虫规则）。

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot';

export interface UAResult {
  browser: string;
  browserVersion: string;
  engine: string;
  os: string;
  osVersion: string;
  deviceType: DeviceType;
  isBot: boolean;
  arch: string;
  raw: string;
}

const BOTS = /bot|crawler|spider|scrapy|curl|wget|python-requests|httpclient|facebookexternalhit|slurp|ia_archiver/i;

/** 注意：顺序即优先级——越特殊的放前面，避免被通用规则抢先。 */
const BROWSERS: { name: string; re: RegExp }[] = [
  { name: '微信', re: /MicroMessenger\/([\d.]+)/ },
  { name: '企业微信', re: /wxwork\/([\d.]+)/ },
  { name: '钉钉', re: /DingTalk\/([\d.]+)/ },
  { name: 'Edge', re: /Edg(?:e|A|iOS)?\/([\d.]+)/ },
  { name: 'Opera', re: /(?:OPR|Opera)\/([\d.]+)/ },
  { name: 'Firefox', re: /(?:Firefox|FxiOS)\/([\d.]+)/ },
  { name: 'Chrome', re: /(?:Chrome|CriOS)\/([\d.]+)/ },
  { name: 'Safari', re: /Version\/([\d.]+).*Safari/ },
  { name: 'Internet Explorer', re: /MSIE ([\d.]+)|Trident\/.*rv:([\d.]+)/ },
];

const ENGINES: { name: string; re: RegExp }[] = [
  { name: 'Blink', re: /Chrome|CriOS/ },
  { name: 'WebKit', re: /AppleWebKit/ },
  { name: 'Gecko', re: /Gecko\// },
  { name: 'Trident', re: /Trident/ },
  { name: 'Presto', re: /Presto/ },
];

const OSES: { name: string; re: RegExp; version?: RegExp }[] = [
  { name: 'Windows', re: /Windows NT/, version: /Windows NT ([\d.]+)/ },
  { name: 'macOS', re: /Mac OS X/, version: /Mac OS X ([\d_.]+)/ },
  { name: 'iOS', re: /(?:iPhone|iPad|iPod)/, version: /OS ([\d_]+)/ },
  { name: 'Android', re: /Android/, version: /Android ([\d.]+)/ },
  { name: 'Linux', re: /Linux|X11/ },
];

const NT_MAP: Record<string, string> = {
  '10.0': '10 / 11',
  '6.3': '8.1',
  '6.2': '8',
  '6.1': '7',
  '6.0': 'Vista',
  '5.1': 'XP',
};

export function parseUA(ua: string): UAResult {
  const raw = ua.trim();
  const isBot = BOTS.test(raw);

  let browser = '未知';
  let browserVersion = '';
  for (const b of BROWSERS) {
    const m = raw.match(b.re);
    if (m) {
      browser = b.name;
      browserVersion = (m[1] ?? m[2] ?? '').trim();
      break;
    }
  }

  let engine = '未知';
  for (const e of ENGINES) {
    if (e.re.test(raw)) {
      engine = e.name;
      break;
    }
  }

  let os = '未知';
  let osVersion = '';
  for (const o of OSES) {
    if (o.re.test(raw)) {
      os = o.name;
      if (o.version) {
        const m = raw.match(o.version);
        if (m) {
          osVersion = m[1].replace(/_/g, '.');
          if (os === 'Windows') osVersion = NT_MAP[osVersion] ?? osVersion;
          if (os === 'macOS') {
            // 10.15.7 → 10.15；11+ 直接主版本
            const seg = osVersion.split('.');
            osVersion = seg.length > 2 ? seg.slice(0, 2).join('.') : osVersion;
          }
        }
      }
      break;
    }
  }

  let deviceType: DeviceType = 'desktop';
  if (isBot) deviceType = 'bot';
  else if (/iPad|Tablet|PlayBook|Silk/i.test(raw)) deviceType = 'tablet';
  else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(raw)) deviceType = 'mobile';

  let arch = '';
  const archM = raw.match(/(x86_64|Win64|WOW64|x64|AMD64|aarch64|ARM64|armv[七八]l?|i686|i386)/i);
  if (archM) arch = archM[1];

  return { browser, browserVersion, engine, os, osVersion, deviceType, isBot, arch, raw };
}
