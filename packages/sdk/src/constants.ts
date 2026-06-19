import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui/utils';

export const CLOCK_OBJECT_ID = '0x6';
export const SUI_COIN_TYPE = '0x2::sui::SUI';

export const DEFAULT_LIMITS = {
  maxPerTxMist: 200_000_000n,
  maxPerWindowMist: 300_000_000n,
  minBalanceMist: 100_000_000n,
  windowMs: 120_000n,
};

export function vaultTarget(packageId: string, functionName: string) {
  assertPackageId(packageId);
  return `${packageId}::vault::${functionName}`;
}

export function assertPackageId(packageId: string) {
  if (!isValidAddress(packageId)) {
    throw new Error(`Invalid package id: ${packageId}`);
  }
}

export function assertObjectId(objectId: string, name = 'objectId') {
  if (!isValidAddress(objectId)) {
    throw new Error(`Invalid ${name}: ${objectId}`);
  }
}

function isValidAddress(value: string) {
  if (!value || !value.startsWith('0x')) return false;
  try {
    return isValidSuiAddress(normalizeSuiAddress(value));
  } catch {
    return false;
  }
}
