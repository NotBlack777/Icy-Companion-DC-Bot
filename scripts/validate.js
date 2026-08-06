#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Collection } = require('discord.js');

const root = path.resolve(__dirname, '..');
const ignoredDirs = new Set(['.git', 'node_modules', 'server_configs']);

function walk(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(path.join(dir, entry.name), predicate, out);
      continue;
    }

    const file = path.join(dir, entry.name);
    if (entry.isFile() && predicate(file)) out.push(file);
  }

  return out;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function section(title) {
  console.log(`\n== ${title} ==`);
}

let failures = 0;

function fail(message) {
  failures++;
  console.error(`❌ ${message}`);
}

function pass(message) {
  console.log(`✅ ${message}`);
}

section('Syntax check');
const jsFiles = walk(root, file => file.endsWith('.js'));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    fail(`${rel(file)} failed node --check`);
    if (result.stderr) console.error(result.stderr.trim());
  }
}
if (!failures) pass(`${jsFiles.length} JavaScript files parsed`);

section('Require smoke test');
const srcFiles = jsFiles.filter(file => rel(file).startsWith('src/'));
for (const file of srcFiles) {
  try {
    require(file);
  } catch (err) {
    fail(`${rel(file)} failed to require: ${err.stack || err.message}`);
  }
}
if (failures === 0) pass(`${srcFiles.length} source modules required`);

section('Guild slash commands');
try {
  const loadCommands = require('../src/handlers/loadCommands');
  const client = { commands: new Collection() };
  const result = loadCommands(client);

  if (result.failed) fail(`${result.failed} command files failed to load`);

  let badJson = 0;
  for (const [name, command] of client.commands) {
    try {
      command.data.toJSON();
    } catch (err) {
      badJson++;
      fail(`${name} has invalid slash JSON: ${err.message}`);
    }
  }

  if (!result.failed && !badJson) {
    pass(`${client.commands.size} guild commands/aliases loaded (${result.aliased || 0} aliases)`);
  }
} catch (err) {
  fail(`guild command validation crashed: ${err.stack || err.message}`);
}

section('DM command registry and slash commands');
try {
  const registry = require('../src/dm/registry');
  const loadDmCommands = require('../src/dm/loadCommands');
  const dmSlash = require('../src/dm/slash');

  loadDmCommands();
  const groups = new Set(registry.GROUPS.map(group => group.id));
  const commands = registry.all();

  for (const command of commands) {
    if (!command.name) fail('DM command missing name');
    if (!command.usage) fail(`${command.name} missing usage`);
    if (!command.desc) fail(`${command.name} missing description`);
    if (!groups.has(command.group)) fail(`${command.name} has unknown group ${command.group}`);
    if (typeof command.run !== 'function') fail(`${command.name} missing run()`);

    const argNames = new Set();
    for (const arg of command.args || []) {
      if (argNames.has(arg.name)) fail(`${command.name} has duplicate arg ${arg.name}`);
      argNames.add(arg.name);
    }
  }

  const slashCommands = dmSlash.buildAll();
  const slashNames = new Set();
  for (const command of slashCommands) {
    try {
      const json = command.data.toJSON();
      if (slashNames.has(json.name)) fail(`duplicate DM slash name ${json.name}`);
      slashNames.add(json.name);
    } catch (err) {
      fail(`${command.dmCommand} has invalid DM slash JSON: ${err.message}`);
    }
  }

  pass(`${commands.length} DM commands and ${slashCommands.length} generated DM slash commands validated`);
} catch (err) {
  fail(`DM command validation crashed: ${err.stack || err.message}`);
}

