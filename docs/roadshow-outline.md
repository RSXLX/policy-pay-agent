# Roadshow Outline

## Slide 1: PolicyPay Agent

Policy-bound autonomous payments on Sui.

Key message: the agent can execute payments, but only inside Move-enforced user boundaries.

## Slide 2: Problem

Teams, DAOs, and protocols need recurring crypto payments, but today's options are either manual multisig operations or
overpowered automation that requires too much trust.

## Slide 3: Product

PolicyPay lets a user create an onchain vault, define recipients and limits, delegate a scoped agent cap, and let an
agent execute due payments automatically.

## Slide 4: Why Sui

Sui objects make the authorization model concrete:

- `AgentVault<T>` holds funds and policy.
- `OwnerCap` controls administration.
- `AgentSessionCap` gives the agent narrow execution authority.
- events and object state provide evidence for every successful action.

## Slide 5: Safety Model

The agent never holds the owner wallet key. Move enforces recipient, amount, due time, nonce, rolling-window spend,
minimum reserve, pause, revoke, and expiration checks.

## Slide 6: Agent Loop

Observe vault state, find due rules, risk-check the plan, submit a transaction with the agent key, then index the result.
The backend can help automate execution, but it cannot bypass contract policy.

## Slide 7: Product Walkthrough

Create a vault, deposit SUI, add Alice and Bob payment rules, let the agent execute due payments, then show a blocked
payment when the rolling-window limit is exceeded.

## Slide 8: Chain Evidence

The dashboard exposes the package id, vault objects, transaction digest, event trail, and Explorer links so reviewers can
verify that the workflow used Sui rather than a hollow UI.

## Slide 9: Current Build

Implemented pieces:

- Sui Move vault module and policy surface.
- TypeScript SDK builders and parsers.
- autonomous agent planner, risk checker, executor, and local store.
- redesigned Next.js dashboard.
- project docs, pitch script, and roadshow deck.

## Slide 10: Roadmap and Ask

Next milestones:

- finalize version-specific Move unit tests with the chosen Sui CLI;
- add transaction simulation and indexer-backed reconciliation;
- support batch execution and receipt export;
- harden agent key management with KMS.

Ask: feedback, pilot treasury workflows, and Sui ecosystem integrations.
