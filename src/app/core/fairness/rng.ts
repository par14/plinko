/**
 * Deterministic, provably-fair byte stream.
 *
 * HMAC-SHA256(serverSeed, message) gives 32 reproducible bytes for a given
 * (serverSeed, message) pair. Plinko needs at most `rows` bits (rows <= 16),
 * so a single HMAC block is always enough.
 */
export async function hmacSha256(key: string, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return new Uint8Array(signature);
}

/** Returns the bit (0 or 1) at the given index, most-significant-bit first. */
export function bitAt(bytes: Uint8Array, index: number): number {
  const byte = bytes[index >> 3];
  return (byte >> (7 - (index & 7))) & 1;
}
