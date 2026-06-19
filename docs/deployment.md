# Deployment Guide

## 1. Install dependencies

```bash
pnpm install
```

## 2. Build Move package

```bash
cd move/agent_treasury
sui move build
sui move test
```

## 3. Publish package

```bash
sui client switch --env testnet
sui client publish --gas-budget 100000000
```

Copy the published package id.

## 4. Configure root env

```bash
cp .env.example .env
```

Update:

```env
PACKAGE_ID=0x...
AGENT_PRIVATE_KEY=suiprivkey1...
AGENT_ADDRESS=0x...
```

## 5. Configure web env

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8787
NEXT_PUBLIC_DEFAULT_COIN_TYPE=0x2::sui::SUI
```

## 6. Start services

```bash
pnpm --filter @policy-pay/agent dev
pnpm --filter @policy-pay/web dev
```

## 7. Register vault with agent

After creating a vault in the UI, call:

```bash
curl -X POST http://localhost:8787/vaults \
  -H 'content-type: application/json' \
  -d '{
    "vaultId":"0x...",
    "sessionCapId":"0x...",
    "coinType":"0x2::sui::SUI",
    "packageId":"0x...",
    "label":"Operating Vault"
  }'
```

## 8. Production notes

- Use a production DB instead of JSON store.
- Run agent behind authenticated API.
- Store agent private key in KMS.
- Add transaction simulation before submitting.
- Add a real event indexer for activity reconciliation.
