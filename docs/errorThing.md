## [2026-06-20 00:00:08 CST]
- 问题描述：运行 `pnpm --filter @policy-pay/web typecheck` 失败，TypeScript 报错 `@mysten/sui/utils` 没有导出成员 `blake2b`。
- 发生位置：`packages/sdk/src/hash.ts:1`
- 上下文：项目首次安装依赖后，为启动前端进行轻量类型检查；当前安装的 `@mysten/sui` 版本 API 与代码中的导入不匹配。
- 可能原因：`@mysten/sui` 新版本调整或移除了 `utils` 中的 `blake2b` 导出，SDK 代码仍使用旧 API。
- 解决状态：未解决

## [2026-06-20 00:01:18 CST]
- 问题描述：修复 `blake2b` 导入错误后，重新运行 `pnpm --filter @policy-pay/web typecheck` 通过。
- 发生位置：`packages/sdk/src/hash.ts`、`packages/sdk/package.json`
- 上下文：将 SDK 哈希实现改为直接依赖并导入 `@noble/hashes/blake2.js`，同步更新 pnpm lockfile。
- 可能原因：此前依赖了 `@mysten/sui/utils` 的旧导出路径。
- 解决状态：已解决

## [2026-06-20 00:02:29 CST]
- 问题描述：访问 `http://localhost:3001/` 返回 500，Next.js 报错 `ssr: false is not allowed with next/dynamic in Server Components`。
- 发生位置：`apps/web/app/page.tsx:3`
- 上下文：前端 dev server 已启动，首次请求首页时编译失败；`page.tsx` 是 App Router 的 Server Component，却直接使用了 `next/dynamic` 的 `ssr:false`。
- 可能原因：Next.js 15 对 Server Component 中 `next/dynamic` 的 `ssr:false` 用法收紧，需要移入 Client Component。
- 解决状态：未解决

## [2026-06-20 00:03:08 CST]
- 问题描述：修复 `next/dynamic` 用法后，访问首页仍返回 500，Next.js 报错无法解析 `packages/sdk/src/index.ts` 中的 `./constants.js`。
- 发生位置：`packages/sdk/src/index.ts:1`
- 上下文：根 `tsconfig.base.json` 将 `@policy-pay/sdk` 映射到 SDK TypeScript 源码；SDK 源码为 ESM 输出使用 `.js` 后缀导入，Next dev 直接解析源码时未映射到 `.ts` 文件。
- 可能原因：Next/Webpack 默认不会把源码中的 `.js` 相对导入自动解析为同名 `.ts` 源文件。
- 解决状态：未解决

## [2026-06-20 00:04:29 CST]
- 问题描述：修复 Next 15 动态导入限制和 SDK 源码扩展解析后，`pnpm --filter @policy-pay/web typecheck` 通过，`http://localhost:3001/` 返回 200。
- 发生位置：`apps/web/components/WalletAppClient.tsx`、`apps/web/app/page.tsx`、`apps/web/next.config.ts`
- 上下文：将 `ssr:false` 的动态加载移入 Client Component，并在 Next webpack 配置中添加 `.js` 到 `.ts/.tsx` 的扩展解析别名。
- 可能原因：Next.js 版本升级后 Server Component 动态导入限制变严，同时 workspace TS 源码解析与 ESM `.js` 后缀导入存在开发期兼容问题。
- 解决状态：已解决

## [2026-06-20 00:59:02 CST]
- 问题描述：Playwright 访问前端页面时控制台出现 `Failed to load resource: the server responded with a status of 404 (Not Found)`，请求路径为 `/favicon.ico`。
- 发生位置：`http://localhost:3001/favicon.ico`
- 上下文：完成前端改版后进行浏览器视觉验证，页面主体渲染正常，但缺少 favicon 资源导致控制台错误。
- 可能原因：Next.js 应用未声明或提供站点图标，浏览器默认请求 `/favicon.ico`。
- 解决状态：未解决

## [2026-06-20 00:59:56 CST]
- 问题描述：补充 SVG favicon 并在 Next metadata 中声明后，`http://localhost:3001/favicon.svg` 返回 200，Playwright 新会话控制台 0 errors。
- 发生位置：`apps/web/public/favicon.svg`、`apps/web/app/layout.tsx`
- 上下文：修复浏览器视觉验证中发现的 favicon 404；重新运行页面快照与截图。
- 可能原因：此前缺少 favicon 资源声明。
- 解决状态：已解决

## [2026-06-20 01:00:50 CST]
- 问题描述：并行运行 `pnpm --filter @policy-pay/web typecheck` 与 `pnpm --filter @policy-pay/web build` 时，typecheck 报告 `.next/types/...` 文件不存在。
- 发生位置：`apps/web/tsconfig.json` 的 `.next/types/**/*.ts` include
- 上下文：构建命令会清理并重新生成 `.next/types`，与单独的 `tsc` 同时读取该目录产生竞态；同一轮 `next build` 最终成功。
- 可能原因：验证命令并行执行导致构建产物目录短暂缺失，不是业务代码类型错误。
- 解决状态：未解决

