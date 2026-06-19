import { AgentPlanSchema, type AgentPlan, type VaultState } from '@policy-pay/sdk';

export interface PlannerOptions {
  nowMs?: number;
  maxActions?: number;
  preferredRuleId?: number;
}

export function createPaymentPlan(state: VaultState, options: PlannerOptions = {}): AgentPlan | null {
  const now = options.nowMs ?? Date.now();
  const maxActions = options.maxActions ?? 1;

  const dueRules = state.rules
    .filter((rule) => rule.active)
    .filter((rule) => now >= Number(rule.nextDueMs))
    .filter((rule) => (options.preferredRuleId ? rule.id === options.preferredRuleId : true))
    .slice(0, maxActions);

  if (dueRules.length === 0) return null;

  return AgentPlanSchema.parse({
    vaultId: state.id,
    nonce: state.lastNonce + 1,
    createdAtMs: now,
    actions: dueRules.map((rule) => ({
      type: 'PAY_RULE',
      ruleId: rule.id,
      recipient: rule.recipient,
      amount: rule.amount,
      reason: `Rule ${rule.id} is due at ${new Date(Number(rule.nextDueMs)).toISOString()}`,
    })),
    explanation: `Selected ${dueRules.length} due payment rule(s).`,
  });
}
