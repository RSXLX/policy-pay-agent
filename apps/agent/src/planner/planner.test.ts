import { describe, expect, it } from 'vitest';
import type { VaultState } from '@policy-pay/sdk';
import { createPaymentPlan } from './planner';

const baseState: VaultState = {
  id: '0x1',
  owner: '0x2',
  agent: '0x3',
  balance: '800000000',
  maxPerTx: '200000000',
  maxPerWindow: '300000000',
  windowMs: '120000',
  windowStartMs: '0',
  spentInWindow: '0',
  minBalance: '100000000',
  expiresAtMs: '9999999999999',
  paused: false,
  revoked: false,
  lastNonce: 7,
  nextRuleId: 4,
  rules: [
    {
      id: 1,
      recipient: '0x4',
      amount: '100000000',
      periodMs: '30000',
      nextDueMs: '1000',
      active: true,
    },
    {
      id: 2,
      recipient: '0x5',
      amount: '120000000',
      periodMs: '30000',
      nextDueMs: '999999',
      active: true,
    },
    {
      id: 3,
      recipient: '0x6',
      amount: '100000000',
      periodMs: '30000',
      nextDueMs: '500',
      active: false,
    },
  ],
};

describe('createPaymentPlan', () => {
  it('selects due active rules and advances the nonce', () => {
    const plan = createPaymentPlan(baseState, { nowMs: 1500 });

    expect(plan).toMatchObject({
      vaultId: '0x1',
      nonce: 8,
      actions: [
        {
          type: 'PAY_RULE',
          ruleId: 1,
          recipient: '0x4',
          amount: '100000000',
        },
      ],
    });
  });

  it('returns null when no rules are due', () => {
    expect(createPaymentPlan(baseState, { nowMs: 100 })).toBeNull();
  });

  it('honors a preferred rule filter', () => {
    expect(createPaymentPlan(baseState, { nowMs: 1500, preferredRuleId: 2 })).toBeNull();
  });
});