## [2026-06-20 01:01:13 CST]
- 问题描述：串行重新运行 `pnpm --filter @policy-pay/web typecheck` 通过，确认 `.next/types` 缺失是并行验证竞态。
- 发生位置：验证命令执行方式
- 上下文：`next build` 完成后 `.next/types` 已恢复，再单独运行 typecheck 无错误。
- 可能原因：此前并行执行构建与类型检查。
- 解决状态：已解决

## [2026-06-20 01:10:29 CST]
- 问题描述：新增 Test Console 后运行 `pnpm --filter @policy-pay/web typecheck` 失败，TypeScript 报告 `selected` 可能为 `undefined`。
- 发生位置：`apps/web/components/TestConsole.tsx:263`
- 上下文：`suites.find(...) ?? suites[0]` 在 `noUncheckedIndexedAccess` 下仍不能证明 `suites[0]` 一定存在。
- 可能原因：测试套件数组未声明为非空元组，TypeScript 无法静态保证 fallback 项存在。
- 解决状态：未解决

## [2026-06-20 01:10:53 CST]
- 问题描述：修复 Test Console 的 `selected` 类型收窄后，`pnpm --filter @policy-pay/web typecheck` 通过；`/api/test-runs` 能成功执行 `frontend-typecheck` suite。
- 发生位置：`apps/web/components/TestConsole.tsx`
- 上下文：为测试界面增加本地测试执行 API 和前端控制台后进行验证。
- 可能原因：此前 fallback 数组索引在严格类型检查下未显式断言非空。
- 解决状态：已解决

## [2026-06-20 01:11:48 CST]
- 问题描述：Playwright 打开 `/tests` 时控制台出现两个 404，资源为 `/_next/static/chunks/main-app.js` 和 `/_next/static/chunks/app-pages-internals.js`。
- 发生位置：Next.js dev server 静态 chunk 资源
- 上下文：新增测试界面后已运行过 `next build`，仍使用先前启动的 dev server 进行浏览器验证，页面主体可渲染但客户端 chunk 引用不干净。
- 可能原因：production build 重写 `.next` 产物后，旧 dev server 的资源映射与当前 `.next/static` 不一致。
- 解决状态：未解决

## [2026-06-20 01:13:14 CST]
- 问题描述：重启 3001 dev server 后，重新打开 `/tests` 并执行 `Run Selected` 成功，控制台不再出现 `_next/static/chunks` 404。
- 发生位置：Next.js dev server
- 上下文：测试界面可渲染，前端按钮成功调用 `/api/test-runs` 并显示 `frontend-typecheck` 通过输出。
- 可能原因：此前旧 dev server 与 `.next` 产物不一致。
- 解决状态：已解决

## [2026-06-20 01:17:54 CST]
- 问题描述：运行 `pnpm --filter @policy-pay/web test` 失败，Vitest 报错 `ReferenceError: React is not defined`。
- 发生位置：`apps/web/components/TestConsole.tsx:45`
- 上下文：为 Test Console 添加 React Testing Library 测试后，测试环境执行模块顶层 JSX icon 常量。
- 可能原因：Vitest 转换该文件时需要显式引入 `React` 运行时，而组件仅导入了 `useMemo` 和 `useState`。
- 解决状态：已解决

## [2026-06-20 01:18:16 CST]
- 问题描述：补充组件 React import 后重新运行 `pnpm --filter @policy-pay/web test`，测试文件内 JSX 仍报 `ReferenceError: React is not defined`。
- 发生位置：`apps/web/components/TestConsole.test.tsx:12`
- 上下文：React Testing Library 测试直接渲染 `<TestConsole />`，测试转换同样需要 React 运行时。
- 可能原因：Vitest 当前 JSX 转换未使用自动运行时，测试文件未显式导入 React。
- 解决状态：已解决

## [2026-06-20 01:18:40 CST]
- 问题描述：补充 React import 后，`pnpm --filter @policy-pay/web test` 仍有一个断言失败，`Frontend Typecheck` 文案匹配到多个元素。
- 发生位置：`apps/web/components/TestConsole.test.tsx:17`
- 上下文：Test Console 左侧 suite 列表和右侧选中 suite 标题都会显示 `Frontend Typecheck`，测试使用 `getByText` 期望唯一匹配。
- 可能原因：断言未考虑界面中同一 suite 名称会出现在列表和详情区域。
- 解决状态：已解决

## [2026-06-20 01:19:08 CST]
- 问题描述：修复前端测试运行时和断言问题后，`pnpm --filter @policy-pay/web test` 通过，2 个测试文件共 5 个测试通过；`pnpm --filter @policy-pay/web typecheck` 通过。
- 发生位置：`apps/web/components/TestConsole.test.tsx`、`apps/web/components/TestConsole.tsx`
- 上下文：新增 Test Console 前端测试和共享 suite 元数据测试。
- 可能原因：此前测试环境 JSX runtime 和重复文案断言未处理。
- 解决状态：已解决

## [2026-06-20 01:20:06 CST]
- 问题描述：执行 `sui --version` 和 `pnpm move:test` 失败，终端提示 `sui: command not found`。
- 发生位置：本机 Sui CLI / `pnpm move:test`
- 上下文：准备执行合约测试时检查 Move 工具链；项目脚本依赖 `sui move test`。
- 可能原因：当前环境未安装或未配置 Sui CLI 到 `PATH`。
- 解决状态：未解决

