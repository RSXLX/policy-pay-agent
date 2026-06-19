import { z } from 'zod';

export const HexAddressSchema = z.string().regex(/^0x[0-9a-fA-F]+$/, 'expected 0x-prefixed hex');
export const CoinTypeSchema = z.string().min(3);
export const U64StringSchema = z.union([z.string().regex(/^\d+$/), z.bigint(), z.number().int().nonnegative()]);

export const PaymentRuleSchema = z.object({
  id: z.number().int().positive(),
  recipient: HexAddressSchema,
  amount: z.string().regex(/^\d+$/),
  periodMs: z.string().regex(/^\d+$/),
  nextDueMs: z.string().regex(/^\d+$/),
  active: z.boolean(),
  labelHash: z.array(z.number().int().min(0).max(255)).optional(),
});

export type PaymentRule = z.infer<typeof PaymentRuleSchema>;

export const VaultStateSchema = z.object({
  id: HexAddressSchema,
  owner: HexAddressSchema,
  agent: HexAddressSchema,
  balance: z.string().regex(/^\d+$/),
  maxPerTx: z.string().regex(/^\d+$/),
  maxPerWindow: z.string().regex(/^\d+$/),
  windowMs: z.string().regex(/^\d+$/),
  windowStartMs: z.string().regex(/^\d+$/),
  spentInWindow: z.string().regex(/^\d+$/),
  minBalance: z.string().regex(/^\d+$/),
  expiresAtMs: z.string().regex(/^\d+$/),
  paused: z.boolean(),
  revoked: z.boolean(),
  lastNonce: z.number().int().nonnegative(),
  nextRuleId: z.number().int().positive(),
  rules: z.array(PaymentRuleSchema),
});

export type VaultState = z.infer<typeof VaultStateSchema>;

export const PaymentActionSchema = z.object({
  type: z.literal('PAY_RULE'),
  ruleId: z.number().int().positive(),
  recipient: HexAddressSchema,
  amount: z.string().regex(/^\d+$/),
  reason: z.string(),
});

export type PaymentAction = z.infer<typeof PaymentActionSchema>;

export const AgentPlanSchema = z.object({
  vaultId: HexAddressSchema,
  nonce: z.number().int().positive(),
  createdAtMs: z.number().int().positive(),
  actions: z.array(PaymentActionSchema).min(1).max(10),
  explanation: z.string().optional(),
});

export type AgentPlan = z.infer<typeof AgentPlanSchema>;

export const RiskCheckResultSchema = z.object({
  ok: z.boolean(),
  reason: z.string(),
  checks: z.record(z.boolean()).default({}),
});

export type RiskCheckResult = z.infer<typeof RiskCheckResultSchema>;

export const RegisteredVaultSchema = z.object({
  vaultId: HexAddressSchema,
  sessionCapId: HexAddressSchema,
  coinType: CoinTypeSchema,
  packageId: HexAddressSchema,
  label: z.string().optional(),
  createdAtMs: z.number().int().positive().optional(),
});

export type RegisteredVault = z.infer<typeof RegisteredVaultSchema>;

export function toU64String(value: string | number | bigint): string {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid u64 number: ${value}`);
    return String(value);
  }
  if (!/^\d+$/.test(value)) throw new Error(`Invalid u64 string: ${value}`);
  return value;
}

export function toBigInt(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value;
  return BigInt(toU64String(value));
}
