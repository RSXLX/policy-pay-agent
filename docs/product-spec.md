# Product Spec: PolicyPay Agent

## One-liner

PolicyPay Agent is a policy-bound treasury/payment agent on Sui. Users define recurring payment rules and spending boundaries; an autonomous agent executes due payments only when Move-enforced policy allows it.

## Target users

- Hackathon teams that need contributor payouts.
- DAO operators managing small bounty treasuries.
- Web3 startups that want recurring crypto payments with safety controls.
- Protocol teams that need an auditable agentic payment primitive.

## User jobs

1. Create a vault for a specific coin type.
2. Deposit funds into the vault.
3. Add recipients and recurring payment rules.
4. Delegate narrowly scoped execution to an agent.
5. See exactly why each payment executed or failed.
6. Pause or revoke the agent immediately.
7. Withdraw unused funds.

## MVP scope

### In scope

- SUI vault and generic `Coin<T>` vault.
- Recurring payment rules.
- Agent execution with `AgentSessionCap`.
- Per-transaction spend limit.
- Rolling-window spend limit.
- Minimum vault balance.
- Session expiration.
- Pause and revoke.
- Onchain events.
- Frontend wallet flows.
- Agent worker loop.
- Local JSON storage for the agent worker.

### Out of scope for MVP

- Swap/rebalance logic.
- OCR invoices.
- Payroll tax/KYC.
- Multi-agent governance.
- Production-grade database migrations.
- Custodial key management.

## Core user flow

```txt
Connect wallet
-> Create AgentVault<T>
-> Deposit funds
-> Add recurring payment rule
-> Agent reads vault state
-> Agent plans due payment
-> Agent executes Move call
-> Contract validates policy
-> Payment transfer happens
-> PaymentExecuted event emitted
-> User sees activity, tx digest, and policy evidence
```

## Product pages

- Landing page: positioning, safety model, wallet CTA.
- Dashboard: connected wallet, package id, network, quick actions.
- Create Vault: policy settings and human-readable intent.
- Vault Detail: balance, rules, agent status, policy status.
- Activity: events and execution history.
- Settings: pause, resume, revoke, withdraw.
## Judging narrative

PolicyPay implements a real agentic execution loop on Sui. The agent can observe state, plan actions, execute transactions, and coordinate multiple recurring payments, but it cannot exceed user-defined onchain boundaries. This makes it safer and more Sui-native than an AI chatbot or generic wallet assistant.
