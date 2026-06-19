# PolicyPay Agent

PolicyPay Agent is a product-grade starter for an autonomous, policy-bound treasury and payment agent on Sui.

Users deposit funds into an onchain `AgentVault<T>`, configure recurring payment rules, and delegate a narrowly scoped `AgentSessionCap` to an agent address. The agent can monitor vault state and execute due payments, but every payment is checked by Move-enforced policy: per-transaction limits, rolling-window limits, minimum reserve balance, expiration, pause, revoke, rule due time, and nonce.

This repository is a monorepo with:

- `move/agent_treasury`: Sui Move package for vaults, rules, caps, events, and policy checks.
- `packages/sdk`: TypeScript transaction builders, schemas, parsers, and helpers.
- `apps/agent`: autonomous agent service with planner, risk checker, executor, event indexer, and local repository.
- `apps/web`: Next.js dashboard with Sui dApp Kit wallet integration.
- `docs`: product spec, security model, architecture notes, deployment guide, and pitch assets.

## Why this is The Agentic Web

PolicyPay is not a chatbot. It is an autonomous execution system:

1. It observes Sui object state.
2. It decides which payment rules are due.
3. It plans transactions under policy.
4. It signs and submits Sui transactions from an agent account.
5. It leaves onchain evidence through events and object state.
6. It fails safely when policy blocks an action.

## Core safety model

- The agent does **not** hold the user's wallet key.
- Funds are held in an onchain `AgentVault<T>`.
- The user holds `OwnerCap`.
- The agent holds `AgentSessionCap`.
- Move is the final policy engine.
- The backend planner is convenience only; it cannot bypass the contract.

## Repository layout

```txt
policy-pay-agent/
  move/agent_treasury/          Sui Move package
  packages/sdk/                 TypeScript SDK and tx builders
  apps/agent/                   Node.js agent worker/API
  apps/web/                     Next.js UI
  docs/                         product, security, architecture docs
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Sui CLI compatible with your target network
- A funded owner wallet on Testnet
- A funded agent wallet on Testnet for gas

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm build
```

Run the local TypeScript test pass:

```bash
pnpm test
```

Build and test the Move package:

```bash
cd move/agent_treasury
sui move build
sui move test
```

Publish to Testnet:

```bash
sui client switch --env testnet
sui client publish --gas-budget 100000000
```

Copy the published package id into `.env` and `apps/web/.env.local`:

```env
PACKAGE_ID=0x...
NEXT_PUBLIC_PACKAGE_ID=0x...
```

Start the web app:

```bash
pnpm --filter @policy-pay/web dev
```

Open the dashboard at `http://localhost:3000`.

Start the agent:

```bash
pnpm --filter @policy-pay/agent dev
```

## Quality checks

The repository has test coverage across the TypeScript workspaces:

```bash
pnpm test
pnpm --filter @policy-pay/web test
pnpm --filter @policy-pay/sdk test
pnpm --filter @policy-pay/agent test
pnpm --filter @policy-pay/web typecheck
pnpm --filter @policy-pay/web build
```

Contract testing is wired through:

```bash
pnpm move:test
```

This command requires the Sui CLI on the local machine.

## Product walkthrough

1. Connect wallet in the web app.
2. Create a vault with an agent address and spending limits.
3. Deposit SUI into the vault.
4. Add one or more recurring payment rules.
5. Register the vault in the agent service.
6. Let the agent execute a due payment.
7. Show the activity feed and Sui transaction digest.
8. Trigger a blocked payment by exceeding the rolling-window limit.
9. Pause and revoke the agent.

## Roadshow and pitch assets

- Roadshow outline: [`docs/roadshow-outline.md`](docs/roadshow-outline.md)
- Pitch video script and recording plan: [`docs/pitch-video-script.md`](docs/pitch-video-script.md)
- Editable roadshow deck: [`output/PolicyPay-Agent-Roadshow.pptx`](output/PolicyPay-Agent-Roadshow.pptx)

## Development status

This is a serious project base, not a presentation-only concept. It includes contract architecture, SDK, agent runtime,
redesigned UI, docs, and scripts. You should still compile against the exact Sui CLI/SDK versions used by your team and
make small adjustments if your local Sui toolchain has moved package-system differences.

## License

Apache-2.0.