## [2026-06-20 01:21:14 CST]
- 问题描述：新增 Agent 测试后，`pnpm --filter @policy-pay/agent test` 无法解析 `@policy-pay/sdk` 包入口；`pnpm --filter @policy-pay/agent typecheck` 报 SDK 源文件不在 Agent `rootDir` 下。
- 发生位置：`apps/agent/src/planner/planner.ts`、`apps/agent/src/db/store.ts`、`apps/agent/tsconfig.json`
- 上下文：Agent 依赖 workspace SDK；根 tsconfig 将 `@policy-pay/sdk` 映射到 SDK 源码，和 Agent 独立 `rootDir: src` 冲突；Vitest 也需要 SDK dist 入口存在。
- 可能原因：直接运行 Agent 子包测试/类型检查时没有先构建 SDK，且 TypeScript paths 解析越过了 Agent 包边界。
- 解决状态：已解决

## [2026-06-20 01:22:07 CST]
- 问题描述：调整 Agent 脚本和 tsconfig 后，`pnpm --filter @policy-pay/agent test` 通过，3 个测试文件共 7 个测试通过；`pnpm --filter @policy-pay/agent typecheck` 通过。
- 发生位置：`apps/agent/package.json`、`apps/agent/tsconfig.json`
- 上下文：Agent 测试前先构建 SDK，Agent TypeScript 通过 SDK dist 声明文件解析 workspace 依赖。
- 可能原因：此前 Agent 子包缺少显式 SDK 构建依赖。
- 解决状态：已解决
## [2026-06-20 01:27:33 CST]
- 问题描述：生成路演 PPT 前探测 `@oai/artifact-tool` 入口时使用了不存在的 `dist/index.js` 路径，Node 返回 `ERR_MODULE_NOT_FOUND`。
- 发生位置：PPT 生成准备阶段，artifact-tool 运行时入口定位。
- 上下文：需要按照 presentations 技能使用 `@oai/artifact-tool` 创建并导出可编辑 PPTX。
- 可能原因：根据常见包结构猜测入口文件，未先读取包内 `package.json` 的 `exports` 字段。
- 解决状态：已解决
## [2026-06-20 01:32:09 CST]
- 问题描述：路演 PPT 第 5 页预览中部分安全检查卡片文字换行后与说明文字重叠，红色强调线穿过标题文本。
- 发生位置：`output/PolicyPay-Agent-Roadshow.pptx` 生成预览，slide-05。
- 上下文：使用 artifact-tool 生成可编辑 PPT 并进行视觉 QA。
- 可能原因：卡片内标题文本框宽度不足，说明文字起始位置过高；强调线位置没有避开两行标题。
- 解决状态：已解决
## [2026-06-20 01:32:33 CST]
- 问题描述：用 artifact-tool 导入 PPTX 做定向修复时，Node 进程未收到 `FINAL_PPTX` 环境变量，导致 `FileBlob.load` 参数为 `undefined`。
- 发生位置：PPT 第 5 页排版修复脚本。
- 上下文：需要导入已生成的 `output/PolicyPay-Agent-Roadshow.pptx` 并调整重叠文本。
- 可能原因：shell 中设置变量后没有在执行 Node 命令时导出或前置传入。
- 解决状态：已解决
## [2026-06-20 01:35:26 CST]
- 问题描述：PPT 视觉 QA 发现首页 `OwnerCap`/`AgentCap` 标签换行不理想，第 8 页卡片标题压到正文，第 10 页副标题和底部 Ask 文案存在挤压。
- 发生位置：`output/PolicyPay-Agent-Roadshow.pptx` 生成预览，slide-01、slide-08、slide-10。
- 上下文：抽查路演 PPT 逐页渲染图，发现文字密集页面存在可读性问题。
- 可能原因：文本框宽度和字号按 inspect 估算足够，但实际渲染中英文长度与换行策略更保守。
- 解决状态：已解决
## [2026-06-20 01:36:45 CST]
- 问题描述：artifact-tool 导入已生成 PPTX 做定向编辑时，对象锚点在不同页面间出现重复映射，导致第 8 页文案修改误写到首页。
- 发生位置：PPT 第二轮定向修复，slide-01/slide-08。
- 上下文：尝试通过 `presentation.resolve(rec.id)` 修改导入 PPTX 的局部文本框。
- 可能原因：导入后的 inspect 锚点在该 deck 中不适合作为跨页唯一定位；定向编辑风险高于重新生成。
- 解决状态：已解决
## [2026-06-20 01:40:49 CST]
- 问题描述：准备为新版路演 PPT 截取真实前端界面时，`localhost:3000` 与 `localhost:3001` 虽有 Node 进程监听，但 `curl -I` 在 5 秒内无响应。
- 发生位置：PPT 重新制作素材采集阶段。
- 上下文：需要获取 dashboard 与 `/tests` 页面截图作为新版 PPT 的产品素材。
- 可能原因：旧 dev server 会话处于挂起或构建状态，端口监听但没有完成请求响应。
- 解决状态：已解决
## [2026-06-20 01:41:36 CST]
- 问题描述：使用 Playwright wrapper 截图时，shell 同一行内设置 `PWCLI` 后立即展开，导致执行路径为空并返回 `permission denied`。
- 发生位置：PPT 素材截图命令。
- 上下文：需要通过 `/Users/sxlx/.codex/skills/playwright/scripts/playwright_cli.sh` 打开本地页面并保存截图。
- 可能原因：变量赋值与命令展开发生在同一 shell 解析阶段，`$PWCLI` 没有获得新值。
- 解决状态：已解决
## [2026-06-20 01:42:17 CST]
- 问题描述：Playwright wrapper 截图命令使用了不支持的 `--viewport-size` 参数，随后 `screenshot output/...` 被解析为元素选择器并失败。
- 发生位置：PPT 产品界面截图采集。
- 上下文：希望为新版 PPT 获取 1440px 宽的 dashboard 与 `/tests` 页面截图。
- 可能原因：混用了其他 Playwright CLI 的参数习惯，未先按本地 wrapper 的 `resize` 与 `screenshot` 语法执行。
- 解决状态：已解决
## [2026-06-20 01:44:19 CST]
- 问题描述：尝试点击测试控制台的运行按钮时，Playwright ref 指向按钮内 SVG 图标路径，点击被图标或顶部栏拦截并超时。
- 发生位置：PPT `/tests` 通过状态截图采集。
- 上下文：希望生成带测试通过状态的截图用于新版路演 PPT。
- 可能原因：使用了过期或不合适的 aria ref，目标不是按钮元素本身。
- 解决状态：已解决
## [2026-06-20 01:48:33 CST]
- 问题描述：重做新版路演 PPT 时，artifact-tool 生成脚本失败并输出长运行时栈，未成功导出新 deck。
- 发生位置：`policypay-roadshow-redesign` PPT 生成脚本。
- 上下文：使用产品截图、深色主题和 8 页新版结构重新生成 `output/PolicyPay-Agent-Roadshow.pptx`。
- 可能原因：某个 shape/image 配置不被 artifact-tool 当前运行时支持，需要缩小复现定位。
- 解决状态：已解决
## [2026-06-20 01:50:33 CST]
- 问题描述：artifact-tool 中 `rightTriangle` 几何可以渲染 PNG，但 `PresentationFile.exportPptx` 导出时失败。
- 发生位置：新版 PPT 架构图箭头头部形状。
- 上下文：定位 `policypay-roadshow-redesign` 生成失败原因时逐项测试 shape 几何。
- 可能原因：当前 artifact-tool PPTX 导出器对 `rightTriangle` 预设几何支持不完整。
- 解决状态：已解决
## [2026-06-20 01:55:38 CST]
- 问题描述：尝试用 Playwright `run-code` 隐藏 Next.js Dev Tools 浮标时，命令字符串被解析为无效 JavaScript 并返回 `SyntaxError: Unexpected identifier 'page'`。
- 发生位置：PPT 产品截图清理阶段。
- 上下文：需要重新截取不带 dev tools 浮标的 dashboard 图并替换 PPT 中截图。
- 可能原因：本地 wrapper 的 `run-code` 对传入代码包装方式与直接 Playwright 脚本不同。
- 解决状态：已解决
## [2026-06-20 02:00:14 CST]
- 问题描述：最终文件清单命令将 `find -exec` 写到了 `sort` 后，导致 `sort: invalid option -- e`。
- 发生位置：PPT 重做后的交付物清单确认。
- 上下文：需要列出 `output/` 下最终 PPT 和截图素材文件。
- 可能原因：组合 `find | sort | ls` 时误用了 `find` 的 `-exec` 参数位置。
- 解决状态：已解决
## [2026-06-20 02:08:02 CST]
- 问题描述：执行 `git status --short` 时返回 `fatal: not a git repository`。
- 发生位置：项目状态检查命令。
- 上下文：收尾阶段尝试查看工作区变更范围。
- 可能原因：当前目录不是 Git 仓库，或 `.git` 元数据不在该项目路径内。
- 解决状态：已解决
## [2026-06-20 02:15:33 CST]
- 问题描述：安装 Sui CLI 后执行 `pnpm move:test` 失败，Move 编译器提示 `let _ =` 不能接收 `(address, u64)` 二元返回值。
- 发生位置：`move/agent_treasury/tests/vault_tests.move`
- 上下文：开始实际执行合约单元测试后，测试辅助函数 `execute_policy_for_testing` 返回二元组。
- 可能原因：Move 本地变量绑定需要与返回值结构匹配，不能用单个 `_` 绑定 tuple。
- 解决状态：未解决
## [2026-06-20 02:17:41 CST]
- 问题描述：`pnpm move:test` 初次失败后，修正 tuple 解构与跨模块 `expected_failure` location，合约测试通过。
- 发生位置：`move/agent_treasury/tests/vault_tests.move`
- 上下文：安装 `suiup` 与 `sui@testnet` 后实际运行 Move 单元测试。
- 可能原因：测试注解默认将 abort 来源定位到测试模块；实际业务 abort 来自 `agent_treasury::vault`。
- 解决状态：已解决
## [2026-06-20 02:20:44 CST]
- 问题描述：本机 3000/3001 端口有 Node 进程监听，但访问 `/tests` 在 5 秒内无响应。
- 发生位置：前端 dev server 可用性检查。
- 上下文：最终交付前希望提供可打开的 dashboard 与测试界面 URL。
- 可能原因：旧 Next.js dev server 会话处于挂起或构建卡住状态。
- 解决状态：未解决
## [2026-06-20 02:21:23 CST]
- 问题描述：前端服务改用 3002 端口启动，dashboard 与 `/tests` 均返回 HTTP 200。
- 发生位置：前端 dev server 可用性检查。
- 上下文：3000/3001 无响应后，通过独立 Next.js dev server 提供可访问测试界面。
- 可能原因：避开旧挂起进程占用端口，使用空闲端口重新启动。
- 解决状态：已解决
## [2026-06-20 02:22:11 CST]
- 问题描述：尝试用 `nohup pnpm --dir apps/web exec next dev ...` 后台启动 3002 服务时，进程立即退出且未产生日志，`curl` 无法连接。
- 发生位置：前端 dev server 后台化启动。
- 上下文：希望将交互式 dev server 切换为后台进程，避免占用当前工具会话。
- 可能原因：`nohup` 与 `pnpm --dir ... exec` 组合没有正确保留执行上下文或进程环境。
- 解决状态：未解决
## [2026-06-20 02:23:50 CST]
- 问题描述：改用受管终端会话启动 `pnpm --dir apps/web exec next dev --hostname 127.0.0.1 --port 3002` 后，前端服务可用。
- 发生位置：前端 dev server 启动。
- 上下文：普通后台子进程无法保活，切换为当前工具管理的长运行服务会话。
- 可能原因：当前执行环境会清理普通后台子进程；受管终端会话适合保留 dev server。
- 解决状态：已解决
## [2026-06-20 02:32:29 CST]
- 问题描述：创建 Vault 时钱包扩展在 `signAndExecuteTransaction({ transaction: tx })` 抛出 `Invalid type: Expected Object but received Object`。
- 发生位置：`apps/web/components/WalletApp.tsx` 的 create vault submit 流程。
- 上下文：用户在浏览器页面 `http://127.0.0.1:3002/` 提交创建 Vault 交易。
- 可能原因：钱包扩展、`@mysten/dapp-kit-react` 和 `@mysten/sui` 的 Transaction 对象序列化/版本兼容存在不匹配。
- 解决状态：未解决
## [2026-06-20 02:37:40 CST]
- 问题描述：为修复 package id 校验而改用 `isValidSuiAddress` 后，SDK 测试发现短对象 ID `0x6` 被错误拒绝。
- 发生位置：`packages/sdk/src/constants.ts`
- 上下文：新增地址校验测试后运行 `pnpm --filter @policy-pay/sdk test`。
- 可能原因：`isValidSuiAddress` 直接校验要求规范化地址，未先处理 Sui 常用短地址写法。
- 解决状态：未解决
## [2026-06-20 02:38:18 CST]
- 问题描述：在仓库根目录用 Node 直接 import `@mysten/sui/utils` 探测地址校验时返回 `ERR_MODULE_NOT_FOUND`。
- 发生位置：临时 Node 探测命令。
- 上下文：根包没有直接声明 `@mysten/sui` 依赖，该依赖存在于 web/sdk 子包。
- 可能原因：Node ESM 按当前执行目录解析依赖，无法从根包直接解析子包依赖。
- 解决状态：已解决
## [2026-06-20 02:39:28 CST]
- 问题描述：创建 Vault 的 `Invalid type: Expected Object but received Object` 已定位为占位 `0xTODO` package id 进入 Sui Transaction 序列化。
- 发生位置：`packages/sdk/src/constants.ts` 与 `apps/web/components/WalletApp.tsx`
- 上下文：新增 SDK 地址校验、前端配置错误提示和 agent 地址校验后重新执行验证。
- 可能原因：原先只检查 `startsWith('0x')`，导致非法占位地址通过早期校验。
- 解决状态：已解决
## [2026-06-20 02:40:10 CST]
- 问题描述：修改前端后，3002 dev server 返回 500，日志显示 `.next/server/webpack-runtime.js` 找不到 `./137.js`。
- 发生位置：Next.js dev server / `.next` 开发缓存。
- 上下文：HMR 多次重编译后访问 `/` 和 `/tests`。
- 可能原因：`.next` webpack 开发缓存损坏，之前也出现过 cache pack rename `ENOENT`。
- 解决状态：未解决
## [2026-06-20 02:40:48 CST]
- 问题描述：清理 `apps/web/.next` 并重启 3002 dev server 后，`/` 与 `/tests` 均返回 HTTP 200。
- 发生位置：Next.js dev server / `.next` 开发缓存。
- 上下文：修复 webpack runtime 缺失 chunk 后重新验证页面可访问性。
- 可能原因：删除损坏生成缓存后 Next.js 重新生成 server/client 编译产物。
- 解决状态：已解决
## [2026-06-20 02:41:26 CST]
- 问题描述：短 Sui 地址 `0x6` 被 SDK 地址校验误拒的问题已修复，SDK 测试通过。
- 发生位置：`packages/sdk/src/constants.ts`
- 上下文：地址校验改为先 `normalizeSuiAddress` 再 `isValidSuiAddress`，并保留空值/非 `0x` 快速拒绝。
- 可能原因：规范化前直接校验短地址导致合法系统对象短写被拒。
- 解决状态：已解决
## [2026-06-20 02:49:50 CST]
- 问题描述：执行 `sui client faucet --address ...` 失败，CLI 提示 testnet token 需要使用 Web UI。
- 发生位置：Sui testnet 合约发布准备阶段。
- 上下文：当前地址没有 testnet SUI，发布 Move package 需要 gas。
- 可能原因：当前 Sui CLI/testnet faucet 流程不再通过 CLI 直接发放测试币。
- 解决状态：未解决
## [2026-06-20 02:58:10 CST]
- 问题描述：用户表示已发送 0.2 SUI 后，多次查询 testnet 与 mainnet 同地址仍无 gas coin，官方 faucet curl 接口返回限流。
- 发生位置：Sui testnet 合约发布准备阶段。
- 上下文：准备发布 `move/agent_treasury` 并配置 `NEXT_PUBLIC_PACKAGE_ID`。
- 可能原因：测试币尚未到账、发送到了其他地址或网络，或 faucet/IP/地址触发限流。
- 解决状态：未解决
## [2026-06-20 03:05:52 +0800]
- 问题描述：尝试使用无头浏览器读取首页 DOM 时失败，Node 无法解析 `@playwright/test` 模块。
- 发生位置：根工作区执行 `node -e` Playwright 验证脚本。
- 上下文：Move package 已发布，前端 `.env.local` 已配置，正在补充 UI 状态验证。
- 可能原因：`@playwright/test` 未安装在根工作区可解析的依赖路径中。
- 解决状态：已解决
## [2026-06-20 03:06:33 +0800]
- 问题描述：前端创建 AgentVault 时提示 `Contract package id is not configured`。
- 发生位置：`apps/web/components/WalletApp.tsx` 创建 vault 交易流程。
- 上下文：用户重新发送 testnet SUI 后，CLI 地址余额到账；随后成功发布 `move/agent_treasury` Move package，并写入 `apps/web/.env.local`。
- 可能原因：此前尚未发布 Move package，`NEXT_PUBLIC_PACKAGE_ID` 仍为占位值。
- 解决状态：已解决
## [2026-06-20 03:07:08 +0800]
- 问题描述：尝试查看 Git 工作区状态时失败，当前目录不是 Git 仓库。
- 发生位置：根工作区执行 `git status --short`。
- 上下文：发布和前端验证完成后，尝试汇总文件变更状态。
- 可能原因：项目目录未初始化 Git，或当前工作区未包含 `.git` 目录。
- 解决状态：已解决
## [2026-06-20 03:18:58 +0800]
- 问题描述：删除公开 `/tests` 页面后首次运行 `pnpm --filter @policy-pay/web typecheck` 失败，`.next/types` 仍引用已删除的 `app/tests/page.ts`。
- 发生位置：`apps/web/.next/types` 生成缓存与 `apps/web/tsconfig.json` include。
- 上下文：移除浏览器测试控制台路由/API 后进行前端验证。
- 可能原因：Next.js 生成类型缓存滞后于文件删除；随后执行生产构建重新生成 `.next` 类型。
- 解决状态：已解决
## [2026-06-20 03:19:54 +0800]
- 问题描述：删除公开测试路由后当前 Next dev server 首页一度返回 500，日志显示 `Cannot find module './137.js'` 与 React Client Manifest 缓存错误。
- 发生位置：`apps/web/.next` dev 缓存 / 127.0.0.1:3002 首页请求。
- 上下文：前端生产构建、单元测试和 typecheck 已通过，但长时间运行的 dev server 热更新后缓存不一致。
- 可能原因：Next.js dev 编译缓存滞后于路由和模块删除。
- 解决状态：已解决
## [2026-06-20 03:21:08 +0800]
- 问题描述：在 3002 dev server 运行时执行 `next build` 后，首页再次返回 500，日志仍为 `Cannot find module './137.js'`。
- 发生位置：`apps/web/.next`，Next dev 与生产构建共用缓存目录。
- 上下文：生产构建验证完成后继续使用同一端口检查页面。
- 可能原因：生产构建写入 `.next`，破坏了正在运行的 dev server 运行时缓存。
- 解决状态：已解决
## [2026-06-20 03:37:07 CST]
- 问题描述：执行 `git status --short --branch` 失败，当前项目目录不是 Git 仓库。
- 发生位置：/Users/sxlx/Documents/Codex/policy-pay-agent
- 上下文：准备 GitHub 提交材料时检查仓库状态。
- 可能原因：项目目录缺少 `.git`，或源码是以普通文件夹方式创建/复制的。
- 解决状态：未解决

