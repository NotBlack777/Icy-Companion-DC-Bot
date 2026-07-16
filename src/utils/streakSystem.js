const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '../../server_configs/attendance-streak.json'
);

function ensureFile() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      JSON.stringify({}, null, 2)
    );
  }
}

function load() {
  ensureFile();

  try {
    return JSON.parse(
      fs.readFileSync(filePath, 'utf8')
    );
  } catch {
    return {};
  }
}

function save(data) {
  ensureFile();

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2)
  );
}

function key(guildId, userId) {
  return `${guildId}-${userId}`;
}

function today() {
  return new Date().toDateString();
}

// UPDATE STREAK
function updateStreak(guildId, userId) {

  const data = load();

  const k = key(guildId, userId);
  const t = today();

  if (!data[k]) {

    data[k] = {
      streak: 1,
      lastDay: t
    };

  } else {

    const last = new Date(
      data[k].lastDay
    );

    const now = new Date(t);

    const diff = Math.floor(
      (now - last) / 86400000
    );

    if (diff === 1) {
      data[k].streak += 1;
    } else if (diff > 1) {
      data[k].streak = 1;
    }

    data[k].lastDay = t;
  }

  save(data);

  return data[k].streak;
}

// GET STREAK
function getStreak(guildId, userId) {

  const data = load();

  return (
    data[key(guildId, userId)]
      ?.streak || 0
  );
}

// SET STREAK
function setStreak(
  guildId,
  userId,
  amount
) {

  const data = load();

  data[key(guildId, userId)] = {
    streak: Number(amount),
    lastDay: today()
  };

  save(data);

  return amount;
}

// ADD STREAK
function addStreak(
  guildId,
  userId,
  amount
) {

  const current =
    getStreak(guildId, userId);

  return setStreak(
    guildId,
    userId,
    current + Number(amount)
  );
}

// GET ALL STREAKS
function getAllStreaks() {
  return load();
}

module.exports = {
  updateStreak,
  getStreak,
  setStreak,
  addStreak,
  getAllStreaks
};