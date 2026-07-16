const fs = require('fs');
const path = require('path');

const basePath = path.join(
  __dirname,
  '../../server_configs'
);

const masterPath = path.join(
  basePath,
  'master.json'
);

// Ensure folder exists
if (!fs.existsSync(basePath)) {
  fs.mkdirSync(basePath, {
    recursive: true
  });
}

// Ensure master.json exists
if (!fs.existsSync(masterPath)) {
  fs.writeFileSync(
    masterPath,
    JSON.stringify(
      {
        serverNumbers: {}
      },
      null,
      2
    )
  );
}

// MASTER
function getMaster() {
  try {
    return JSON.parse(
      fs.readFileSync(masterPath, 'utf8')
    );
  } catch {
    return {
      serverNumbers: {}
    };
  }
}

// SERVER FILE PATH
function getFile(guildId) {
  return path.join(
    basePath,
    `${guildId}.json`
  );
}

// LOAD CONFIG
function getServerConfig(guildId) {

  const file = getFile(guildId);

  if (!fs.existsSync(file)) {

    const master = getMaster();

    const config = {
      guildId,
      guildName: null,

      configNumber:
        master.serverNumbers?.[guildId] ??
        null,

      prefix: '.',

      owner: null,
      extraOwners: [],

      staffRole: null,
      attendanceChannel: null,

      ignoreRoles: [],
      ignoreUsers: [],
      ignoreChannels: [],

      remindUsers: [],
      remindTime: null,

      attendance: {
        users: {}
      },

      excuses: []
    };

    fs.writeFileSync(
      file,
      JSON.stringify(
        config,
        null,
        2
      )
    );

    return config;
  }

  try {

    const config = JSON.parse(
      fs.readFileSync(file, 'utf8')
    );

    // Backwards compatibility
    if (!config.attendance) {
      config.attendance = {
        users: {}
      };
    }

    if (!config.attendance.users) {
      config.attendance.users = {};
    }

    if (!config.extraOwners) {
      config.extraOwners = [];
    }

    if (!config.ignoreRoles) {
      config.ignoreRoles = [];
    }

    if (!config.ignoreUsers) {
      config.ignoreUsers = [];
    }

    if (!config.ignoreChannels) {
      config.ignoreChannels = [];
    }

    if (!config.remindUsers) {
      config.remindUsers = [];
    }

    if (!config.excuses) {
      config.excuses = [];
    }

    return config;

  } catch {

    return {
      guildId,
      attendance: {
        users: {}
      }
    };
  }
}

// SAVE CONFIG
function saveServerConfig(
  guildId,
  data
) {

  const file = getFile(guildId);

  fs.writeFileSync(
    file,
    JSON.stringify(
      data,
      null,
      2
    )
  );
}

// UPDATE FIELD
function updateField(
  guildId,
  key,
  value
) {

  const config =
    getServerConfig(guildId);

  config[key] = value;

  saveServerConfig(
    guildId,
    config
  );

  return config;
}

module.exports = {
  getMaster,
  getServerConfig,
  saveServerConfig,
  updateField
};