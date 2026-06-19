# Pitch Video Script and Recording Plan

目标：录一条 2:40-3:00 的英文 pitch video，面向 Sui Overflow 2026 评审。视频要证明 PolicyPay Agent 是一个真实可运行的 Sui agentic payment product，而不是静态页面。

建议主赛道叙事：Agentic Web。项目也自然贴合 DeFi & Payments / Payments & Wallets，因为它展示的是可验证的 Sui payment rails。官方赛道关键词是 autonomous agents that can act, transact, and coordinate using Sui's object model and composability.

## 录制前准备

- 分辨率：1920x1080。
- 浏览器缩放：100%。
- 页面：`http://127.0.0.1:3002/`。
- 网络：Sui Testnet。
- Package：`0x46d49efb36a1bc3b253d5a02efd60de2668c2155e1efc9145eca0c68c9d2fd62`。
- Explorer：`https://suiexplorer.com/object/0x46d49efb36a1bc3b253d5a02efd60de2668c2155e1efc9145eca0c68c9d2fd62?network=testnet`。
- 打开两个浏览器标签：PolicyPay dashboard、Sui Explorer package/object/transaction 页面。
- 钱包：提前切到 Testnet，准备 owner wallet 和 agent wallet，两个地址都要有少量 Testnet SUI。
- 录音：优先单独录旁白，再剪到画面上；现场边操作边讲容易停顿。
- 视频中不要展示私钥、助记词、终端环境变量、钱包 seed、浏览器插件敏感弹窗。

## 镜头表

| 时间 | 画面 | 目标 |
|---:|---|---|
| 0:00-0:15 | Pitch PPT 封面或 dashboard landing | 一句话说明项目和赛道匹配。 |
| 0:15-0:35 | Problem slide / dashboard | 说明为什么 recurring crypto payments 需要 agent，但不能把 treasury 权限交给 agent。 |
| 0:35-1:05 | Create vault 表单 | 展示用户设置 recipient/rule 之外的硬边界：max per tx、window、reserve、expiry。 |
| 1:05-1:30 | Vault created / dashboard registry | 展示 `AgentVault<T>`、`OwnerCap`、`AgentSessionCap` 三类对象。 |
| 1:30-1:55 | Deposit + Add Rule | 展示资金进入 vault，规则进入链上状态。 |
| 1:55-2:20 | Agent plan / execute | 展示 agent 观察、计划、风险检查、提交交易。 |
| 2:20-2:40 | Blocked action / safety controls | 展示 Move policy 是最终权限层，越界动作会失败或被 pause/revoke 阻止。 |
| 2:40-2:55 | Sui Explorer transaction/object | 展示 package、object、digest、event trail，让评审看到链上证据。 |
| 2:55-3:00 | Roadmap / closing slide | 用一句话收束：automation without authority。 |

## 英文旁白脚本

### 0:00-0:15 Opening

Hi, this is PolicyPay Agent: a policy-bound autonomous payment agent built on Sui.

It targets the Agentic Web track because the agent can observe state, plan an action, transact on Sui, and coordinate recurring payments. But it can only do that inside boundaries enforced by Move.

### 0:15-0:35 Problem

Recurring crypto payments are still awkward for teams, DAOs, and small protocol treasuries.

Manual multisig workflows are safe, but slow. Generic automation is fast, but it can become too powerful. PolicyPay separates automation from authority.

### 0:35-1:05 Product Setup

The owner connects a Sui wallet and creates an `AgentVault`.

Before signing, the owner defines the agent's hard limits: maximum spend per payment, rolling-window spend limit, minimum reserve balance, expiration time, and the agent wallet that will receive the scoped session capability.

This is not just UI state. These boundaries are encoded into the Move object model.

### 1:05-1:30 Object Model

When the vault is created, Sui produces three important objects.

The shared `AgentVault` holds funds and policy. The owner keeps the `OwnerCap` for administration. The agent receives only an `AgentSessionCap`, which can execute approved payment rules but cannot withdraw arbitrary funds or add new recipients.

### 1:30-1:55 Payment Rule

Next, the owner deposits SUI into the vault and adds a recurring payment rule.

The rule stores the recipient, amount, schedule, nonce, and active state onchain. That means prompt injection or backend bugs cannot silently change who gets paid or how much gets paid.

### 1:55-2:20 Agent Execution

The agent service observes the vault, finds due rules, previews the plan, risk-checks it, and submits the payment transaction with the agent key.

The backend helps automate execution, but it is not the source of authority. The Move contract is.

### 2:20-2:40 Failure Path

The most important part is the failure path.

If the agent tries to pay too early, exceed the per-payment limit, cross the rolling-window limit, drain below the reserve, or continue after pause or revoke, the Move call aborts and funds do not move.

### 2:40-2:55 Chain Evidence

Every meaningful step leaves Sui evidence: package id, vault objects, transaction digest, object state, and events.

In the recording, I can open Sui Explorer and verify the package and transaction directly on Testnet.

### 2:55-3:00 Close

PolicyPay turns Sui object ownership and capabilities into payment rails for autonomous agents: the agent can act, but only inside verifiable user-defined boundaries.

## 屏幕操作顺序

1. 显示 PPT 封面或 dashboard landing。
2. 连接钱包，确认网络是 Testnet。
3. 点击 `Create Agent`。
4. 输入 agent address，保留清晰的小额限制：
   - Max per payment: `0.2 SUI`
   - Max per window: `0.3 SUI`
   - Window minutes: `2`
   - Min reserve: `0.1 SUI`
   - Expiry: `24h`
5. 签名创建 vault。
6. 成功页停 2 秒，突出三类对象和 transaction link。
7. 打开 dashboard，展示 Onchain Registry。
8. Deposit 少量 SUI。
9. Add Rule，设置一个真实 label，例如 `vendor payout`。
10. Register agent，Preview Plan，Execute Now。
11. 展示 activity digest。
12. 用 Pause 或 Revoke 展示 owner safety control。
13. 切到 Sui Explorer，打开 package/object/transaction。
14. 回到最后一页 roadmap 或 dashboard 总览收尾。

## 字幕与屏幕标注

建议只放 5 个短字幕，不要堆满屏幕：

- `No owner key`
- `Scoped AgentSessionCap`
- `Move-enforced limits`
- `Policy aborts unsafe payment`
- `Verifiable on Sui Explorer`

## 剪辑规则

- 钱包确认等待、交易 pending、页面刷新等待全部剪短。
- 不展示终端长输出。
- 只展示产品流程、钱包签名、对象 ID、digest 和 Explorer 证据。
- 不说临时方案或替代流程。
- 不夸大成 production-ready custody；可以说 product-grade MVP 或 working Sui-native MVP。
- 每个镜头保留一个明确证据：表单限制、对象 ID、digest、Explorer、pause/revoke。

## 最终检查

- 视频长度控制在 3 分钟以内。
- 开头 15 秒内说清楚：autonomous payment agent on Sui。
- 1 分钟内出现 `AgentVault`、`OwnerCap`、`AgentSessionCap`。
- 至少展示一次 Sui Explorer。
- 至少展示一次失败/阻止路径。
- 全片只围绕产品流程和链上证据展开。
- 最后一帧停在 dashboard 总览、Explorer 证据页或 pitch deck roadmap。
