/**
 * TOTP (RFC 6238) implemented on top of node:crypto.
 *
 * Used by `@bot setup-totp` so the Super Owner can protect destructive
 * commands with an authenticator app (Google Authenticator, Authy, ...)
 * instead of a static password.
 *
 * No external dependencies.
 */

const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/* ---------------- BASE32 ---------------- */

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input) {
  const clean = String(input).toUpperCase().replace(/=+$/, '').replace(/\s/g, '');

  let bits = 0;
  let value = 0;
  const output = [];

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid base32 character: ${char}`);

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/* ---------------- TOTP ---------------- */

function generateSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

/**
 * HOTP for a specific counter value.
 */
function hotp(secret, counter, digits = 6) {
  const key = base32Decode(secret);

  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);

  const digest = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;

  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
}

function generateToken(secret, { step = 30, digits = 6, time = Date.now() } = {}) {
  return hotp(secret, Math.floor(time / 1000 / step), digits);
}

/**
 * Verify a token, allowing +/- `window` steps of clock drift.
 */
function verifyToken(secret, token, { step = 30, digits = 6, window = 1, time = Date.now() } = {}) {
  if (!secret || !token) return false;

  const clean = String(token).replace(/\s/g, '');
  if (!/^\d+$/.test(clean)) return false;

  const counter = Math.floor(time / 1000 / step);

  for (let error = -window; error <= window; error++) {
    let candidate;

    try {
      candidate = hotp(secret, counter + error, digits);
    } catch {
      return false;
    }

    // Constant-time compare to avoid leaking timing information.
    const a = Buffer.from(candidate);
    const b = Buffer.from(clean.padStart(digits, '0').slice(0, digits));

    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }

  return false;
}

/**
 * otpauth:// URI for QR generation / manual entry.
 */
function buildOtpAuthUrl(secret, { label = 'Icy Companion', issuer = 'Icy Companion' } = {}) {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30'
  });

  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params.toString()}`;
}

module.exports = {
  base32Encode,
  base32Decode,
  generateSecret,
  generateToken,
  verifyToken,
  buildOtpAuthUrl
};
