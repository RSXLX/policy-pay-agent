# @policy-pay/sdk

Shared TypeScript SDK for PolicyPay.

## Included

- Transaction builders for Move entry functions.
- Vault state parser.
- Zod schemas.
- Formatting helpers.
- Stable hash helpers for plan hashes.

## Example

```ts
import { buildAddRuleTx, suiToMist } from '@policy-pay/sdk';

const tx = buildAddRuleTx({
  packageId: '0x...',
  coinType: '0x2::sui::SUI',
  vaultId: '0x...',
  ownerCapId: '0x...',
  recipient: '0x...',
  amount: suiToMist('0.1'),
  periodMs: 30_000n,
  firstDueMs: BigInt(Date.now() + 5_000),
  label: 'vendor payout',
});
```