## [2026-06-20 03:38:33 CST]
- 问题描述：读取 Presentations skill 的 `artifact_tool/API_QUICK_START.md` 失败。
- 发生位置：/Users/sxlx/.codex/plugins/cache/openai-primary-runtime/presentations/26.614.11602/artifact_tool/API_QUICK_START.md
- 上下文：准备更新 pitch PPT 并按照 skill 要求读取 artifact-tool API 文档。
- 可能原因：文档实际位于 `skills/presentations/artifact_tool/API_QUICK_START.md`，不是 skill 根目录上一层。
- 解决状态：已解决

## [2026-06-20 03:44:20 CST]
- 问题描述：执行 `pnpm verify:submission` 失败，readiness 报告显示 Git 仓库未初始化且未配置 `origin`。
- 发生位置：/Users/sxlx/Documents/Codex/policy-pay-agent/output/submission-readiness-latest.json
- 上下文：新增提交检查后验证 Sui Overflow 提交包状态。
- 可能原因：项目目录此前不是 Git 仓库，尚未连接 GitHub 远端。
- 解决状态：未解决

## [2026-06-20 03:44:59 CST]
- 问题描述：使用 `say -f output/PolicyPay-Agent-Pitch-voiceover.txt` 生成的旁白音频只有约 7.7 秒。
- 发生位置：/Users/sxlx/Documents/Codex/policy-pay-agent/output/PolicyPay-Agent-Pitch-voiceover.mp3
- 上下文：为 pitch video 生成英文旁白节奏音频。
- 可能原因：macOS `say -f` 在当前文本格式或段落分隔下没有读取完整文稿。
- 解决状态：未解决

