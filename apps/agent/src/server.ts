import Fastify from 'fastify';
import { RegisteredVaultSchema } from '@policy-pay/sdk';
import type { WorkerContext } from './worker.js';
import { processVault } from './worker.js';
import { readVaultState } from './sui/state.js';
import { createPaymentPlan } from './planner/planner.js';
import { runRiskChecks } from './planner/risk-check.js';
import { logger } from './logger.js';

export function createServer(ctx: WorkerContext) {
  const app = Fastify({ logger });

  app.get('/health', async () => ({ ok: true, now: Date.now() }));

  app.get('/vaults', async () => ctx.store.listVaults());

  app.post('/vaults', async (request, reply) => {
    const parsed = RegisteredVaultSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const vault = await ctx.store.upsertVault(parsed.data);
    return vault;
  });

  app.get('/vaults/:vaultId/state', async (request) => {
    const { vaultId } = request.params as { vaultId: string };
    return readVaultState(ctx.client, vaultId);
  });

  app.post('/vaults/:vaultId/plan', async (request, reply) => {
    const { vaultId } = request.params as { vaultId: string };
    const registered = await ctx.store.getVault(vaultId);
    if (!registered) return reply.status(404).send({ error: 'Vault is not registered with agent' });

    const state = await readVaultState(ctx.client, vaultId);
    const plan = createPaymentPlan(state);
    if (!plan) return { plan: null, risk: { ok: true, reason: 'No due rules', checks: {} } };
    const risk = runRiskChecks(state, plan);
    return { plan, risk };
  });

  app.post('/vaults/:vaultId/execute', async (request, reply) => {
    const { vaultId } = request.params as { vaultId: string };
    const body = (request.body ?? {}) as { ruleId?: number };
    const registered = await ctx.store.getVault(vaultId);
    if (!registered) return reply.status(404).send({ error: 'Vault is not registered with agent' });
    return processVault(ctx, registered, body.ruleId);
  });

  app.get('/vaults/:vaultId/activity', async (request) => {
    const { vaultId } = request.params as { vaultId: string };
    return ctx.store.listExecutions(vaultId);
  });

  return app;
}
