import { describe, expect, it } from 'vitest';
import { extractDigest, findCreatedObjects } from './result';

describe('transaction result parsing', () => {
  it('extracts digest from dApp Kit v2 transaction results', () => {
    expect(extractDigest({ Transaction: { digest: 'abc123' } })).toBe('abc123');
  });

  it('extracts created vault objects from effects plus object type metadata', () => {
    const result = {
      Transaction: {
        objectTypes: {
          '0xvault': '0xpackage::vault::AgentVault<0x2::sui::SUI>',
          '0xowner': '0xpackage::vault::OwnerCap',
          '0xsession': '0xpackage::vault::AgentSessionCap',
          '0xgas': '0x2::coin::Coin<0x2::sui::SUI>',
        },
        effects: {
          changedObjects: [
            { objectId: '0xvault', idOperation: 'Created', outputOwner: { Shared: { initialSharedVersion: '1' } } },
            { objectId: '0xowner', idOperation: 'Created', outputOwner: { AddressOwner: '0xownerAddress' } },
            { objectId: '0xsession', idOperation: 'Created', outputOwner: { AddressOwner: '0xagentAddress' } },
            { objectId: '0xgas', idOperation: 'None', outputOwner: { AddressOwner: '0xownerAddress' } },
          ],
        },
      },
    };

    expect(findCreatedObjects(result)).toEqual([
      {
        objectId: '0xvault',
        objectType: '0xpackage::vault::AgentVault<0x2::sui::SUI>',
        owner: { Shared: { initialSharedVersion: '1' } },
      },
      {
        objectId: '0xowner',
        objectType: '0xpackage::vault::OwnerCap',
        owner: { AddressOwner: '0xownerAddress' },
      },
      {
        objectId: '0xsession',
        objectType: '0xpackage::vault::AgentSessionCap',
        owner: { AddressOwner: '0xagentAddress' },
      },
    ]);
  });
});
