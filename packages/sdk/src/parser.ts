import { PaymentRule, VaultState, VaultStateSchema } from './types.js';

/**
 * Parses the JSON representation returned by Sui Core API `getObject({ include: { json: true } })`.
 *
 * gRPC, GraphQL, and JSON-RPC may shape UID/Balance fields differently. This parser is intentionally
 * defensive for a hackathon/product scaffold. For production, prefer BCS parsing or generated bindings.
 */
export function parseVaultObject(object: any): VaultState {
  const json = object?.json ?? object?.content?.fields ?? object?.fields ?? object;
  if (!json) throw new Error('Object does not include JSON fields. Fetch with include: { json: true }.');

  const id = extractId(json.id ?? object.objectId ?? object.object_id);
  const balance = extractBalance(json.balance);

  const rulesRaw = Array.isArray(json.rules) ? json.rules : json.rules?.fields ?? [];
  const rules: PaymentRule[] = rulesRaw.map((raw: any) => {
    const r = raw.fields ?? raw;
    return {
      id: Number(r.id),
      recipient: String(r.recipient),
      amount: String(r.amount),
      periodMs: String(r.period_ms ?? r.periodMs),
      nextDueMs: String(r.next_due_ms ?? r.nextDueMs),
      active: Boolean(r.active),
      labelHash: normalizeBytes(r.label_hash ?? r.labelHash),
    };
  });

  return VaultStateSchema.parse({
    id,
    owner: String(json.owner),
    agent: String(json.agent),
    balance,
    maxPerTx: String(json.max_per_tx ?? json.maxPerTx),
    maxPerWindow: String(json.max_per_window ?? json.maxPerWindow),
    windowMs: String(json.window_ms ?? json.windowMs),
    windowStartMs: String(json.window_start_ms ?? json.windowStartMs),
    spentInWindow: String(json.spent_in_window ?? json.spentInWindow),
    minBalance: String(json.min_balance ?? json.minBalance),
    expiresAtMs: String(json.expires_at_ms ?? json.expiresAtMs),
    paused: Boolean(json.paused),
    revoked: Boolean(json.revoked),
    lastNonce: Number(json.last_nonce ?? json.lastNonce),
    nextRuleId: Number(json.next_rule_id ?? json.nextRuleId),
    rules,
  });
}

export function extractId(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value?.id === 'string') return value.id;
  if (typeof value?.fields?.id === 'string') return value.fields.id;
  throw new Error(`Unable to extract id from ${JSON.stringify(value)}`);
}

export function extractBalance(value: any): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  if (value?.value !== undefined) return String(value.value);
  if (value?.fields?.value !== undefined) return String(value.fields.value);
  if (value?.fields?.balance !== undefined) return String(value.fields.balance);
  return '0';
}

function normalizeBytes(value: any): number[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.map(Number);
  if (Array.isArray(value.fields?.contents)) return value.fields.contents.map(Number);
  return undefined;
}
