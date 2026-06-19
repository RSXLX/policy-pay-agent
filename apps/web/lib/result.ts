export function extractDigest(result: any): string | undefined {
  return result?.digest ?? result?.Transaction?.digest ?? result?.FailedTransaction?.digest ?? result?.transactionDigest;
}

export function findCreatedObjects(result: any): Array<{ objectId: string; objectType?: string; owner?: any }> {
  const objects: Array<{ objectId: string; objectType?: string; owner?: any }> = [];
  walk(result, (value) => {
    if (!value || typeof value !== 'object') return;

    if (value.type === 'created' && typeof value.objectId === 'string') {
      const objectType = value.objectType;
      if (isVaultObjectType(objectType)) {
        objects.push({ objectId: value.objectId, objectType, owner: value.owner });
      }
      return;
    }

    if (typeof value.objectId === 'string' && value.idOperation === 'Created') {
      const objectType = findObjectType(result, value.objectId) ?? value.objectType ?? value.object_type ?? value.type;
      if (isVaultObjectType(objectType)) {
        objects.push({ objectId: value.objectId, objectType, owner: value.outputOwner ?? value.owner });
      }
      return;
    }

    const objectId = value.objectId ?? value.object_id ?? value.object_id_hex ?? value.reference?.objectId;
    const objectType = value.objectType ?? value.object_type ?? value.type ?? findObjectType(result, objectId);
    if (typeof objectId === 'string' && isVaultObjectType(objectType)) {
      objects.push({ objectId, objectType, owner: value.owner ?? value.outputOwner });
    }
  });
  return dedupe(objects);
}

function findObjectType(result: any, objectId: unknown): string | undefined {
  if (typeof objectId !== 'string') return undefined;
  return (
    result?.objectTypes?.[objectId] ??
    result?.Transaction?.objectTypes?.[objectId] ??
    result?.FailedTransaction?.objectTypes?.[objectId]
  );
}

function isVaultObjectType(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value.includes('::vault::AgentVault') ||
      value.includes('::vault::OwnerCap') ||
      value.includes('::vault::AgentSessionCap') ||
      value.includes('agent_treasury::vault'))
  );
}

function walk(value: any, visit: (value: any) => void) {
  visit(value);
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
  } else if (value && typeof value === 'object') {
    for (const child of Object.values(value)) walk(child, visit);
  }
}

function dedupe<T extends { objectId: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.objectId)) return false;
    seen.add(item.objectId);
    return true;
  });
}
