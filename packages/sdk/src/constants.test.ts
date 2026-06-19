import { describe, expect, it } from 'vitest';
import { assertObjectId, assertPackageId } from './constants.js';

describe('Sui address guards', () => {
  it('rejects placeholder package ids before transaction serialization', () => {
    expect(() => assertPackageId('0xTODO')).toThrow('Invalid package id: 0xTODO');
  });

  it('accepts short canonical Sui object ids', () => {
    expect(() => assertObjectId('0x6')).not.toThrow();
  });
});
