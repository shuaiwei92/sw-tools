# 个人工具箱网站 · 方案文档

> 版本：v0.1 ｜ 状态：方案评审中
> 部署目标：Cloudflare Pages（零运维、全球 CDN）
> 首期功能：JSON 格式化（MVP）

---

## 1. 项目定位与目标

| 项 | 说明 |
|---|---|
| 产品形态 | 开发者 / 个人工具箱站点，首页为「分类 + 工具总览 + 搜索」，每个工具独立页面 |
| 首期范围 | 仅实现 **JSON 格式化**，其余分类预留扩展位 |
| 部署 | Cloudflare Pages，连接 Git 仓库自动构建，免费额度即够用（全球 CDN、SSL、500 次构建/月、无限带宽） |
| 运维 | 零运维（static-first），与既有 Cloudflare 生态（Worker + D1 付费层探索）保持一致 |
| 非目标 | 首期不做后端、不做账号体系、不做数据库 |

设计原则：**数据驱动**——所有工具通过统一注册表描述，导航、首页、搜索全部由注册表生成；新增一个工具 = 加一条注册表记录 + 新建一个页面，不改动框架代码。

---

## 2. 技术选型

### 2.1 推荐栈

**Astro 6 + TypeScript + Tailwind CSS**，部署为 Cloudflare Pages 静态站。

理由：
1. **Cloudflare 原生集成最佳**：Cloudflare 已收购 Astro，官方 `@astrojs/cloudflare` adapter 与 Pages 配合最顺，未来要用 SSR / Edge / Pages Functions 也是同一套。
2. **零 JS 默认**：工具站本质是「内容目录 + 少量交互」，Astro 默认不向浏览器发 JS，首屏与 Lighthouse 极优；仅在真正需要交互的工具页用 `<script>` 或岛注入少量 JS。
3. **生态不牺牲**：交互岛可用 React / Vue / Preact / Svelte 任意一种——复杂工具（如树视图、正则测试器）想用最流行的 React 生态完全没问题。
4. **零运维部署**：`npm run build` 产出 `dist/`，Pages 直接托管，无需服务器。
5. **与既有路线一致**：未来付费锚点（云端收藏、跨设备同步、AI 辅助）可直接用 Cloudflare **Pages Functions / Worker + D1 / KV**，同一账号、同一仓库，不引入新厂商。

### 2.2 框架对比

| 维度 | **Astro（推荐）** | Next.js | Vite + React (SPA) | SvelteKit |
|---|---|---|---|---|
| 零 JS 默认 | ✅ | ❌（React runtime 必带） | ❌ | 部分 |
| Cloudflare 适配 | 官方 adapter，原生最佳 | 需 edge / open-next，较繁琐 | 仅静态托管 | 官方 adapter |
| 工具站契合度 | 高（内容 + 岛） | 中（偏全栈应用） | 中 | 高 |
| 流行度 / 生态 | 增长快（~1.9M 周下载） | 最高（~15M 周下载） | 高（React 生态） | 小但开发者满意度最高 |
| 学习 / 维护成本 | 低 | 中 | 低 | 低 |
| Pages 零运维 | ✅ | ⚠️ 需额外配置 | ✅ | ✅ |

> 结论：若把「Cloudflare Pages 直部署 + 零运维 + 工具目录形态」作为硬约束，Astro 是最优解；若未来演化为重交互 SaaS 应用，再引入 Next.js 或 Workers 也不冲突（可并存：Astro 站点 + Worker API）。

### 2.3 工具链

- 包管理：`npm`（或 `pnpm`）
- 样式：Tailwind CSS（工具类优先，开发快、体积小）
- 格式化核心：纯 TypeScript 函数（无重依赖；JSON 用原生 `JSON.parse/stringify`，错误定位自实现）
- 测试（可选但推荐）：Vitest，对 `src/lib` 纯函数做单测
- 代码规范：ESLint + Prettier（可选）

---

## 3. 工具分类体系（数据驱动）

预设如下分类体系（含与你的 color-material-extract 可联动的「颜色/图片」类），并预留自有扩展位。**首期仅实现 JSON 分类下的「格式化」**。

