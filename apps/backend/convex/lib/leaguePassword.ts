/**
 * League password hashing.
 *
 * League passwords were previously stored and compared in plaintext. We now
 * hash them with PBKDF2-SHA256 (available via Web Crypto in the default Convex
 * runtime — no `'use node'` required) using a per-password random salt.
 *
 * Stored format: `pbkdf2$<iterations>$<saltB64>$<hashB64>`
 *
 * `verifyLeaguePassword` also accepts legacy plaintext values so existing
 * leagues keep working; callers should re-hash on the next successful write.
 */

const HASH_PREFIX = 'pbkdf2';
const ITERATIONS = 100_000;
const KEY_LEN_BITS = 256;
const SALT_BYTES = 16;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveBits(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LEN_BITS,
  );
  return new Uint8Array(derived);
}

/** Constant-time-ish comparison of two equal-length byte arrays. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function isHashedLeaguePassword(value: string): boolean {
  return value.startsWith(`${HASH_PREFIX}$`);
}

export async function hashLeaguePassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, ITERATIONS);
  return [
    HASH_PREFIX,
    String(ITERATIONS),
    bytesToBase64(salt),
    bytesToBase64(hash),
  ].join('$');
}

export async function verifyLeaguePassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (!isHashedLeaguePassword(stored)) {
    // Legacy plaintext value — direct comparison for backward compatibility.
    return password === stored;
  }
  const parts = stored.split('$');
  if (parts.length !== 4) {
    return false;
  }
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }
  const salt = base64ToBytes(parts[2]);
  const expected = base64ToBytes(parts[3]);
  const actual = await deriveBits(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}