## [2026-06-20 03:47:10 CST]
- 问题描述：旁白音频截断问题已通过分段生成并用 ffmpeg 拼接解决。
- 发生位置：/Users/sxlx/Documents/Codex/policy-pay-agent/scripts/build-pitch-media.mjs
- 上下文：重新生成 `output/PolicyPay-Agent-Pitch-voiceover.mp3` 与 `output/PolicyPay-Agent-Pitch-slidecut.mp4`。
- 可能原因：单次调用 `say` 读取完整文稿不稳定；分段输入后各段均可正常合成。
- 解决状态：已解决

## [2026-06-20 03:50:45 CST]
- 问题描述：Git 仓库未初始化且未配置 `origin` 的提交阻塞已解决。
- 发生位置：/Users/sxlx/Documents/Codex/policy-pay-agent
- 上下文：已初始化本地 Git 仓库，创建公开 GitHub 仓库并推送 `main` 分支。
- 可能原因：项目此前是普通目录，不是 Git checkout。
- 解决状态：已解决
## [2026-06-20 03:57:53 CST]
- 问题描述：使用 Vercel fallback 部署脚本部署仓库根目录失败，未返回 preview URL。
- 发生位置：/Users/sxlx/.codex/skills/vercel-deploy/scripts/deploy.sh
- 上下文：为 Sui Overflow 提交补齐公开 live app URL，执行 `deploy.sh /Users/sxlx/Documents/Codex/policy-pay-agent`。
- 可能原因：仓库是 pnpm/turbo monorepo，fallback 脚本从根目录未能识别 Next.js app 或部署端构建未接受该包结构。
- 解决状态：未解决

