/**
 * Global store
 * ------------
 * Bot-wide state that is not tied to any single guild:
 *
 *   - Super Owner / owners / junior owners
 *   - Security (password hash, TOTP secret, lock state, unlocked sessions)
 *   - Privacy mode + otjoin mode
 *   - DM logger config (blacklist, relay mode, destination)
 *
 * Stored in server_configs/global.json, which is already gitignored.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const baseDir = path.join(__dirname, '../../server_configs');
const filePath = path.join(baseDir, 'global.json');

/* ---------------- DEFAULTS ---------------- */

function defaults() {
  return {
    // Owners
    superOwner: process.env.SUPER_OWNER_ID || null,
    owners: [],
    juniorOwners: [],

    // Security
    security: {
      passwordHash: null,
      passwordSalt: null,
      totpSecret: null,
      totpPending: null,
      locked: false,
      // userId -> expiry timestamp
      unlocked: {}
    },

    // Privacy
    privacy: {
      privacyMode: false,
      otjoinMode: false
    },

    // DM logger
    dmLogger: {
      enabled: true,
      // 'server' = log into a chosen guild + category (default),
      // 'dm'     = forward to the Super Owner's DMs instead.
      // Defaults to 'server' with no target, so nothing is logged
      // anywhere until the Super Owner explicitly configures it.
      mode: 'server',
      targetGuild: null,
      targetCategory: null,
      blacklist: [],
      // userId -> channelId, used by 'server' mode
      threads: {}
    },

    stats: {
      startedAt: null,
      restarts: 0
    },

    emojis: {}
  };
}

/* ---------------- IO ---------------- */

function ensureDir() {
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
}

function deepMerge(base, override) {
  const out = { ...base };

  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      out[key] = deepMerge(base[key], value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }

  return out;
}

function load() {
  ensureDir();

  if (!fs.existsSync(filePath)) {
    const initial = defaults();
    save(initial);
    return initial;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return deepMerge(defaults(), raw);
  } catch (err) {
    console.warn(`[GLOBAL] Failed to read global.json: ${err.message}`);
    return defaults();
  }
}

function save(data) {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return data;
}

function update(mutator) {
  const data = load();
  const result = mutator(data);
  save(result === undefined ? data : result);
  return load();
}

/* ---------------- OWNERSHIP ---------------- */

/**
 * The Super Owner. Falls back to the SUPER_OWNER_ID env var so the bot is
 * never left without an owner after a fresh deploy.
 */
function getSuperOwner() {
  const data = load();
  return data.superOwner || process.env.SUPER_OWNER_ID || null;
}

function isSuperOwner(userId) {
  const owner = getSuperOwner();
  return Boolean(owner && userId && String(owner) === String(userId));
}

function isGlobalOwner(userId) {
  if (!userId) return false;
  if (isSuperOwner(userId)) return true;
  return load().owners.includes(String(userId));
}

function isJuniorOwner(userId) {
  if (!userId) return false;
  return load().juniorOwners.includes(String(userId));
}

/**
 * Permission tiers:
 *   super  -> Super Owner only
 *   owner  -> Super Owner + global owners
 *   junior -> Super Owner + global owners + junior owners
 */
function hasTier(userId, tier = 'super') {
  if (tier === 'super') return isSuperOwner(userId);
  if (tier === 'owner') return isGlobalOwner(userId);
  if (tier === 'junior') return isGlobalOwner(userId) || isJuniorOwner(userId);
  return false;
}

function addOwner(userId) {
  return update(data => {
    if (!data.owners.includes(userId)) data.owners.push(userId);
  });
}

function removeOwner(userId) {
  return update(data => {
    data.owners = data.owners.filter(id => id !== userId);
  });
}

function addJunior(userId) {
  return update(data => {
    if (!data.juniorOwners.includes(userId)) data.juniorOwners.push(userId);
  });
}

function removeJunior(userId) {
  return update(data => {
    data.juniorOwners = data.juniorOwners.filter(id => id !== userId);
  });
}

function setSuperOwner(userId) {
  return update(data => {
    data.superOwner = userId;
  });
}

