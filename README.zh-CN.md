# PolicyPay Agent

PolicyPay Agent 是一个面向 Sui Overflow The Agentic Web 赛道的产品级项目底座：**受链上 policy 约束的自主 treasury/payment agent**。

用户把资金存入链上的 `AgentVault<T>`，设置定期付款规则、单笔限额、周期限额、最低余额、过期时间、暂停/撤销规则；agent 后端读取链上状态并自动执行到期付款。但每次执行都必须通过 Move 合约校验，agent 无法绕过权限边界。

## 包含内容

- `move/agent_treasury`：Sui Move 合约，包含 vault、rules、owner cap、agent session cap、events、policy checks。
- `packages/sdk`：TypeScript SDK，包含交易构建器、schema、parser、hash helper。
- `apps/agent`：agent 后端，包含 planner、risk checker、executor、event indexer、本地 repository。
- `apps/web`：Next.js 前端，使用新版 Sui dApp Kit。
- `docs`：产品文档、安全模型、架构文档、部署指南和路演材料。

## 核心安全设计

- agent 不拿用户私钥；
- 用户资金进入 `AgentVault<T>`；
- 用户持有 `OwnerCap`；
- agent 只持有 `AgentSessionCap`；
- Move 合约是最终权限层；
- 后端 planner 只是提前判断，不能绕过合约。

## 快速启动

```bash
pnpm install
cp .env.example .env
pnpm build
```

运行 TypeScript 工作区测试：

```bash
pnpm test
```

构建 Move：

```bash
cd move/agent_treasury
sui move build
sui move test
```

发布到 Testnet：

```bash
sui client switch --env testnet
sui client publish --gas-budget 100000000
```

把 package id 写入环境变量：

```env
PACKAGE_ID=0x...
NEXT_PUBLIC_PACKAGE_ID=0x...
```

启动前端：

```bash
pnpm --filter @policy-pay/web dev
```

浏览器打开 `http://localhost:3000`。

启动 agent：

```bash
pnpm --filter @policy-pay/agent dev
```

## 质量检查

常用命令：

```bash
pnpm test
pnpm --filter @policy-pay/web test
pnpm --filter @policy-pay/sdk test
pnpm --filter @policy-pay/agent test
pnpm --filter @policy-pay/web typecheck
pnpm --filter @policy-pay/web build
```

合约测试入口：

```bash
pnpm move:test
```

`pnpm move:test` 需要本机安装 Sui CLI。

## 产品展示流程

1. 用户连接钱包；
2. 创建 vault；
3. deposit 0.8 SUI；
4. 添加 Alice / Bob 两条定期付款规则；
5. agent 自动执行到期付款；
6. 展示链上 event、tx digest 和 Explorer 链接；
7. 再执行一笔超出 rolling-window limit 的付款，展示被 Move 拒绝；
8. 用户 pause / revoke agent，展示 agent 失效。

一句话叙事：

> PolicyPay is a policy-bound autonomous payment agent on Sui. It can pay, split, and coordinate treasury flows, but only inside Move-enforced user boundaries.

## 路演和视频材料

- 路演大纲：[`docs/roadshow-outline.md`](docs/roadshow-outline.md)
- Pitch video 脚本与录制方案：[`docs/pitch-video-script.md`](docs/pitch-video-script.md)
- 可编辑路演 PPT：[`output/PolicyPay-Agent-Roadshow.pptx`](output/PolicyPay-Agent-Roadshow.pptx)