## [2026-06-20 03:59:33 CST]
- 问题描述：临时 standalone web 部署包本地 `pnpm build` 失败，TypeScript 无法解析 `@noble/hashes/blake2.js`。
- 发生位置：/tmp/policypay-web-deploy/packages/sdk/src/hash.ts
- 上下文：为 Vercel fallback 部署创建仅包含 Next.js 前端和 SDK 源码的临时包。
- 可能原因：脱离原 pnpm workspace/lockfile 后，file 依赖的 SDK 子路径解析与原仓库不一致。
- 解决状态：未解决

## [2026-06-20 04:02:54 CST]
- 问题描述：公开前端部署已完成，前述 Vercel fallback 和 standalone 临时包构建问题已绕过。
- 发生位置：https://policypay-web-deploy.vercel.app
- 上下文：改用 `pnpm dlx vercel deploy /tmp/policypay-web-deploy --yes`，临时包增加直接依赖 `@noble/hashes` 后远端 Next.js 构建成功。
- 可能原因：fallback endpoint 已弃用，且临时包需要显式声明 SDK 源码依赖解析所需的直接依赖。
- 解决状态：已解决

## [2026-06-20 04:04:25 CST]
- 问题描述：内置浏览器导航到 DeepSurge hackathon 页面超时。
- 发生位置：https://www.deepsurge.xyz/hackathons/b587dc0c-4cb8-4e63-ada5-519df38103bf
- 上下文：准备检查是否可以继续赛事表单提交。
- 可能原因：页面前端加载慢或当前浏览器标签导航状态未完成。
- 解决状态：未解决
## [2026-06-20 04:06:44 CST]
- 问题描述：内置浏览器连接脚本报错 `Identifier 'setupBrowserRuntime' has already been declared`。
- 发生位置：node_repl browser setup
- 上下文：继续检查 DeepSurge 登录状态时重复执行了此前已经声明过的 browser setup 常量。
- 可能原因：Node REPL 顶层绑定会跨调用保留，不能重复声明同名 `const`。
- 解决状态：未解决

