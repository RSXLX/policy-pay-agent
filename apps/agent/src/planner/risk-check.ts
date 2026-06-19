import type { AgentPlan, RiskCheckResult, VaultState } from '@policy-pay/sdk';

export function runRiskChecks(state: VaultState, plan: AgentPlan, nowMs = Date.now()): RiskCheckResult {
  const checks: Record<string, boolean> = {};

  checks.notPaused = !state.paused;
  if (!checks.notPaused) return fail('Vault is paused', checks);

  checks.notRevoked = !state.revoked;
  if (!checks.notRevoked) return fail('Agent is revoked', checks);

  checks.notExpired = BigInt(state.expiresAtMs) >= BigInt(nowMs);
  if (!checks.notExpired) return fail('Agent session expired', checks);

  checks.validNonce = plan.nonce === state.lastNonce + 1;
  if (!checks.validNonce) return fail('Plan nonce is stale', checks);

  let projectedWindowSpend = BigInt(state.spentInWindow);
  const windowHasExpired = BigInt(nowMs) >= BigInt(state.windowStartMs) + BigInt(state.windowMs);
  if (windowHasExpired) projectedWindowSpend = 0n;

  let projectedBalance = BigInt(state.balance);

  for (const action of plan.actions) {
    const amount = BigInt(action.amount);
    const rule = state.rules.find((r) => r.id === action.ruleId);

    checks[`rule.${action.ruleId}.exists`] = Boolean(rule);
    if (!rule) return fail(`Rule ${action.ruleId} does not exist`, checks);

    checks[`rule.${action.ruleId}.active`] = rule.active;
    if (!rule.active) return fail(`Rule ${action.ruleId} is inactive`, checks);

    checks[`rule.${action.ruleId}.recipientMatch`] = rule.recipient === action.recipient;
    if (rule.recipient !== action.recipient) return fail(`Rule ${action.ruleId} recipient mismatch`, checks);

    checks[`rule.${action.ruleId}.amountMatch`] = rule.amount === action.amount;
    if (rule.amount !== action.amount) return fail(`Rule ${action.ruleId} amount mismatch`, checks);

    checks[`rule.${action.ruleId}.due`] = BigInt(nowMs) >= BigInt(rule.nextDueMs);
    if (!checks[`rule.${action.ruleId}.due`]) return fail(`Rule ${action.ruleId} is not due`, checks);

    checks[`rule.${action.ruleId}.maxPerTx`] = amount <= BigInt(state.maxPerTx);
    if (!checks[`rule.${action.ruleId}.maxPerTx`]) {
      return fail(`Rule ${action.ruleId} exceeds max_per_tx`, checks);
    }

    projectedWindowSpend += amount;
    checks[`rule.${action.ruleId}.windowLimit`] = projectedWindowSpend <= BigInt(state.maxPerWindow);
    if (!checks[`rule.${action.ruleId}.windowLimit`]) {
      return fail(`Rule ${action.ruleId} exceeds rolling window limit`, checks);
    }

    projectedBalance -= amount;
    checks[`rule.${action.ruleId}.minBalance`] = projectedBalance >= BigInt(state.minBalance);
    if (!checks[`rule.${action.ruleId}.minBalance`]) {
      return fail(`Rule ${action.ruleId} would violate min_balance`, checks);
    }
  }

  return { ok: true, reason: 'All risk checks passed', checks };
}

function fail(reason: string, checks: Record<string, boolean>): RiskCheckResult {
  return { ok: false, reason, checks };
}