async function runRuntimeSmokeChecks() {
  section('Runtime smoke checks');
  const before = failures;

  const ui = require('../src/dm/ui');
  const panelJson = ui.panel('String Body Smoke', 'single string body').toJSON();
  if (!panelJson.description.includes('single string body')) {
    fail('ui.panel did not preserve a plain string body');
  }

  const registry = require('../src/dm/registry');
  const loadDmCommands = require('../src/dm/loadCommands');
  loadDmCommands();

  const ownerList = registry.get('ownerlist');
  const payload = await ownerList.run({
    ctx: {
      client: {
        user: { displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png' },
        users: { fetch: async () => null }
      }
    },
    args: {}
  });

  if (!payload?.embeds?.[0]?.toJSON) {
    fail('ownerlist did not return a Discord embed');
  } else {
    payload.embeds[0].toJSON();
  }

  const { isGuildOwner } = require('../src/utils/guildAuth');
  const { canUseCommand } = require('../src/utils/permissions');
  const authConfig = {
    owner: 'primary-owner',
    extraOwners: ['extra-owner'],
    ignoreUsers: ['extra-owner', 'ignored-user'],
    ignoreChannels: ['ignored-channel'],
    ignoreRoles: []
  };

  const fakeInteraction = userId => ({
    user: { id: userId },
    guild: { id: 'guild-id', ownerId: 'guild-owner' },
    channel: { id: 'ignored-channel' },
    member: { roles: { cache: new Map() } }
  });

  if (!isGuildOwner(authConfig, fakeInteraction('primary-owner'))) fail('primary server owner was not recognized');
  if (!isGuildOwner(authConfig, fakeInteraction('extra-owner'))) fail('extra server owner was not recognized');
  if (isGuildOwner(authConfig, fakeInteraction('normal-user'))) fail('normal user was recognized as server owner');
  if (!canUseCommand(authConfig, fakeInteraction('extra-owner'))) fail('server owner did not bypass ignore rules');
  if (canUseCommand(authConfig, fakeInteraction('ignored-user'))) fail('ignored normal user bypassed ignore rules');

  const { getDisplayRolePosition } = require('../src/utils/rolePosition');
  const roleFixtures = [
    { id: 'guild-id', position: 0, name: '@everyone' },
    { id: 'bottom-role', position: 1, name: 'Bottom' },
    { id: 'middle-role', position: 2, name: 'Middle' },
    { id: 'top-role', position: 3, name: 'Top' }
  ];
  const roleGuild = { id: 'guild-id', roles: { cache: new Map(roleFixtures.map(role => [role.id, role])) } };
  if (getDisplayRolePosition(roleGuild, roleFixtures[3]).position !== 1) fail('top role did not display as position #1');
  if (getDisplayRolePosition(roleGuild, roleFixtures[2]).position !== 2) fail('middle role did not display as position #2');
  if (getDisplayRolePosition(roleGuild, roleFixtures[1]).position !== 3) fail('bottom role did not display as position #3');

  const store = require('../src/utils/globalStore');
  const originalLogger = store.getDmLogger();
  try {
    store.setDmLogger({ accessMode: 'blacklist', blacklist: ['blocked-user'], whitelist: ['allowed-user'] });
    if (store.canLogDmUser('blocked-user')) fail('blacklisted user was allowed in blacklist mode');
    if (!store.canLogDmUser('allowed-user')) fail('normal user was blocked in blacklist mode');
    store.setDmLogger({ accessMode: 'whitelist' });
    if (!store.canLogDmUser('allowed-user')) fail('whitelisted user was blocked in whitelist mode');
    if (store.canLogDmUser('random-user')) fail('non-whitelisted user was allowed in whitelist mode');
  } finally {
    store.setDmLogger(originalLogger);
  }

  if (failures === before) {
    pass('UI, security embeds and owner authority checks pass');
  }
}

function finish() {
  if (failures) {
    console.error(`\n${failures} validation failure(s).`);
    process.exit(1);
  }

  console.log('\nAll validation checks passed.');
  process.exit(0);
}

runRuntimeSmokeChecks()
  .then(finish)
  .catch(err => {
    fail(`runtime smoke checks crashed: ${err.stack || err.message}`);
    finish();
  });
