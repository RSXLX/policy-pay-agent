import { buildExecuteRulePaymentTx, hashJson, stableStringify, type AgentPlan, type RegisteredVault } from '@policy-pay/sdk';
import type { SuiClient } from '../sui/client.js';

export interface ExecutePlanOptions {
  client: SuiClient;
  signer: any;
  registeredVault: RegisteredVault;
  plan: AgentPlan;
}

export interface ExecutePlanResult {
  digest: string;
  planHashBytes: number[];
  raw: unknown;
}

export async function executePlan(options: ExecutePlanOptions): Promise<ExecutePlanResult> {
  if (options.plan.actions.length !== 1) {
    throw new Error('MVP executor supports exactly one action per transaction.');
  }

  const action = options.plan.actions[0];
  if (!action) throw new Error('Plan has no action');

  const planHashBytes = hashJson(options.plan);

  const tx = buildExecuteRulePaymentTx({
    packageId: options.registeredVault.packageId,
    coinType: options.registeredVault.coinType,
    vaultId: options.registeredVault.vaultId,
    sessionCapId: options.registeredVault.sessionCapId,
    ruleId: action.ruleId,
    nonce: options.plan.nonce,
    planHashBytes,
  });

  const result = await options.signer.signAndExecuteTransaction({
    transaction: tx,
    client: options.client,
    options: {
      showEffects: true,
      showEvents: true,
      showBalanceChanges: true,
      showObjectChanges: true,
    },
  });

  const digest = result.digest ?? result.Transaction?.digest ?? result.transactionDigest;
  if (!digest) {
    throw new Error(`Unable to read transaction digest from result: ${stableStringify(result)}`);
  }

  return {
    digest,
    planHashBytes,
    raw: result,
  };
}

export function bytesToHex(bytes: number[]) {
  return `0x${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
