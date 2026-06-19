import { blake2b } from '@noble/hashes/blake2.js';

export function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function toByteArray(value: Uint8Array | number[]): number[] {
  return Array.from(value);
}

export function hashBytes(bytes: Uint8Array): number[] {
  return Array.from(blake2b(bytes, { dkLen: 32 }));
}

export function hashString(value: string): number[] {
  return hashBytes(utf8Bytes(value));
}

export function hashJson(value: unknown): number[] {
  return hashString(stableStringify(value));
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}
