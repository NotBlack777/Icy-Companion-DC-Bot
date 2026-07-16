const cooldowns = new Map();

function checkCooldown(userId, cmd, time = 3000) {
  const key = `${userId}-${cmd}`;
  const now = Date.now();

  if (cooldowns.has(key)) {
    const expire = cooldowns.get(key) + time;
    if (now < expire) return false;
  }

  cooldowns.set(key, now);
  return true;
}

module.exports = { checkCooldown };