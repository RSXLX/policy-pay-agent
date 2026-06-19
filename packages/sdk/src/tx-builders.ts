import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { CLOCK_OBJECT_ID, assertObjectId, vaultTarget } from './constants.js';
import { hashString } from './hash.js';
import { toBigInt } from './types.js';

export interface CreateVaultTxParams {
  packageId: string;
  coinType: string;
  agentAddress: string;
  maxPerTx: string | number | bigint;
  maxPerWindow: string | number | bigint;
  windowMs: string | number | bigint;
  minBalance: string | number | bigint;
  expiresAtMs: string | number | bigint;
}

export function buildCreateVaultTx(params: CreateVaultTxParams) {
  const tx = new Transaction();

  tx.moveCall({
    target: vaultTarget(params.packageId, 'create_vault'),
    typeArguments: [params.coinType],
    arguments: [
      tx.pure.address(params.agentAddress),
      tx.pure.u64(toBigInt(params.maxPerTx)),
      tx.pure.u64(toBigInt(params.maxPerWindow)),
      tx.pure.u64(toBigInt(params.windowMs)),
      tx.pure.u64(toBigInt(params.minBalance)),
      tx.pure.u64(toBigInt(params.expiresAtMs)),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export interface DepositTxParams {
  packageId: string;
  coinType: string;
  vaultId: string;
  amount: string | number | bigint;
  useGasCoin?: boolean;
}

export function buildDepositTx(params: DepositTxParams) {
  assertObjectId(params.vaultId, 'vaultId');
  const tx = new Transaction();

  tx.moveCall({
    target: vaultTarget(params.packageId, 'deposit'),
    typeArguments: [params.coinType],
    arguments: [
      tx.object(params.vaultId),
      coinWithBalance({
        balance: toBigInt(params.amount),
        type: params.coinType,
        useGasCoin: params.useGasCoin ?? true,
      }),
    ],
  });

  return tx;
}

export interface AddRuleTxParams {
  packageId: string;
  coinType: string;
  vaultId: string;
  ownerCapId: string;
  recipient: string;
  amount: string | number | bigint;
  periodMs: string | number | bigint;
  firstDueMs: string | number | bigint;
  label?: string;
  labelHashBytes?: number[];
}

export function buildAddRuleTx(params: AddRuleTxParams) {
  assertObjectId(params.vaultId, 'vaultId');
  assertObjectId(params.ownerCapId, 'ownerCapId');

  const tx = new Transaction();
  const labelHash = params.labelHashBytes ?? hashString(params.label ?? '');

  tx.moveCall({
    target: vaultTarget(params.packageId, 'add_rule'),
    typeArguments: [params.coinType],
    arguments: [
      tx.object(params.vaultId),
      tx.object(params.ownerCapId),
      tx.pure.address(params.recipient),
      tx.pure.u64(toBigInt(params.amount)),
      tx.pure.u64(toBigInt(params.periodMs)),
      tx.pure.u64(toBigInt(params.firstDueMs)),
      tx.pure.vector('u8', labelHash),
    ],
  });

  return tx;
}

export interface ExecuteRuleTxParams {
  packageId: string;
  coinType: string;
  vaultId: string;
  sessionCapId: string;
  ruleId: string | number | bigint;
  nonce: string | number | bigint;
  planHashBytes: number[];
}

export function buildExecuteRulePaymentTx(params: ExecuteRuleTxParams) {
  assertObjectId(params.vaultId, 'vaultId');
  assertObjectId(params.sessionCapId, 'sessionCapId');

  const tx = new Transaction();

  tx.moveCall({
    target: vaultTarget(params.packageId, 'execute_rule_payment'),
    typeArguments: [params.coinType],
    arguments: [
      tx.object(params.vaultId),
      tx.object(params.sessionCapId),
      tx.pure.u64(toBigInt(params.ruleId)),
      tx.pure.u64(toBigInt(params.nonce)),
      tx.pure.vector('u8', params.planHashBytes),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export interface OwnerActionTxParams {
  packageId: string;
  coinType: string;
  vaultId: string;
  ownerCapId: string;
}

export function buildPauseTx(params: OwnerActionTxParams) {
  return buildOwnerActionTx(params, 'pause');
}

export function buildResumeTx(params: OwnerActionTxParams) {
  return buildOwnerActionTx(params, 'resume');
}

export function buildRevokeAgentTx(params: OwnerActionTxParams) {
  return buildOwnerActionTx(params, 'revoke_agent');
}

export function buildDisableRuleTx(params: OwnerActionTxParams & { ruleId: string | number | bigint }) {
  const tx = new Transaction();
  tx.moveCall({
    target: vaultTarget(params.packageId, 'disable_rule'),
    typeArguments: [params.coinType],
    arguments: [
      tx.object(params.vaultId),
      tx.object(params.ownerCapId),
      tx.pure.u64(toBigInt(params.ruleId)),
    ],
  });
  return tx;
}

export function buildWithdrawTx(
  params: OwnerActionTxParams & { amount: string | number | bigint },
) {
  const tx = new Transaction();
  tx.moveCall({
    target: vaultTarget(params.packageId, 'owner_withdraw'),
    typeArguments: [params.coinType],
    arguments: [
      tx.object(params.vaultId),
      tx.object(params.ownerCapId),
      tx.pure.u64(toBigInt(params.amount)),
    ],
  });
  return tx;
}

function buildOwnerActionTx(params: OwnerActionTxParams, functionName: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: vaultTarget(params.packageId, functionName),
    typeArguments: [params.coinType],
    arguments: [tx.object(params.vaultId), tx.object(params.ownerCapId)],
  });
  return tx;
}
