# sw-tools · 开发者在线工具箱

纯前端开发者工具箱站点。首期实现 **JSON 格式化**，其余分类预留扩展位。
技术栈 **Astro 6 + TypeScript + Tailwind CSS v4**，静态输出，可一键部署到任意静态主机。

## 特性

- ⚡ 零 JS 默认，首屏极快；仅交互工具页注入少量脚本
- 🌗 深浅色主题切换（localStorage 持久化，无闪烁）
- 🧩 数据驱动：所有工具在 `src/lib/tools.ts` 注册，导航/首页自动生成
- 🔒 纯本地处理，数据不出浏览器
- 📦 可部署到 Cloudflare Pages / Netlify / Vercel / GitHub Pages 等

## 本地开发

```bash
npm install
npm run dev        # 本地预览 http://localhost:4321
npm test           # 运行纯函数单测（Vitest）
npm run build      # 产物输出到 dist/
npm run preview    # 预览构建产物
```

## 部署：Cloudflare Pages（推荐）

1. 推送代码到 GitHub / GitLab
2. Cloudflare Pages 控制台 → Create a project → 连接仓库
3. 构建设置：
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
4. 每次 `git push` 自动部署，生产分支合并即上线；可绑定自定义域名

> 静态站模式下无需 `@astrojs/cloudflare` adapter。仅当使用 SSR / 边缘渲染 / 绑定 KV·D1 时才启用。
> 本项目与 Cloudflare 生态解耦：换用其他静态主机同样只需改部署目标，业务代码不变。

## 目录结构

```
src/
├─ consts.ts                 # 站点常量（站名/描述）
├─ layouts/Base.astro        # 全局布局（头部/主题/页脚）
├─ components/               # Icon / Header / Footer / ToolCard
├─ lib/
│  ├─ tools.ts               # ★ 工具注册表（数据驱动核心）
│  └─ json/format.ts         # 纯函数：format/minify/validate/sort/escape
└─ pages/
   ├─ index.astro            # 首页：分类 + 工具总览
   └─ json/formatter.astro   # JSON 格式化 MVP
```

## 扩展一个新工具

1. 在 `src/lib/tools.ts` 的 `tools` 数组追加一条记录（含 `category` / `path` / `status`）
2. 在 `src/pages/<category>/<tool>.astro` 新建页面
3. 完成 —— 首页卡片、分类导航自动出现，无需改动框架代码

## 路线图

| 阶段 | 内容 |
|---|---|
| Phase 0（当前） | 脚手架 + JSON 格式化 MVP |
| Phase 1 | JSON 子类：YAML/XML/CSV 互转、JSONPath、树视图增强 |
| Phase 2 | 编解码、时间戳、文本处理、哈希等纯前端工具 |
| Phase 3 | 首页搜索、本地收藏（localStorage） |
| Phase 4 | 云端同步（Worker + D1）、跨设备、AI 辅助 |
