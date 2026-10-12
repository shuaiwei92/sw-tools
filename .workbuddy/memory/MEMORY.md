# 项目长期记忆 (MEMORY.md)

## 个人工具箱网站 (toolbox)
- 形态：开发者工具箱站点（参考 bejson.com），Cloudflare Pages 零运维部署。
- 推荐技术栈：Astro 6 + TypeScript + Tailwind CSS，static 输出；交互岛可混用 React/Vue/Preact/Svelte。
- 核心设计：数据驱动 `src/lib/tools.ts` 注册表，导航/首页/搜索由其生成，新增工具零框架改动。
- 首期：仅 JSON 格式化 MVP。分类：json/codec/crypto/text/datetime/convert/code/generator/color(联动 color-material-extract)/ai(付费锚点)。
- 路线：Phase0 脚手架+JSON ✅ → Phase1 JSON 子类 ✅ → Phase2 纯前端工具 ✅（Base64/哈希/文本处理/时间戳，复用 Converter）→ Phase3 本地收藏 → Phase4 云端同步(Worker+D1)/AI。
- 架构：JSON 工具共用 `src/lib/convert/`（纯函数）+ `src/layouts/Converter.astro`（满屏左输入右输出）+ `converter-ui.ts`（通用工具栏控制器，支持方向切换/只读树/JSONPath 查询）；新增转换工具 = 写纯函数 + 建页 setupConverter + 在 `tools.ts` 加 ready 记录。
- 方案文档：`D:\Myproject\sw-tools\docs\proposal-toolbox-website.md`。

## 构建/验证工作流（本机沙箱）
- **正确构建命令**：`/c/Users/sw/.workbuddy/binaries/node/versions/22.22.2-3/node.exe node_modules/astro/bin/astro.mjs build`（托管 Node 绝对路径 + `astro/bin/astro.mjs` 入口）。
- **坑**：`node_modules/astro/dist/cli/index.js` 只 `export { cli }`，直接 `node` 运行什么都不做却 exit 0，会误判构建成功；沙箱里 `npm`/`ls`/`tail` 因 PATH 异常不可用，不要依赖。
- 每次改前端后必须用上述命令真构建并**核对 dist 内容**（grep 新文案/标识符），不能只看 exit 0。
