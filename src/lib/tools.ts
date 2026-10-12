// ★ 数据驱动核心：所有工具都在这里注册。
// 新增一个工具 = 在 tools 里加一条记录 + 新建对应页面；导航 / 首页 / 搜索全部自动生成，无需改动框架代码。

export type Category =
  | 'json'
  | 'codec'
  | 'crypto'
  | 'text'
  | 'datetime'
  | 'convert'
  | 'code'
  | 'generator'
  | 'color'
  | 'image'
  | 'ai';

export interface ToolMeta {
  id: string;
  name: string;
  category: Category;
  path: string;
  description: string;
  icon: string;
  tags: string[];
  status: 'ready' | 'planned';
}

/** 分类展示元信息（名称 + 图标名，对应 Icon.astro）。 */
export const CATEGORY_META: Record<Category, { name: string; icon: string }> = {
  json: { name: 'JSON 工具', icon: 'format' },
  codec: { name: '编解码', icon: 'escape' },
  crypto: { name: '加密 / 哈希', icon: 'lock' },
  text: { name: '文本处理', icon: 'text' },
  datetime: { name: '时间 / 日期', icon: 'clock' },
  convert: { name: '格式转换', icon: 'swap' },
  code: { name: '代码工具', icon: 'code' },
  generator: { name: '生成器', icon: 'sparkles' },
  color: { name: '颜色 / 图片', icon: 'palette' },
  image: { name: '图片处理', icon: 'image' },
  ai: { name: 'AI / Cloud', icon: 'ai' },
};

export const tools: ToolMeta[] = [
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    category: 'json',
    path: '/json/formatter',
    description: '格式化、压缩、校验 JSON，支持错误行列定位与键排序',
    icon: 'format',
    tags: ['json', 'format', 'validate', 'minify'],
    status: 'ready',
  },
  {
    id: 'json-yaml',
    name: 'JSON ↔ YAML',
    category: 'json',
    path: '/json/yaml',
    description: 'JSON 与 YAML 双向转换',
    icon: 'swap',
    tags: ['json', 'yaml', 'convert'],
    status: 'ready',
  },
  {
    id: 'json-xml',
    name: 'JSON ↔ XML',
    category: 'json',
    path: '/json/xml',
    description: 'JSON 与 XML 双向转换（属性以 @_ 前缀表示）',
    icon: 'swap',
    tags: ['json', 'xml', 'convert'],
    status: 'ready',
  },
  {
    id: 'json-csv',
    name: 'JSON ↔ CSV',
    category: 'json',
    path: '/json/csv',
    description: 'JSON 与 CSV 双向转换（对象数组 ↔ 表头+数据行）',
    icon: 'swap',
    tags: ['json', 'csv', 'convert'],
    status: 'ready',
  },
  {
    id: 'jsonpath',
    name: 'JSONPath 查询',
    category: 'json',
    path: '/json/jsonpath',
    description: '用 JSONPath 表达式在 JSON 中提取节点',
    icon: 'search',
    tags: ['json', 'jsonpath', 'query'],
    status: 'ready',
  },
  {
    id: 'base64',
    name: 'Base64 编解码',
    category: 'codec',
    path: '/codec/base64',
    description: 'Base64 编码与解码（UTF-8 安全），纯浏览器本地处理',
    icon: 'escape',
    tags: ['base64', 'encode', 'decode'],
    status: 'ready',
  },
  {
    id: 'hash',
    name: '哈希计算',
    category: 'crypto',
    path: '/crypto/hash',
    description: 'SHA-1 / 256 / 384 / 512 哈希（Web Crypto 本地计算）',
    icon: 'lock',
    tags: ['hash', 'sha256', 'crypto'],
    status: 'ready',
  },
  {
    id: 'text-process',
    name: '文本处理',
    category: 'text',
    path: '/text/process',
    description: '大小写、排序去重、URL / HTML 编解码、字数统计等',
    icon: 'text',
    tags: ['text', 'format', 'count'],
    status: 'ready',
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    category: 'datetime',
    path: '/datetime/timestamp',
    description: 'Unix 时间戳与日期互转（本地 / UTC），支持秒 / 毫秒',
    icon: 'clock',
    tags: ['timestamp', 'date'],
    status: 'ready',
  },
  {
    id: 'image-convert',
    name: '图片格式转换',
    category: 'image',
    path: '/image/convert',
    description: 'PNG / JPEG / WebP 互转，支持质量调节与透明填充',
    icon: 'swap',
    tags: ['image', 'convert', 'png', 'jpeg', 'webp', '格式转换'],
    status: 'ready',
  },
  {
    id: 'image-compress',
    name: '图片压缩',
    category: 'image',
    path: '/image/compress',
    description: '按质量 / 最大宽度压缩图片，本地处理不丢失细节',
    icon: 'compress',
    tags: ['image', 'compress', '压缩', 'quality'],
    status: 'ready',
  },
  {
    id: 'image-edit',
    name: '裁剪 / 翻转 / 旋转',
    category: 'image',
    path: '/image/edit',
    description: '拖拽裁剪、水平 / 垂直翻转、旋转 90° / 180° / 270°',
    icon: 'crop',
    tags: ['image', 'crop', 'flip', 'rotate', '裁剪', '翻转', '旋转'],
    status: 'ready',
  },
];

export interface ToolGroup {
  category: Category;
  meta: { name: string; icon: string };
  items: ToolMeta[];
}

/** 按 CATEGORY_META 的顺序，把工具分组（过滤掉空分组）。 */
export function toolsByCategory(): ToolGroup[] {
  const order = Object.keys(CATEGORY_META) as Category[];
  return order
    .map((category) => ({
      category,
      meta: CATEGORY_META[category],
      items: tools.filter((t) => t.category === category),
    }))
    .filter((g) => g.items.length > 0);
}
