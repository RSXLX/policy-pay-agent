# Architecture

## Components

```txt
apps/web
  Next.js UI
  Sui wallet connection
  transaction builders from packages/sdk

packages/sdk
  shared schemas
  typed tx builders
  vault parsers
  hashing utilities

apps/agent
  worker loop
  state reader
  planner
  risk checker
  tx executor
  event indexer
  local repository

move/agent_treasury
  AgentVault<T>
  OwnerCap
  AgentSessionCap
  PaymentRule
  policy checks
  events
```

## Data flow

```txt
Owner wallet signs create_vault
  -> Move creates OwnerCap + AgentSessionCap + shared AgentVault
  -> OwnerCap goes to owner
  -> AgentSessionCap goes to agent

Owner wallet signs deposit
  -> Coin<T> enters vault balance

Owner wallet signs add_rule
  -> rule stored inside vault

Agent service polls vault
  -> parses rules
  -> selects due rules
  -> risk-checks plan
  -> signs execute_rule_payment with agent key

Move executes payment
  -> checks cap, sender, due time, limits, nonce, pause, revoke, expiry
  -> splits vault balance
  -> transfers Coin<T> to recipient
  -> emits PaymentExecuted event
```

## Trust boundaries

| Layer | Trust level | Role |
|---|---:|---|
| Move contract | Highest | Final policy enforcement |
| Sui object/event state | High | Evidence and source of truth |
| Agent backend | Medium | Planner/executor, cannot bypass Move |
| Frontend | Low | UX and tx construction |
| LLM | Lowest | Explanation only, never authority |

## Object model

- `AgentVault<T>` is shared so both owner and agent can reference it.
- `OwnerCap` is owned by the owner and authorizes admin operations.
- `AgentSessionCap` is owned by the agent and authorizes only payment execution.
- Payment rules are stored in the vault to prevent prompt-level recipient mutation.

## Extensibility

Future extensions can add:

- Batch execution of multiple due rules.
- Payment Kit receipts.
- Walrus invoice storage.
- Seal encrypted invoices.
- Stablecoin-specific UX.
- DAO bounty payout module.
- DeepBook/DeFi treasury rebalancing module.