| 分类 (category) | 工具示例（含未来） | 首期 |
|---|---|---|
| **JSON 工具** | 格式化校验、压缩/转义、JSON↔YAML、JSON↔XML、JSON↔CSV、JSON 树视图、JSONPath 查询、JSON 转代码(Go/Java/TS) | ✅ 格式化 |
| **编解码** | Base64、URL、HTML、Unicode、JWT 解码 | — |
| **加密 / 哈希** | MD5、SHA1/256、AES、DES、RSA（前端实现仅作演示） | — |
| **文本处理** | 去重/排序、字符统计、大小写转换、正则替换、 diff | — |
| **时间 / 日期** | 时间戳互转、时区转换、Cron 解析 | — |
| **格式转换** | YAML↔JSON、CSV↔JSON、图片↔Base64 | — |
| **代码工具** | JS/HTML/CSS 格式化、SQL 格式化、正则测试器 | — |
| **生成器** | UUID、随机密码、假数据 (faker)、二维码 | — |
| **颜色 / 图片** | 取色器、调色板生成、图片压缩（与 color-material-extract 联动） | — |
| **AI / Cloud（付费锚点）** | 云端收藏、跨设备同步、AI 辅助生成 / 解释 | — |

> 注册表中每条工具用 `status: 'ready' | 'planned'` 标记，未实现者在首页以「即将上线」灰显，导航自动收敛，避免空链接。

---

## 4. 首期功能设计：JSON 格式化 MVP

### 4.1 用户场景
粘贴 / 拖入 / 上传 `.json` 文件 → 一键格式化、压缩、校验、排序、复制、下载；大文件可看树视图并折叠展开；格式错误能定位到行/列。

### 4.2 功能清单

| 功能 | 说明 |
|---|---|
| 输入 | 文本框粘贴；拖拽 / 点击上传 `.json`/`.txt`；「从 URL 加载」（可选，需 CORS） |
| 格式化 | 缩进可选 2 空格 / 4 空格 / Tab |
| 压缩 (Minify) | 去空白，单行输出 |
| 校验 | 解析失败时返回错误信息与**行号/列号**，文本区高亮报错行 |
| 键排序 | 递归按字母序排序对象 key（可选开关） |
| 转义 / 反转义 | 处理 JSON 字符串中的转义字符 |
| 复制 / 下载 | 复制到剪贴板；下载为 `.json` 文件 |
| 树视图（增强项） | 折叠/展开、搜索高亮（可用 Preact 岛或原生实现） |
| 示例 / 清空 | 一键填入示例、清空输入 |

### 4.3 技术实现要点
- **纯逻辑层** `src/lib/json/format.ts`（无 DOM 依赖，可单测）：
  - `formatJson(input, indent): string`
  - `minifyJson(input): string`
  - `validateJson(input): { ok: boolean; error?: string; line?: number; column?: number }`
  - `sortKeysDeep(value): unknown`
- **UI 层**：`src/pages/json/formatter.astro` 内用 `<script>` 引入纯函数，绑定按钮事件。MVP 无需前端框架，保持极小体积；树视图等复杂交互后续可升级为 Preact/Vue 岛。
- **错误定位**：`JSON.parse` 抛错信息中解析出行号（如 `Unexpected token } in JSON at position 123`），再用累计换行数换算行列，无需第三方库。

---

## 5. 架构与目录结构

```
sw-tools/
├─ astro.config.mjs          # 输出 static；可选 @astrojs/cloudflare
├─ package.json
├─ tsconfig.json
├─ tailwind.config.mjs
├─ wrangler.toml            # 仅未来用 Worker/Functions 时启用
├─ public/
│  ├─ favicon.svg
│  └─ robots.txt
├─ src/
│  ├─ consts.ts              # 站点常量、分类枚举 CATEGORY
│  ├─ layouts/
│  │  └─ Base.astro          # <html> 骨架 + Header + Sidebar + Footer 插槽
│  ├─ components/
│  │  ├─ Header.astro        # 顶栏：站名 + 全局搜索
│  │  ├─ CategorySidebar.astro # 侧边分类导航（由注册表生成）
│  │  ├─ ToolCard.astro      # 工具卡片（首页网格）
│  │  └─ SearchBox.astro     # 客户端模糊搜索（基于注册表）
│  ├─ lib/
│  │  ├─ tools.ts            # ★ 工具注册表（数据驱动核心）
│  │  └─ json/
│  │     ├─ format.ts        # 纯函数：format/minify/validate/sortKeys
│  │     └─ format.test.ts   # Vitest 单测
│  ├─ pages/
│  │  ├─ index.astro         # 首页：分类 + 工具总览 + 搜索
│  │  ├─ json/
│  │  │  └─ formatter.astro  # 首期 MVP
│  │  └─ [category]/[tool].astro  # 未来：通用动态路由（按需）
│  └─ styles/
│     └─ global.css          # Tailwind 指令 + 设计变量
└─ README.md
```