## [2026-06-20 04:07:28 CST]
- 问题描述：DeepSurge 赛事提交仍无法继续，页面显示 `Sign in to Participate`，没有创建或提交项目入口。
- 发生位置：https://www.deepsurge.xyz/hackathons/b587dc0c-4cb8-4e63-ada5-519df38103bf
- 上下文：GitHub、Release、Vercel live app、pitch media 和提交字段均已准备完成后，继续检查赛事实际提交入口。
- 可能原因：当前浏览器会话未登录 DeepSurge；继续提交需要用户完成账号/OAuth 登录授权。
- 解决状态：未解决

## [2026-06-20 04:07:28 CST]
- 问题描述：内置浏览器连接脚本重复声明问题已解决。
- 发生位置：node_repl browser setup
- 上下文：改为复用现有 `globalThis.browser` 绑定并成功读取 DeepSurge 标签状态。
- 可能原因：此前重复声明顶层 `const`。
- 解决状态：已解决
## [2026-06-20 12:24:05 CST]
- 问题描述：读取 Chrome control skill 的旧缓存路径失败。
- 发生位置：/Users/sxlx/.codex/plugins/cache/openai-bundled/chrome/26.611.62324/skills/control-chrome/SKILL.md
- 上下文：准备控制当前 Chrome 中的 DeepSurge 创建项目表单。
- 可能原因：Chrome 插件缓存版本已更新到 `26.616.32156`。
- 解决状态：已解决

