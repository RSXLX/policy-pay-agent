# Security Model

## Non-negotiable principle

The agent never holds the user's private key. It only holds a scoped `AgentSessionCap` and can only call Move functions that accept and validate that cap.

## Assets

- User funds held in `AgentVault<T>`.
- `OwnerCap`, controlled by the owner.
- `AgentSessionCap`, controlled by the agent.
- Payment rules stored onchain.
- Execution events emitted onchain.

## Threats and controls

| Threat | Control |
|---|---|
| Agent sends funds to arbitrary recipient | Recipient is fixed inside onchain rule |
| Prompt injection changes payment amount | Amount is fixed inside onchain rule |
| Agent executes too early | `now >= rule.next_due_ms` check |
| Agent repeats payment | `nonce == last_nonce + 1` and due-time update |
| Agent overspends in one tx | `max_per_tx` check |
| Agent drains over time | `max_per_window` and `min_balance` checks |
| Agent continues after user loses trust | `pause` and `revoke_agent` |
| Agent executes after intended period | `expires_at_ms` check |
| Wrong agent uses cap | `session_cap.agent == tx_context::sender(ctx)` |
| Stale backend state | Move contract is source of truth |
| Blind signing | Frontend renders human-readable intent before submit |

## Failure model

Move aborts roll back the whole transaction. Failed attempts do not emit onchain events. The agent service stores failed attempts offchain for debugging and UI display.

## LLM boundary

LLM can:

- parse natural language into draft form values;
- explain why a plan is safe/unsafe;
- summarize activity;
- generate user-readable intent text.

LLM cannot:

- sign transactions;
- create or alter authorization by itself;
- bypass Move policy;
- add recipients without owner signing;
- increase limits without owner signing.

## Production hardening checklist

- Use KMS/HSM for agent key.
- Add rate limits and IP allowlists to agent API.
- Add typed BCS parsing or generated bindings.
- Add monitoring and alerting for failed executions.
- Add transaction simulation before submit.
- Add multi-agent key rotation.
- Add Payment Kit receipts for duplicate prevention.
- Add indexer-backed event reconciliation.
- Add formal Move tests for every abort path.
