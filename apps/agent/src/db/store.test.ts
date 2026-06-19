import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonStore } from './store';

let tempDir = '';

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'policy-pay-store-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('JsonStore', () => {
  it('initializes, upserts, and reads registered vaults', async () => {
    const store = new JsonStore(join(tempDir, 'store.json'));
    await store.init();

    await store.upsertVault({
      vaultId: '0x1',
      sessionCapId: '0x2',
      coinType: '0x2::sui::SUI',
      packageId: '0x3',
      label: 'Vendor vault',
    });

    await store.upsertVault({
      vaultId: '0x1',
      sessionCapId: '0x4',
      coinType: '0x2::sui::SUI',
      packageId: '0x3',
      label: 'Updated vault',
    });

    const vaults = await store.listVaults();
    expect(vaults).toHaveLength(1);
    expect(vaults[0]).toMatchObject({
      vaultId: '0x1',
      sessionCapId: '0x4',
      label: 'Updated vault',
    });
    expect(vaults[0]?.createdAtMs).toEqual(expect.any(Number));
  });

  it('keeps newest execution records first', async () => {
    const store = new JsonStore(join(tempDir, 'store.json'));
    await store.init();

    await store.addExecution({
      id: 'first',
      vaultId: '0x1',
      planHashHex: '0xaaa',
      status: 'SKIPPED',
      reason: 'No due rules',
      createdAtMs: 1,
    });
    await store.addExecution({
      id: 'second',
      vaultId: '0x1',
      planHashHex: '0xbbb',
      txDigest: 'digest',
      status: 'EXECUTED',
      createdAtMs: 2,
    });

    expect((await store.listExecutions('0x1')).map((record) => record.id)).toEqual(['second', 'first']);
  });
});
