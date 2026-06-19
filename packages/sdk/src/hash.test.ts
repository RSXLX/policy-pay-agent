import { describe, expect, it } from 'vitest';
import { hashString, stableStringify } from './hash.js';

it('stableStringify sorts object keys', () => {
  expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
});

it('hashString returns 32 bytes', () => {
  expect(hashString('policy-pay')).toHaveLength(32);
});
