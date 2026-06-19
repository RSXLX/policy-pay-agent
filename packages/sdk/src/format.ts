export function mistToSui(mist: string | number | bigint): string {
  const value = typeof mist === 'bigint' ? mist : BigInt(String(mist));
  const whole = value / 1_000_000_000n;
  const fraction = value % 1_000_000_000n;
  const trimmed = fraction.toString().padStart(9, '0').replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

export function suiToMist(sui: string): bigint {
  const [wholeRaw, fractionRaw = ''] = sui.trim().split('.');
  const whole = BigInt(wholeRaw || '0');
  const fraction = BigInt((fractionRaw + '000000000').slice(0, 9));
  return whole * 1_000_000_000n + fraction;
}

export function shortAddress(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function formatDateMs(ms: string | number | bigint): string {
  return new Date(Number(ms)).toLocaleString();
}
