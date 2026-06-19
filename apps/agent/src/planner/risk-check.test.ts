import { describe, expect, it } from 'vitest';
import { runRiskChecks } from './risk-check.js';
import type { AgentPlan, VaultState } from '@policy-pay/sdk';

const baseState: VaultState = {
  id: '0x1',
  owner: '0x2',
  agent: '0x3',
  balance: '800000000',
  maxPerTx: '200000000',
  maxPerWindow: '300000000',
  windowMs: '120000',
  windowStartMs: '0',
  spentInWindow: '250000000',
  minBalance: '100000000',
  expiresAtMs: '9999999999999',
  paused: false,
  revoked: false,
  lastNonce: 1,
  nextRuleId: 2,
  rules: [
    {
      id: 1,
      recipient: '0x4',
      amount: '100000000',
      periodMs: '30000',
      nextDueMs: '0',
      active: true,
    },
  ],
};

const plan: AgentPlan = {
  vaultId: '0x1',
  nonce: 2,
  createdAtMs: 1,
  actions: [
    {
      type: 'PAY_RULE',
      ruleId: 1,
      recipient: '0x4',
      amount: '100000000',
      reason: 'due',
    },
  ],
};

describe('risk checks', () => {
  it('blocks rolling window overspend', () => {
    const result = runRiskChecks(baseState, plan, 1);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('rolling window');
  });

  it('allows after window resets', () => {
    const result = runRiskChecks(baseState, plan, 130000);
    expect(result.ok).toBe(true);
  });
});
