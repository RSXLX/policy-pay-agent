# Web App

Next.js dashboard for PolicyPay Agent.

## Responsibilities

- Wallet connection through Sui dApp Kit.
- Human-readable transaction intent.
- Create vault.
- Deposit funds.
- Add rules.
- Register vault with local agent.
- Trigger dry-run and manual execution.
- Owner pause/resume/revoke/withdraw controls.

## Commands

```bash
pnpm --filter @policy-pay/web dev
pnpm --filter @policy-pay/web build
```

## Environment

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8787
NEXT_PUBLIC_DEFAULT_COIN_TYPE=0x2::sui::SUI
```
