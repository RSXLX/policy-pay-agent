import { parseVaultObject, type VaultState } from '@policy-pay/sdk';
import type { SuiClient } from './client.js';

export async function readVaultState(client: SuiClient, vaultId: string): Promise<VaultState> {
  const { object } = await client.core.getObject({
    objectId: vaultId,
    include: { json: true },
  });

  if (!object) {
    throw new Error(`Vault object not found: ${vaultId}`);
  }

  return parseVaultObject(object);
}
