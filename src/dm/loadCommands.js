/**
 * Populates the DM command registry.
 *
 * Kept separate from index.js so that any module needing a populated
 * registry (slash.js, help.js, tests) can require this directly without
 * depending on import order. Requiring it twice is harmless - Node
 * caches the modules and define() overwrites by name.
 */

let loaded = false;

function loadDmCommands() {
  if (loaded) return;
  loaded = true;

  // Order drives the order of the help panel groups.
  require('./commands/info');
  require('./commands/deletion');
  require('./commands/broadcast');
  require('./commands/management');
  require('./commands/reports');
  require('./commands/staff');
  require('./commands/dmlogger');
  require('./commands/privacy');
  require('./commands/security');
  require('./commands/moderation');
  require('./commands/warnings');
}

module.exports = loadDmCommands;
