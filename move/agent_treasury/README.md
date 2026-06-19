# agent_treasury Move Package

This package defines the onchain safety boundary for PolicyPay Agent.

## Key objects

- `AgentVault<T>`: shared object holding treasury balance and payment rules.
- `OwnerCap`: owned object that authorizes admin operations.
- `AgentSessionCap`: owned object that authorizes agent execution.
- `PaymentRule`: recurring payment rule stored inside the vault.

## Build

```bash
sui move build
```

## Test

```bash
sui move test
```

The test suite covers policy execution state updates and abort paths for agent identity, caps, timing, spend limits,
minimum retained balance, paused vaults, revoked agents, and expired sessions. From the repository root, the same suite
is available through:

```bash
pnpm move:test
```

## Publish

```bash
sui client publish --gas-budget 100000000
```

## Important

The contract is generic over `T`, so it can hold `SUI` or any Sui coin type. The recorded product walkthrough should use `0x2::sui::SUI` because Testnet funding is easiest.
