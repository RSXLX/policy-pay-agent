# DeepSurge Form Fields

## Hackathon

Sui Overflow 2026

## Project Name

PolicyPay Agent

## Track

The Agentic Web

## Secondary Track Fit

DeFi & Payments / Payments & Wallets

## Short Tagline

Policy-bound autonomous payment rails on Sui.

## Short Description

PolicyPay Agent lets a treasury owner create a Sui `AgentVault<T>`, fund it, define recurring payment rules, and grant an automation wallet only a scoped `AgentSessionCap`. The agent can plan and submit payments, but Move enforces the user's limits before funds move.

## Full Description

PolicyPay Agent is a Sui-native autonomous payment product for recurring treasury flows. A user creates a shared `AgentVault<T>`, sets hard limits, and issues an `AgentSessionCap` to an agent wallet. The agent service observes due rules, builds a plan, risk-checks it, and submits a transaction. The contract remains the final authority: max payment amount, rolling-window spend, reserve floor, pause, revoke, expiry, nonce, and recipient checks are enforced in Move.

The project demonstrates an Agentic Web pattern where automation can act without receiving broad custody. Authority is represented as Sui objects and capabilities, and every meaningful action leaves package, object, digest, and event evidence for reviewers to inspect.

## How It Is Made

- Move package: `AgentVault<T>`, `OwnerCap`, `AgentSessionCap`, `PaymentRule`, events, and policy abort paths.
- TypeScript SDK: typed transaction builders, schemas, parsers, formatting helpers, and stable plan hashing.
- Next.js dashboard: wallet connection, vault creation, funding, rule creation, agent registration, plan preview, execution, pause/revoke controls, and Explorer links.
- Agent service: worker loop, planner, risk checker, executor, event indexer, and local repository.
- Verification: TypeScript tests, Move unit tests, production build, product-copy gate, and submission readiness JSON.

## Links

- GitHub: https://github.com/RSXLX/policy-pay-agent
- Website: https://policypay-web-deploy.vercel.app
- Public assets: https://github.com/RSXLX/policy-pay-agent/releases/tag/submission-v1
- Pitch video: https://github.com/RSXLX/policy-pay-agent/releases/tag/submission-v1
- Package Explorer: https://suiexplorer.com/object/0x46d49efb36a1bc3b253d5a02efd60de2668c2155e1efc9145eca0c68c9d2fd62?network=testnet
- Publish transaction: https://suiexplorer.com/txblock/8ESuKftUyPPrk1FimhbACFooX5qbE2g6dVU4S8JXkp6Z?network=testnet

## Package

- Network: Testnet
- Package ID: `0x46d49efb36a1bc3b253d5a02efd60de2668c2155e1efc9145eca0c68c9d2fd62`
- Publish digest: `8ESuKftUyPPrk1FimhbACFooX5qbE2g6dVU4S8JXkp6Z`

## Media Notes

- Use `output/PolicyPay-Agent-Pitch-slidecut.mp4` or the GitHub Release asset as the current pitch video asset.
- Use `output/PolicyPay-Agent-Pitch.pptx` as the editable pitch deck.
- Use `output/PolicyPay-Agent-Pitch.en.srt` for captions.
- For the final screen recording, follow `docs/pitch-video-script.md` and replace the video link with the final hosted recording URL.
