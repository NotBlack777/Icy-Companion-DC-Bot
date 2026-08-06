const { createEmbed, COLORS } = require('./uiHelper');

const EXEMPT_COMMANDS = new Set([
  'help',
  'maintenance',
  'rate-limit',
  'ignore-list'
]);

function cleanCommandName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/^\//, '');
}

function cleanModuleName(name) {
  return String(name || '')
    .trim()
    .toLowerCase();
}

function buildEntry(note, by) {
  return {
    note: String(note || 'This command is currently under maintenance.').slice(0, 300),
    by: by ? String(by) : null,
    at: new Date().toISOString()
  };
}

function commandKeys(command, commandName) {
  return [
    commandName,
    command?.data?.name,
    command?.aliasOf,
    command?.name
  ]
    .map(cleanCommandName)
    .filter(Boolean);
}

function getMaintenanceBlock(config = {}, command, commandName) {
  const maintenance = config.maintenance || {};
  const disabledCommands = maintenance.disabledCommands || {};
  const disabledModules = maintenance.disabledModules || {};
  const keys = commandKeys(command, commandName);

  if (keys.some(key => EXEMPT_COMMANDS.has(key))) return null;

  for (const key of keys) {
    const entry = disabledCommands[key];
    if (entry) {
      return {
        type: 'command',
        target: key,
        note: entry.note || 'This command is currently under maintenance.',
        by: entry.by || null,
        at: entry.at || null
      };
    }
  }

  const moduleName = cleanModuleName(command?.category || command?.folder || 'other');
  const moduleEntry = disabledModules[moduleName];

  if (moduleEntry) {
    return {
      type: 'module',
      target: moduleName,
      note: moduleEntry.note || `The ${moduleName} module is currently under maintenance.`,
      by: moduleEntry.by || null,
      at: moduleEntry.at || null
    };
  }

  return null;
}

function maintenanceEmbed(block) {
  const when = block.at ? `<t:${Math.floor(new Date(block.at).getTime() / 1000)}:R>` : 'recently';

  return createEmbed({
    title: 'Under Maintenance',
    description: [
      `**${block.type === 'module' ? 'Module' : 'Command'}:** \`${block.target}\``,
      `**Status:** temporarily disabled`,
      `**Note:** ${block.note}`,
      block.by ? `**Changed by:** <@${block.by}>` : null,
      `**Updated:** ${when}`,
      '',
      'Try again later or ask a server owner to check `/maintenance list`.'
    ].filter(Boolean).join('\n'),
    color: COLORS.warn,
    compact: true
  });
}

function listMaintenance(config = {}) {
  const maintenance = config.maintenance || {};
  const modules = Object.entries(maintenance.disabledModules || {}).map(([name, entry]) => ({
    type: 'module',
    name,
    ...entry
  }));
  const commands = Object.entries(maintenance.disabledCommands || {}).map(([name, entry]) => ({
    type: 'command',
    name,
    ...entry
  }));

  return { modules, commands, total: modules.length + commands.length };
}

function setModuleMaintenance(config, moduleName, enabled, note, by) {
  config.maintenance = config.maintenance || { disabledModules: {}, disabledCommands: {} };
  config.maintenance.disabledModules = config.maintenance.disabledModules || {};
  const key = cleanModuleName(moduleName);

  if (enabled) config.maintenance.disabledModules[key] = buildEntry(note, by);
  else delete config.maintenance.disabledModules[key];

  return config;
}

function setCommandMaintenance(config, commandName, enabled, note, by) {
  config.maintenance = config.maintenance || { disabledModules: {}, disabledCommands: {} };
  config.maintenance.disabledCommands = config.maintenance.disabledCommands || {};
  const key = cleanCommandName(commandName);

  if (enabled) config.maintenance.disabledCommands[key] = buildEntry(note, by);
  else delete config.maintenance.disabledCommands[key];

  return config;
}

module.exports = {
  EXEMPT_COMMANDS,
  cleanCommandName,
  cleanModuleName,
  buildEntry,
  getMaintenanceBlock,
  maintenanceEmbed,
  listMaintenance,
  setModuleMaintenance,
  setCommandMaintenance
};
