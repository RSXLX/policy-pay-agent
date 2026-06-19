import { stableStringify, type RegisteredVault } from '@policy-pay/sdk';
import { bytesToHex, executePlan } from './executor/executor.js';
import { logger } from './logger.js';
import { createPaymentPlan } from './planner/planner.js';
import { runRiskChecks } from './planner/risk-check.js';
import { readVaultState } from './sui/state.js';
import type { JsonStore } from './db/store.js';
import type { SuiClient } from './sui/client.js';

export interface WorkerContext {
  store: JsonStore;
  client: SuiClient;
  signer: any;
}

export async function processVault(ctx: WorkerContext, vault: RegisteredVault, preferredRuleId?: number) {
  try {
    const state = await readVaultState(ctx.client, vault.vaultId);
    const plan = createPaymentPlan(state, { preferredRuleId });

    if (!plan) {
      return { status: 'SKIPPED' as const, reason: 'No due rules' };
    }

    const risk = runRiskChecks(state, plan);
    if (!risk.ok) {
      await ctx.store.addExecution({
        id: crypto.randomUUID(),
        vaultId: vault.vaultId,
        planHashHex: '0x',
        status: 'SKIPPED',
        reason: risk.reason,
        createdAtMs: Date.now(),
        raw: { plan, risk },
      });
      return { status: 'SKIPPED' as const, reason: risk.reason, plan, risk };
    }

    const result = await executePlan({
      client: ctx.client,
      signer: ctx.signer,
      registeredVault: vault,
      plan,
    });

    await ctx.store.addExecution({
      id: crypto.randomUUID(),
      vaultId: vault.vaultId,
      planHashHex: bytesToHex(result.planHashBytes),
      txDigest: result.digest,
      status: 'EXECUTED',
      reason: risk.reason,
      createdAtMs: Date.now(),
      raw: result.raw,
    });

    logger.info({ vaultId: vault.vaultId, digest: result.digest }, 'Executed payment plan');
    return { status: 'EXECUTED' as const, digest: result.digest, plan, risk };
  } catch (error) {
    const message = error instanceof Error ? error.message : stableStringify(error);
    logger.error({ err: error, vaultId: vault.vaultId }, 'Failed processing vault');
    await ctx.store.addExecution({
      id: crypto.randomUUID(),
      vaultId: vault.vaultId,
      planHashHex: '0x',
      status: 'FAILED',
      reason: message,
      createdAtMs: Date.now(),
    });
    return { status: 'FAILED' as const, reason: message };
  }
}

export async function processAllVaults(ctx: WorkerContext) {
  const vaults = await ctx.store.listVaults();
  for (const vault of vaults) {
    await processVault(ctx, vault);
  }
}

export function startWorker(ctx: WorkerContext, intervalMs: number) {
  const tick = async () => {
    await processAllVaults(ctx);
  };

  void tick();
  const handle = setInterval(() => void tick(), intervalMs);
  return () => clearInterval(handle);
}
