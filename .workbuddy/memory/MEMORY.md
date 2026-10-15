# 项目长期记忆 (MEMORY.md)

## 个人工具箱网站 (toolbox)
- 形态：开发者工具箱站点（参考 bejson.com），Cloudflare Pages 零运维部署。
- 推荐技术栈：Astro 6 + TypeScript + Tailwind CSS，static 输出；交互岛可混用 React/Vue/Preact/Svelte。
- 核心设计：数据驱动 `src/lib/tools.ts` 注册表，导航/首页/搜索由其生成，新增工具零框架改动。
- 首期：仅 JSON 格式化 MVP。分类：json/codec/crypto/text/datetime/convert/code/generator/color(联动 color-material-extract)/ai(付费锚点)。
- 路线：Phase0 脚手架+JSON ✅ → Phase1 JSON 子类 ✅ → Phase2 纯前端工具 ✅（Base64/哈希/文本处理/时间戳，复用 Converter）→ Phase3 本地收藏 → Phase4 云端同步(Worker+D1)/AI。
- 架构：JSON 工具共用 `src/lib/convert/`（纯函数）+ `src/layouts/Converter.astro`（满屏左输入右输出）+ `converter-ui.ts`（通用工具栏控制器，支持方向切换/只读树/JSONPath 查询）；新增转换工具 = 写纯函数 + 建页 setupConverter + 在 `tools.ts` 加 ready 记录。
- **工具页布局双轨制（2026-10-14 起）**：①文本进/文本出类（codec、json 子类、timestamp、文本处理/命名转换）用 `Converter.astro`（textarea + setupConverter）；②表单类与混合类（计算器 10 页、文本 diff/replace/regex/extract/frequency、加密 aes/rsa/bcrypt/random/file-hash）统一用 `src/layouts/Tool.astro`——满屏左右分栏（左输入/参数、右输出/结果），props：inputLabel/outputLabel/columns('even'|'left-narrow'20rem|'left-wide'26rem)，命名 slot：input-tools/input/output-tools/output；面板内部各自滚动、页面不滚动（Base full）。旧 `Calculator.astro`（max-w-4xl 居中卡片）已删除，calc-card/btn-ghost CSS 已清除；保留 calc-label/calc-input/result-card/kv/seg/btn-primary/kp-key。
- **图片 3 页也已并入 Tool 布局（2026-10-14 二次改造）**：edit/convert/watermark 均左上传+参数、右画布预览+下载主按钮；画布适配用 JS fitPreview()（按容器算 scale 直设 style 尺寸，勿依赖 max-h-full）。右栏长列表统一 `.zebra` 斑马纹 + `.res-row` 大行距行；结果少的右栏用 flex-1 + justify-center 拉伸占满。
- **农历/老黄历**：`src/lib/calc/lunar.ts` 查表法 1900-2100（数据源 vsme/chinese-days，闰月大小=bit16 单独编码，勿凭记忆写表）；date.astro 右栏「日期详情」含农历/干支/生肖/闰月/星座/今年第几天/第几周/距今天数。
- **长尾工具（2026-10-15 第三梯队）**：新增 `data` 分类（数据工具，icon `table`）——CSV 编辑器（data/csv，在线编辑表格+导出 CSV/JSON/MD）、JSON 转表格（data/json-table）；图片新增隐私元数据清除（image/exif，无损字节级剥离 JPEG 的 Exif/IPTC 与 PNG 文本块）；json/csv 页改路由到健壮 `src/lib/data/csv.ts`（取代薄弱 jsonCsv.ts，支持 BOM/分隔符自动识别/引号转义）。
- 方案文档：`D:\Myproject\sw-tools\docs\proposal-toolbox-website.md`。