/* ---------------- SECURITY ---------------- */

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { hash, salt };
}

function setPassword(password) {
  const { hash, salt } = hashPassword(password);

  return update(data => {
    data.security.passwordHash = hash;
    data.security.passwordSalt = salt;
  });
}

function hasPassword() {
  return Boolean(load().security.passwordHash);
}

function verifyPassword(password) {
  const { security } = load();
  if (!security.passwordHash || !security.passwordSalt) return false;

  const { hash } = hashPassword(password, security.passwordSalt);

  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(security.passwordHash, 'hex');

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isLocked() {
  return Boolean(load().security.locked);
}

function setLocked(locked) {
  return update(data => {
    data.security.locked = Boolean(locked);
    if (locked) data.security.unlocked = {};
  });
}

/**
 * Mark a user as unlocked for a period of time (default 30 minutes).
 */
function unlockSession(userId, ttlMs = 30 * 60 * 1000) {
  return update(data => {
    data.security.unlocked[userId] = Date.now() + ttlMs;
  });
}

function isSessionUnlocked(userId) {
  const { security } = load();
  const expiry = security.unlocked?.[userId];
  return Boolean(expiry && expiry > Date.now());
}

function setTotpSecret(secret) {
  return update(data => {
    data.security.totpSecret = secret;
    data.security.totpPending = null;
  });
}

function setTotpPending(secret) {
  return update(data => {
    data.security.totpPending = secret;
  });
}

function getSecurity() {
  return load().security;
}

/* ---------------- PRIVACY ---------------- */

function getPrivacy() {
  return load().privacy;
}

function setPrivacyMode(enabled) {
  return update(data => {
    data.privacy.privacyMode = Boolean(enabled);
  });
}

function setOtjoinMode(enabled) {
  return update(data => {
    data.privacy.otjoinMode = Boolean(enabled);
  });
}

/* ---------------- DM LOGGER ---------------- */

function getDmLogger() {
  return load().dmLogger;
}

function setDmLogger(patch) {
  return update(data => {
    data.dmLogger = { ...data.dmLogger, ...patch };
  });
}

function blacklistAdd(userId) {
  return update(data => {
    if (!data.dmLogger.blacklist.includes(userId)) {
      data.dmLogger.blacklist.push(userId);
    }
  });
}

function blacklistRemove(userId) {
  return update(data => {
    data.dmLogger.blacklist = data.dmLogger.blacklist.filter(id => id !== userId);
  });
}

function isBlacklisted(userId) {
  return load().dmLogger.blacklist.includes(String(userId));
}

function setThread(userId, channelId) {
  return update(data => {
    data.dmLogger.threads[userId] = channelId;
  });
}

function getThread(userId) {
  return load().dmLogger.threads?.[userId] || null;
}

function findUserByThread(channelId) {
  const threads = load().dmLogger.threads || {};
  return Object.keys(threads).find(userId => threads[userId] === channelId) || null;
}

/* ---------------- EMOJIS ---------------- */

function setEmoji(name, value) {
  return update(data => {
    if (!data.emojis) data.emojis = {};
    data.emojis[name] = value;
  });
}

function getEmoji(name, fallback = '') {
  const { emojis } = load();
  return emojis?.[name] || fallback;
}

function getAllEmojis() {
  return load().emojis || {};
}

module.exports = {
  filePath,
  defaults,
  load,
  save,
  update,

  getSuperOwner,
  setSuperOwner,
  isSuperOwner,
  isGlobalOwner,
  isJuniorOwner,
  hasTier,
  addOwner,
  removeOwner,
  addJunior,
  removeJunior,

  setPassword,
  hasPassword,
  verifyPassword,
  isLocked,
  setLocked,
  unlockSession,
  isSessionUnlocked,
  setTotpSecret,
  setTotpPending,
  getSecurity,

  getPrivacy,
  setPrivacyMode,
  setOtjoinMode,

  getDmLogger,
  setDmLogger,
  blacklistAdd,
  blacklistRemove,
  isBlacklisted,
  setThread,
  getThread,
  findUserByThread,

  setEmoji,
  getEmoji,
  getAllEmojis
};
