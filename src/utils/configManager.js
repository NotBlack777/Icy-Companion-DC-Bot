const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '../../server_configs');
const masterPath = path.join(basePath, 'master.json');

function ensureDirectory() {
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn(`[CONFIG] Failed to read ${file}: ${err.message}`);
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDirectory();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function createDefaultConfig(guildId) {
  const master = getMaster();

  return {
    guildId,
    guildName: null,
    configNumber: master.serverNumbers?.[guildId] ?? null,
    prefix: '.',

    owner: null,
    extraOwners: [],

    // Legacy single staff role (migrated to staffRoles array)
    staffRole: null,
    // Multiple staff roles
    staffRoles: [],
    attendanceChannel: null,

    ignoreRoles: [],
    ignoreUsers: [],
    ignoreChannels: [],

    remindUsers: [],
    remindTime: null,

    attendance: {
      users: {}
    },

    excuses: [],

    // Purge settings
    purgeLogChannel: null,
    modLogChannel: null,

    // Auto-moderation filters
    autoMod: {
      enabled: false,
      linkFilter: false,
      inviteFilter: false,
      spamFilter: false,
      capsFilter: false,
      mentionSpam: false,
      mentionSpamThreshold: 5,
      wordFilter: false,
      filteredWords: [],
      action: 'delete', // 'delete', 'warn', 'timeout'
      timeoutDuration: 60, // seconds
      logChannel: null
    },

    // Custom embed colors
    embedColors: {
      success: null,
      error: null,
      warn: null,
      info: null
    },

    // Virtual staff (users added as staff without a role)
    virtualStaff: [],

    // Warning auto-actions: [{ threshold: 3, action: 'timeout', timeoutMs: 600000 }]
    warnActions: []
  };
}

function normalizeConfig(guildId, data = {}) {
  const defaults = createDefaultConfig(guildId);
  const config = {
    ...defaults,
    ...data,
    guildId: data.guildId || guildId
  };

  config.extraOwners = Array.isArray(data.extraOwners) ? data.extraOwners : [];
  config.ignoreRoles = Array.isArray(data.ignoreRoles) ? data.ignoreRoles : [];
  config.ignoreUsers = Array.isArray(data.ignoreUsers) ? data.ignoreUsers : [];
  config.ignoreChannels = Array.isArray(data.ignoreChannels) ? data.ignoreChannels : [];
  config.remindUsers = Array.isArray(data.remindUsers) ? data.remindUsers : [];
  config.excuses = Array.isArray(data.excuses) ? data.excuses : [];
  config.virtualStaff = Array.isArray(data.virtualStaff) ? data.virtualStaff : [];
  config.filteredWords = Array.isArray(data.filteredWords) ? data.filteredWords : [];

  // Migrate legacy single staffRole to staffRoles array
  config.staffRoles = Array.isArray(data.staffRoles) ? data.staffRoles : [];
  if (data.staffRole && !config.staffRoles.includes(data.staffRole)) {
    config.staffRoles.push(data.staffRole);
  }
  // Keep staffRole as the primary for backward compat (first role)
  config.staffRole = config.staffRoles[0] || null;

  // Normalize autoMod settings
  const defaultAutoMod = createDefaultConfig(guildId).autoMod;
  config.autoMod = {
    ...defaultAutoMod,
    ...(data.autoMod && typeof data.autoMod === 'object' ? data.autoMod : {})
  };
  config.autoMod.filteredWords = Array.isArray(config.autoMod.filteredWords) ? config.autoMod.filteredWords : [];

  // Normalize embed colors
  const defaultColors = createDefaultConfig(guildId).embedColors;
  config.embedColors = {
    ...defaultColors,
    ...(data.embedColors && typeof data.embedColors === 'object' ? data.embedColors : {})
  };

  // Attendance used to be stored either as { users: { userId: day } }
  // or as a flat object. Normalize both formats to the supported shape.
  const attendance = data.attendance && typeof data.attendance === 'object'
    ? data.attendance
    : {};

  if (attendance.users && typeof attendance.users === 'object' && !Array.isArray(attendance.users)) {
    config.attendance = { ...attendance, users: { ...attendance.users } };
  } else {
    const legacyUsers = {};

    for (const [key, value] of Object.entries(attendance)) {
      if (key === 'users') continue;
      const userId = key.includes('-') ? key.split('-').pop() : key;
      if (userId && typeof value !== 'object') legacyUsers[userId] = value;
    }

    config.attendance = {
      ...attendance,
      users: legacyUsers
    };
  }

  return config;
}

ensureDirectory();

if (!fs.existsSync(masterPath)) {
  writeJson(masterPath, { serverNumbers: {} });
}

function getMaster() {
  const master = readJson(masterPath, { serverNumbers: {} });

  if (!master.serverNumbers || typeof master.serverNumbers !== 'object') {
    master.serverNumbers = {};
  }

  return master;
}

function getFile(guildId) {
  if (!guildId) {
    throw new Error('guildId is required');
  }

  return path.join(basePath, `${guildId}.json`);
}

function getServerConfig(guildId) {
  const file = getFile(guildId);

  if (!fs.existsSync(file)) {
    const config = createDefaultConfig(guildId);
    saveServerConfig(guildId, config);
    return config;
  }

  const config = normalizeConfig(guildId, readJson(file, createDefaultConfig(guildId)));

  // Persist migrated/defaulted fields so later commands all see the same shape.
  saveServerConfig(guildId, config);

  return config;
}

function saveServerConfig(guildId, data) {
  const config = normalizeConfig(guildId, data);
  writeJson(getFile(guildId), config);
  return config;
}

function updateField(guildId, key, value) {
  const config = getServerConfig(guildId);
  config[key] = value;
  return saveServerConfig(guildId, config);
}

module.exports = {
  basePath,
  masterPath,
  getFile,
  getMaster,
  createDefaultConfig,
  normalizeConfig,
  getServerConfig,
  saveServerConfig,
  updateField
};
