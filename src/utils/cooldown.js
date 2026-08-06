const cooldowns = new Map();

function nowMs() {
  return Date.now();
}

function cleanup(now = nowMs()) {
  for (const [key, expiry] of cooldowns) {
    if (expiry <= now) cooldowns.delete(key);
  }
}

function checkCooldown(userId, cmd, time = 3000) {
  return checkRateLimit(`${userId}-${cmd}`, time).allowed;
}

function checkRateLimit(key, durationMs = 3000) {
  const duration = Number(durationMs) || 0;
  if (duration <= 0) return { allowed: true, remainingMs: 0, expiresAt: 0 };

  const now = nowMs();
  cleanup(now);

  const expiresAt = cooldowns.get(key) || 0;

  if (expiresAt > now) {
    return {
      allowed: false,
      remainingMs: expiresAt - now,
      expiresAt
    };
  }

  const nextExpiry = now + duration;
  cooldowns.set(key, nextExpiry);

  return {
    allowed: true,
    remainingMs: 0,
    expiresAt: nextExpiry
  };
}

function clearRateLimit(key) {
  cooldowns.delete(key);
}

function clearAllRateLimits() {
  cooldowns.clear();
}

function formatRemaining(ms) {
  const seconds = Math.ceil((Number(ms) || 0) / 1000);
  if (seconds <= 1) return '1 second';
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

module.exports = {
  checkCooldown,
  checkRateLimit,
  clearRateLimit,
  clearAllRateLimits,
  formatRemaining
};