## 构建/验证工作流（本机沙箱）
- **正确构建命令**：`cd "D:/Myproject/sw-tools" && /c/Users/sw/.workbuddy/binaries/node/versions/22.22.2-3/node.exe node_modules/astro/bin/astro.mjs build`（托管 Node 绝对路径 + `astro/bin/astro.mjs` 入口）。**`cd "D:/..."` 大写盘符不可省略**——Bash 工具默认 cwd 是小写 `d:\...`，盘符大小写不一致会让 Astro/Vite 静默剥离全部 stylesheet（EXIT=0、页面齐全但 0 个 .css，2026-10-15 踩坑，与 junction 坑并列的两个独立根因）。
- **坑**：`node_modules/astro/dist/cli/index.js` 只 `export { cli }`，直接 `node` 运行什么都不做却 exit 0，会误判构建成功；沙箱里 `npm`/`ls`/`tail`/`rm`/`mkdir` 因 PATH 异常不可用（文件操作用 Node 脚本或专用工具；PowerShell 的 Remove-Item 在沙箱可能静默失效，用 Node fs.rmSync）。
- 每次改前端后必须用上述命令真构建并**核对 dist 内容**（.css 文件非空 + HTML 含 `rel="stylesheet"` + 新文案/标识符），不能只看 exit 0。
- **重大坑：失败构建会毒化 `.astro` 编译缓存（2026-10-14 踩坑）**。某次构建因代码错误失败后，即使修好代码，后续构建仍报虚假错误 `No cached compile metadata found for xxx.astro?astro&type=style&index=0&lang.css`（与 Astro bug #15963 现象相似但根因不同——是 node_modules/.astro 里的半截脏缓存）。**症状：修好真实报错后构建仍失败且错误与改动无关。修复：删 `node_modules/.vite` + `node_modules/.astro` + 项目根 `.astro` + `dist` 后重建。** 任何构建失败后的重试都应先清这四个目录；排查时可用「相同源码复制到别的目录（node_modules 打 junction）能否构建」来快速区分「源码有病」还是「缓存有毒」，避免盲目升级 astro。
- **同一文件多处修改必须串行 Edit**：并行发多个 Edit 到同一文件会静默丢失更新（第二个覆盖第一个），已三次造成问题（GROUP_META 丢失、unitToPx 改名只改一半、gradient.astro define:vars 未去掉+esc 重复声明）。
- **最重大坑：node_modules 打 junction/symlink 会导致构建静默丢失全部 CSS（2026-10-14）**。现象：构建 EXIT=0、页数正常但 0 个 .css 产物；`@tailwindcss/node` 直接 compile 输出却正常；cssProbe 显示 global.css transform 输出 len:0。根因是 node_modules 被改名 nm-real 并原地建 junction 指向——Vite/oxide 扫描器经 reparse point 解析依赖时静默失败，Tailwind 管线输出空。修复：删 junction + nm-real 改名回 node_modules（真实目录）。**Windows 下 node_modules 必须是真实目录，实验后必须完整还原再下结论**；产物验收必须核对 .css 文件数与关键类（tool-btn/brand-600 等），不能只看 exit code 和页数。此前「缓存毒化」排查建议里「复制到别处 + node_modules 打 junction」的对比手法本身会引入此坑，对比完必须拆除 junction。
- **页面 script 禁用 `define:vars`（2026-10-15）**：`<script define:vars={{X}}>` 与含 import 的脚本组合时 Astro 跳过打包，把原始 TS（import/类型标注）原样内联进经典 `<script>`，浏览器 SyntaxError 整页报废，且构建/astro check 均不报错。传数据用 data-* 属性（script 读 dataset）或常量写进 script；script 里也不要有 `<Icon .../>` 字面量（组件语法不能 innerHTML，也干扰编译）。**验证手法**：构建后提取每页 script 检查 TS 残留（`: string)`/`as HTML`/`interface `），并用模拟 DOM import dist 真实 bundle 跑运行时冒烟。
- **贷款计算器架构（2026-10-14 重设计）**：`src/lib/calc/loan.ts` 支持四类型（商贷 LPR+基点/固定、公积金首套二套分档、组合贷两段按月合并、其他固定）× 两还款方式（等额本息/等额本金闭式解）；页面 calculator/loan.astro 用 Tool 布局 left-wide，贷款类型 seg 切换显隐 + 类型说明卡 + 区别一览表。LPR_QUOTE 5 年期 3.5（2026-09-20）。
- **信息提取架构（2026-10-14 重设计）**：`extractSelected(text, groups, dedup)` 按选中类型提取；extract.astro 左栏底部 6 类型开关（localStorage `sw-tools:extract:types` 记忆），右栏结果卡 data-group 显隐 + `.result-card-off`；六色 `--tc` CSS 变量按 `[data-type]/[data-group]` 选择器区分（email/url/phone/ip/date/number）。
- **第一梯队工具（2026-10-15，共 7 页）**：json/diff（递归结构化 diff，数组 index/id 匹配）、network/url（WHATWG 拆解+默认端口标注）、code/format（js-beautify + 手写安全压缩，Tab 缩进传 '\t'）、codec/gbk（TextDecoder('gbk')+惰性反推编码表，乱码恢复/生成/自动）、color/convert + color/gradient（parseColor 全格式+WCAG+harmonies+渐变 CSS）、calculator/salary（年度税率表+年终奖单独/合并对比+五险一金城市预设 11 项比例+专项附加扣除）。全部 lib 先行 + vitest，页面按 Converter/Tool 双轨布局。
