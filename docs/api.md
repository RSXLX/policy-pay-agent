# Agent API

Base URL: `http://localhost:8787`

## `GET /health`

Returns service health.

## `GET /vaults`

Returns locally registered vaults.

## `POST /vaults`

Registers a vault with the local agent service.

```json
{
  "vaultId": "0x...",
  "sessionCapId": "0x...",
  "coinType": "0x2::sui::SUI",
  "packageId": "0x...",
  "label": "Operating Vault"
}
```

## `GET /vaults/:vaultId/state`

Reads and parses the onchain vault object.

## `POST /vaults/:vaultId/plan`

Creates a dry-run plan.

## `POST /vaults/:vaultId/execute`

Executes the first due action if risk checks pass.

```json
{
  "ruleId": 1
}
```

If no `ruleId` is supplied, the service chooses the first due rule.

## `GET /vaults/:vaultId/activity`

Returns local execution and event history.
