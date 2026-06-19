import { describe, expect, it } from 'vitest';
import { parseVaultObject } from './parser';

describe('parseVaultObject', () => {
  it('normalizes Sui JSON object fields into VaultState', () => {
    const parsed = parseVaultObject({
      objectId: '0x1',
      content: {
        fields: {
          id: { id: '0x1' },
          owner: '0x2',
          agent: '0x3',
          balance: { fields: { value: '500000000' } },
          max_per_tx: '200000000',
          max_per_window: '300000000',
          window_ms: '120000',
          window_start_ms: '0',
          spent_in_window: '0',
          min_balance: '100000000',
          expires_at_ms: '9999999999999',
          paused: false,
          revoked: false,
          last_nonce: 4,
          next_rule_id: 2,
          rules: [
            {
              fields: {
                id: 1,
                recipient: '0x4',
                amount: '100000000',
                period_ms: '30000',
                next_due_ms: '1000',
                active: true,
                label_hash: { fields: { contents: [1, 2, 3] } },
              },
            },
          ],
        },
      },
    });

    expect(parsed).toMatchObject({
      id: '0x1',
      balance: '500000000',
      maxPerTx: '200000000',
      maxPerWindow: '300000000',
      lastNonce: 4,
      rules: [
        {
          id: 1,
          recipient: '0x4',
          labelHash: [1, 2, 3],
        },
      ],
    });
  });
});
