# Agent Service

Autonomous executor for PolicyPay vaults.

## Responsibilities

- Store registered vault metadata locally.
- Poll Sui object state.
- Build a payment plan for due rules.
- Run offchain risk checks.
- Sign `execute_rule_payment` with the agent key.
- Save execution history.
- Expose a small API for the web app.

## Commands

```bash
pnpm --filter @policy-pay/agent dev
pnpm --filter @policy-pay/agent build
```

## API

See `../../docs/api.md`.

## Security note

The agent key should be funded only for gas. It should not hold user treasury funds. In production, store it in KMS/HSM and use a transaction policy/proxy around the executor.
