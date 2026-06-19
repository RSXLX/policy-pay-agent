# Sui Overflow Submission: PolicyPay Agent

## Project

- Name: PolicyPay Agent
- Primary track: The Agentic Web
- Secondary fit: DeFi & Payments / Payments & Wallets
- One-liner: Policy-bound autonomous payment rails on Sui, where an agent can execute recurring payments only inside Move-enforced user limits.

## Short Description

PolicyPay Agent lets a treasury owner create an `AgentVault<T>`, fund it, define recurring payment rules, and issue a scoped `AgentSessionCap` to an automation wallet. The agent can observe due rules and submit payment transactions, but Move checks enforce the maximum payment amount, rolling-window budget, minimum reserve, pause state, revocation state, and session expiry before any funds move.

## Why It Fits The Agentic Web

The product demonstrates an autonomous agent that observes state, plans an action, transacts on Sui, and coordinates recurring payments. The key difference is that authority is modeled as Sui objects and capabilities instead of offchain promises. The backend can automate execution, but the contract decides whether the action is valid.

## Technical Proof

- Testnet package: `0x46d49efb36a1bc3b253d5a02efd60de2668c2155e1efc9145eca0c68c9d2fd62`
- Publish digest: `8ESuKftUyPPrk1FimhbACFooX5qbE2g6dVU4S8JXkp6Z`
- Package Explorer: https://suiexplorer.com/object/0x46d49efb36a1bc3b253d5a02efd60de2668c2155e1efc9145eca0c68c9d2fd62?network=testnet
- Publish transaction: https://suiexplorer.com/txblock/8ESuKftUyPPrk1FimhbACFooX5qbE2g6dVU4S8JXkp6Z?network=testnet
- Move objects: `AgentVault<T>`, `OwnerCap`, `AgentSessionCap`, `PaymentRule`
- Frontend: Next.js wallet dashboard with create, deposit, rule, register, plan, execute, pause, revoke, and Explorer proof surfaces
- Agent service: planner, risk checker, executor, event indexer, and local repository
- SDK: typed transaction builders, schemas, parsers, and formatting helpers

## Submission Assets

- Pitch deck: `output/PolicyPay-Agent-Pitch.pptx`
- Pitch script and recording plan: `docs/pitch-video-script.md`
- Voiceover script: `output/PolicyPay-Agent-Pitch-voiceover.txt`
- Voiceover audio: `output/PolicyPay-Agent-Pitch-voiceover.mp3`
- Subtitle file: `output/PolicyPay-Agent-Pitch.en.srt`
- Recording shotlist: `output/PolicyPay-Agent-Pitch-recording-shotlist.csv`
- Slide-cut video draft: `output/PolicyPay-Agent-Pitch-slidecut.mp4`
- Public asset release: https://github.com/RSXLX/policy-pay-agent/releases/tag/submission-v1
- Readiness report: `output/submission-readiness-latest.json`
- GitHub repository: https://github.com/RSXLX/policy-pay-agent
- Pitch video URL: https://github.com/RSXLX/policy-pay-agent/releases/tag/submission-v1
- Live app URL: to be filled after deployment, or use local walkthrough during recording

## Suggested Submission Description

PolicyPay Agent is a Sui-native autonomous payment product for recurring treasury flows. A user creates a shared `AgentVault<T>`, defines payment rules and risk boundaries, and grants the agent only a scoped `AgentSessionCap`. The agent service can plan and submit due payments, but every payment must pass Move-enforced limits: max per payment, rolling-window spend, reserve floor, pause, revoke, expiry, and recipient/rule checks. This turns autonomous execution into verifiable Sui object authority: the agent can act, but it cannot exceed the user-defined policy.

## Judge Walkthrough

1. Open the dashboard and connect a Sui Testnet wallet.
2. Create an `AgentVault` with conservative limits and an agent wallet.
3. Confirm the transaction and open Sui Explorer from the success screen.
4. Deposit SUI into the vault.
5. Add a recurring payment rule.
6. Register the vault in the agent service.
7. Preview the agent plan, then execute a due rule.
8. Show transaction digest, object links, and event trail.
9. Pause or revoke the agent to show owner-side safety controls.
10. Explain that unsafe payments abort in Move before funds move.

## Final Submission Checklist

- [x] GitHub repository URL added above.
- [x] Pitch video URL added above.
- [ ] Live app URL added above if deployed.
- [ ] `pnpm test` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm verify:product-copy` passes.
- [ ] `pnpm verify:submission` passes after GitHub remote is configured.
