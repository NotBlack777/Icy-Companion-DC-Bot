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
    // Additional Super Owners with the same top-level access as superOwner.
    superOwners: [],
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

    // UI theme. Presets/custom values are resolved by utils/themeManager.
    theme: {
      preset: 'sunset-ice',
      custom: null,
      saved: {}
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
      // accessMode:
      //   blacklist -> relay/log everyone except users in blacklist
      //   whitelist -> relay/log only users in whitelist
      accessMode: 'blacklist',
      blacklist: [],
      whitelist: [],
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

function getSuperOwners() {
  const data = load();
  const ids = [data.superOwner || process.env.SUPER_OWNER_ID, ...(Array.isArray(data.superOwners) ? data.superOwners : [])]
    .filter(Boolean)
    .map(String);

  return [...new Set(ids)];
}

function isSuperOwner(userId) {
  if (!userId) return false;
  return getSuperOwners().includes(String(userId));
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

function addSuperOwner(userId) {
  return update(data => {
    const id = String(userId);
    data.superOwners = Array.isArray(data.superOwners) ? data.superOwners.map(String) : [];

    if (String(data.superOwner || process.env.SUPER_OWNER_ID || '') === id) return;
    if (!data.superOwners.includes(id)) data.superOwners.push(id);

    // A Super Owner does not need a lower owner tier entry too.
    data.owners = Array.isArray(data.owners) ? data.owners.filter(ownerId => String(ownerId) !== id) : [];
    data.juniorOwners = Array.isArray(data.juniorOwners) ? data.juniorOwners.filter(ownerId => String(ownerId) !== id) : [];
  });
}

function removeSuperOwner(userId) {
  return update(data => {
    const id = String(userId);

    // The primary Super Owner can only be changed with transfer ownership / env.
    if (String(data.superOwner || process.env.SUPER_OWNER_ID || '') === id) return;

    data.superOwners = Array.isArray(data.superOwners)
      ? data.superOwners.filter(ownerId => String(ownerId) !== id)
      : [];
  });
}

function addOwner(userId) {
  return update(data => {
    const id = String(userId);
    const superIds = [data.superOwner || process.env.SUPER_OWNER_ID, ...(Array.isArray(data.superOwners) ? data.superOwners : [])]
      .filter(Boolean)
      .map(String);

    if (superIds.includes(id)) return;

    data.owners = Array.isArray(data.owners) ? data.owners.map(String) : [];
    if (!data.owners.includes(id)) data.owners.push(id);
  });
}

function removeOwner(userId) {
  return update(data => {
    const id = String(userId);
    data.owners = Array.isArray(data.owners)
      ? data.owners.filter(ownerId => String(ownerId) !== id)
      : [];
  });
}

function addJunior(userId) {
  return update(data => {
    const id = String(userId);
    const superIds = [data.superOwner || process.env.SUPER_OWNER_ID, ...(Array.isArray(data.superOwners) ? data.superOwners : [])]
      .filter(Boolean)
      .map(String);
    const ownerIds = Array.isArray(data.owners) ? data.owners.map(String) : [];

    if (superIds.includes(id) || ownerIds.includes(id)) return;

    data.juniorOwners = Array.isArray(data.juniorOwners) ? data.juniorOwners.map(String) : [];
    if (!data.juniorOwners.includes(id)) data.juniorOwners.push(id);
  });
}

function removeJunior(userId) {
  return update(data => {
    const id = String(userId);
    data.juniorOwners = Array.isArray(data.juniorOwners)
      ? data.juniorOwners.filter(ownerId => String(ownerId) !== id)
      : [];
  });
}

function setSuperOwner(userId) {
  return update(data => {
    const id = String(userId);
    data.superOwner = id;
    data.superOwners = Array.isArray(data.superOwners)
      ? data.superOwners.filter(ownerId => String(ownerId) !== id)
      : [];
    data.owners = Array.isArray(data.owners)
      ? data.owners.filter(ownerId => String(ownerId) !== id)
      : [];
    data.juniorOwners = Array.isArray(data.juniorOwners)
      ? data.juniorOwners.filter(ownerId => String(ownerId) !== id)
      : [];
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

function setDmAccessMode(mode) {
  const normalized = String(mode || '').toLowerCase();
  if (!['blacklist', 'whitelist'].includes(normalized)) {
    throw new Error('DM access mode must be blacklist or whitelist');
  }

  return setDmLogger({ accessMode: normalized });
}

function getDmAccessMode() {
  const mode = load().dmLogger.accessMode;
  return mode === 'whitelist' ? 'whitelist' : 'blacklist';
}

function blacklistAdd(userId) {
  return update(data => {
    const id = String(userId);
    data.dmLogger.blacklist = Array.isArray(data.dmLogger.blacklist) ? data.dmLogger.blacklist.map(String) : [];
    if (!data.dmLogger.blacklist.includes(id)) {
      data.dmLogger.blacklist.push(id);
    }
  });
}

function blacklistRemove(userId) {
  return update(data => {
    const id = String(userId);
    data.dmLogger.blacklist = Array.isArray(data.dmLogger.blacklist)
      ? data.dmLogger.blacklist.filter(entry => String(entry) !== id)
      : [];
  });
}

function isBlacklisted(userId) {
  const logger = load().dmLogger;
  return Array.isArray(logger.blacklist) && logger.blacklist.map(String).includes(String(userId));
}

function whitelistAdd(userId) {
  return update(data => {
    const id = String(userId);
    data.dmLogger.whitelist = Array.isArray(data.dmLogger.whitelist) ? data.dmLogger.whitelist.map(String) : [];
    if (!data.dmLogger.whitelist.includes(id)) {
      data.dmLogger.whitelist.push(id);
    }
  });
}

function whitelistRemove(userId) {
  return update(data => {
    const id = String(userId);
    data.dmLogger.whitelist = Array.isArray(data.dmLogger.whitelist)
      ? data.dmLogger.whitelist.filter(entry => String(entry) !== id)
      : [];
  });
}

function isWhitelisted(userId) {
  const logger = load().dmLogger;
  return Array.isArray(logger.whitelist) && logger.whitelist.map(String).includes(String(userId));
}

function canLogDmUser(userId) {
  const logger = load().dmLogger;
  const id = String(userId);

  if (logger.accessMode === 'whitelist') {
    return Array.isArray(logger.whitelist) && logger.whitelist.map(String).includes(id);
  }

  return !(Array.isArray(logger.blacklist) && logger.blacklist.map(String).includes(id));
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
  getSuperOwners,
  setSuperOwner,
  isSuperOwner,
  isGlobalOwner,
  isJuniorOwner,
  hasTier,
  addSuperOwner,
  removeSuperOwner,
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
  setDmAccessMode,
  getDmAccessMode,
  blacklistAdd,
  blacklistRemove,
  isBlacklisted,
  whitelistAdd,
  whitelistRemove,
  isWhitelisted,
  canLogDmUser,
  setThread,
  getThread,
  findUserByThread,

  setEmoji,
  getEmoji,
  getAllEmojis
};
