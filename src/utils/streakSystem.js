const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '../../server_configs');
const filePath = path.join(configDir, 'attendance-streak.json');

function ensureFile() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  }
}

function load() {
  ensureFile();

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch (err) {
    console.warn(`[STREAK] Failed to read streak data: ${err.message}`);
    return {};
  }
}

function save(data) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function key(guildId, userId) {
  return `${guildId}-${userId}`;
}

function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
  if (!value) return null;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return toDateKey(parsed);
}

function dayNumber(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function updateStreak(guildId, userId) {
  const data = load();
  const streakKey = key(guildId, userId);
  const today = toDateKey();
  const current = data[streakKey];

  if (!current || typeof current !== 'object') {
    data[streakKey] = {
      streak: 1,
      lastDay: today
    };
    save(data);
    return 1;
  }

  const lastDay = parseDateKey(current.lastDay);
  const currentStreak = Number(current.streak) || 0;

  if (!lastDay) {
    current.streak = Math.max(1, currentStreak);
  } else {
    const diff = dayNumber(today) - dayNumber(lastDay);

    if (diff === 1) {
      current.streak = currentStreak + 1;
    } else if (diff > 1 || diff < 0) {
      current.streak = 1;
    } else {
      current.streak = Math.max(1, currentStreak);
    }
  }

  current.lastDay = today;
  data[streakKey] = current;
  save(data);

  return current.streak;
}

function getStreak(guildId, userId) {
  const data = load();
  return Number(data[key(guildId, userId)]?.streak) || 0;
}

function setStreak(guildId, userId, amount) {
  const data = load();
  const numericAmount = Math.max(0, Number(amount) || 0);

  data[key(guildId, userId)] = {
    streak: numericAmount,
    lastDay: toDateKey()
  };

  save(data);
  return numericAmount;
}

function addStreak(guildId, userId, amount) {
  return setStreak(guildId, userId, getStreak(guildId, userId) + (Number(amount) || 0));
}

function clearGuildStreaks(guildId) {
  const data = load();
  const prefix = `${guildId}-`;
  let removed = 0;

  for (const streakKey of Object.keys(data)) {
    if (streakKey.startsWith(prefix)) {
      delete data[streakKey];
      removed++;
    }
  }

  save(data);
  return removed;
}

function getAllStreaks() {
  return load();
}

module.exports = {
  updateStreak,
  getStreak,
  setStreak,
  addStreak,
  clearGuildStreaks,
  getAllStreaks,

  // Exported for tests and future commands.
  toDateKey,
  parseDateKey
};