## [2026-06-20 12:54:07 CST]
- 问题描述：本地素材检查时 `ffprobe` 命令把两个文件作为同一次输入，返回参数错误。
- 发生位置：output/PolicyPay-Agent-Pitch-voiceover.mp3 与 output/PolicyPay-Agent-Pitch-slidecut.mp4
- 上下文：重新生成 Fish Audio 语音视频前检查现有音频和视频时长。
- 可能原因：`ffprobe` 只接受一个输入文件，本次检查命令写法不正确。
- 解决状态：已解决

## [2026-06-20 13:04:17 CST]
- 问题描述：Fish Audio 语音生成成功后，字幕脚本因原稿词数与时间戳词数匹配阈值过严而中断。
- 发生位置：scripts/build-pitch-media.mjs
- 上下文：使用 Fish Audio `stream/with-timestamp` 接口生成 pitch video 旁白和字幕，校验显示匹配 318/365 个脚本文词。
- 可能原因：TTS 时间戳会拆分、合并或省略部分标点/复合词，不能用过高的逐词匹配比例作为失败条件。
- 解决状态：未解决

## [2026-06-20 13:06:20 CST]
- 问题描述：Fish Audio 音频和 SRT 已生成，但 ffmpeg 烧录字幕时 `force_style` 参数解析失败。
- 发生位置：scripts/build-pitch-media.mjs
- 上下文：合成带字幕 MP4 时，`subtitles` filter 的样式字符串包含逗号，被 ffmpeg filter graph 误解析为新的 filter 参数。
- 可能原因：ffmpeg `subtitles` filter 的 `force_style` 逗号需要额外转义，直接拼接样式字符串不稳。
- 解决状态：未解决

## [2026-06-20 13:08:17 CST]
- 问题描述：改用 ASS 字幕文件后，ffmpeg 仍无法烧录字幕，当前本机 ffmpeg 缺少 `ass/subtitles/drawtext` 文本相关滤镜。
- 发生位置：scripts/build-pitch-media.mjs
- 上下文：合成 pitch video 时检查 `ffmpeg -filters`，未发现可用字幕或文字绘制滤镜。
- 可能原因：本机 ffmpeg 编译参数未启用 libass/freetype 相关能力。
- 解决状态：未解决

## [2026-06-20 13:13:03 CST]
- 问题描述：Fish Audio 时间戳匹配阈值、ffmpeg 字幕样式解析、以及本机缺少字幕/文字滤镜的问题已通过预渲染字幕帧方案解决。
- 发生位置：scripts/build-pitch-media.mjs
- 上下文：脚本先用 Fish Audio 生成 MP3 与 word timing，再用 bundled Python/Pillow 把字幕渲染进静态帧，最后由 ffmpeg 仅拼接帧和音频。
- 可能原因：本机 ffmpeg 缺少字幕文本滤镜，直接烧录 SRT/ASS 不可靠。
- 解决状态：已解决

## [2026-06-20 13:14:18 CST]
- 问题描述：最终校验发现 SRT 字幕在 `package id,` 处截断，未覆盖完整 Fish Audio 旁白。
- 发生位置：output/PolicyPay-Agent-Pitch.en.srt
- 上下文：Fish 原始 alignment 包含完整结尾，但原稿逐词匹配在后半段发生偏移，导致生成字幕只使用了部分原稿映射。
- 可能原因：Fish word timing 会省略或合并部分词，逐词映射偏移后消耗了剩余时间戳。
- 解决状态：未解决

## [2026-06-20 13:19:17 CST]
- 问题描述：SRT 字幕截断问题已解决，字幕覆盖到完整结尾 `user-defined boundaries.`。
- 发生位置：scripts/build-pitch-media.mjs 与 output/PolicyPay-Agent-Pitch.en.srt
- 上下文：新增原稿按 Fish 时间轴重排逻辑，并用 `PITCH_TTS=reuse` 复用 Fish 音频和 alignment 重新生成 SRT 与 MP4。
- 可能原因：此前直接使用 Fish 原始词或不完整逐词匹配，无法同时保证完整文本和原稿标点。
- 解决状态：已解决

## [2026-06-20 13:19:59 CST]
- 问题描述：`pnpm verify:submission` 返回非零退出码，但检查结果为 21 pass、1 warn、0 fail。
- 发生位置：scripts/submission-readiness.mjs
- 上下文：最终视频生成后执行提交 readiness 校验，唯一 warning 是 Git 工作区有未提交变更。
- 可能原因：视频、字幕、脚本和错误日志尚未提交。
- 解决状态：未解决