### 5.1 数据驱动核心：`src/lib/tools.ts`

```ts
export type Category =
  | 'json' | 'codec' | 'crypto' | 'text'
  | 'datetime' | 'convert' | 'code' | 'generator'
  | 'color' | 'ai';

export interface ToolMeta {
  id: string;          // 唯一标识，如 'json-formatter'
  name: string;        // 显示名
  category: Category;
  path: string;        // 路由，如 '/json/formatter'
  description: string;
  icon: string;        // 内联 SVG 名或 emoji
  tags: string[];
  status: 'ready' | 'planned';
}

export const tools: ToolMeta[] = [
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    category: 'json',
    path: '/json/formatter',
    description: '格式化、压缩、校验 JSON，支持错误定位与键排序',
    icon: 'json',
    tags: ['json', 'format', 'validate'],
    status: 'ready',
  },
  // 后续工具只在此追加一条记录 + 新建对应页面即可
];
```

Header / Sidebar / 首页网格 / 搜索全部 `import { tools }` 渲染，**新增工具零框架改动**。

---

## 6. 部署：Cloudflare Pages

1. 将仓库推到 GitHub / GitLab。
2. Cloudflare Pages 控制台「Create a project」→ 连接仓库。
3. 构建设置：
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
4. （可选）`wrangler pages deploy dist` 命令行部署；或绑定自定义域名。
5. 每次 `git push` 自动预览部署；生产分支合并即上线。
6. 未来若需后端能力：在仓库根加 `functions/` 目录写 Pages Functions，或独立 Worker + D1，复用同一 Cloudflare 账号，无需新厂商。

> 静态站场景下**无需** `@astrojs/cloudflare` adapter（默认 static 输出即可）；仅当使用 SSR / 边缘渲染 / 绑定 KV/D1 时才启用该 adapter。

---

## 7. 开发路线图

| 阶段 | 内容 | 产出 |
|---|---|---|
| **Phase 0（本次）** | 完成本方案评审 + 脚手架 + JSON 格式化 MVP | 可部署站点 + 1 个可用工具 |
| Phase 1 | 补齐 JSON 子类：YAML/XML/CSV 互转、JSONPath 查询、树视图增强 | JSON 工具族 |
| Phase 2 | 纯前端工具：编解码、时间戳、文本处理、哈希 | 多分类可用 |
| Phase 3 | 首页搜索/分类导航完善、本地收藏（localStorage） | 完整体验 |
| Phase 4（付费锚点） | 云端同步（Worker + D1）、跨设备、AI 辅助生成 | 商业化探索 |

---

## 8. 下一步行动（待你确认）

1. **确认技术栈**：是否采用本文推荐的 **Astro + Tailwind**（岛屿可混用 React/Vue）。若你更倾向纯 React 生态，可改用 **Vite + React SPA**（部署同样简单，但 SEO/体积略弱）。
2. 确认后，我可直接**脚手架搭建 + 落地 JSON 格式化 MVP**（含纯函数 + 单测 + 页面 + Cloudflare Pages 部署配置），产出一个可 `npm run build` 并部署的仓库。
3. 站名 / 域名 / 视觉风格（浅色优先？是否要暗色模式）一并确认，便于统一设计 token。

---
*附：本方案采用现代化静态框架，在性能、可维护性与扩展性上较传统多页 + jQuery 技术栈更优。*
