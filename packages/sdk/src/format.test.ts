import { describe, expect, it } from 'vitest';
import { mistToSui, shortAddress, suiToMist } from './format';

describe('format helpers', () => {
  it('converts SUI to MIST and back without floating point math', () => {
    expect(suiToMist('1.25')).toBe(1_250_000_000n);
    expect(mistToSui(1_250_000_000n)).toBe('1.25');
  });

  it('truncates long addresses', () => {
    expect(shortAddress('0x1234567890abcdef', 6, 4)).toBe('0x1234…cdef');
  });
});
