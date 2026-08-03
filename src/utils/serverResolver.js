/**
 * Server resolver
 * ---------------
 * Every DM command that targets a guild accepts either:
 *
 *   #N          -> config number (stable, assigned on first sight)
 *   <serverid>  -> raw Discord guild ID
 *
 * Config numbers live in server_configs/master.json, so #1 keeps pointing
 * at the same guild across restarts.
 */

const fs = require('fs');
const path = require('path');
const { getMaster, masterPath } = require('./configManager');

function saveMaster(master) {
  const dir = path.dirname(masterPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(masterPath, JSON.stringify(master, null, 2));
  return master;
}

/**
 * Get (or assign) the stable config number for a guild.
 */
function getConfigNumber(guildId) {
  const master = getMaster();

  if (master.serverNumbers[guildId]) return master.serverNumbers[guildId];

  const used = Object.values(master.serverNumbers).map(Number).filter(Number.isFinite);
  const next = used.length ? Math.max(...used) + 1 : 1;

  master.serverNumbers[guildId] = next;
  saveMaster(master);

  return next;
}

/**
 * Make sure every guild the bot is in has a config number.
 */
function syncConfigNumbers(client) {
  const master = getMaster();
  let changed = false;

  const used = Object.values(master.serverNumbers).map(Number).filter(Number.isFinite);
  let next = used.length ? Math.max(...used) + 1 : 1;

  for (const guildId of client.guilds.cache.keys()) {
    if (!master.serverNumbers[guildId]) {
      master.serverNumbers[guildId] = next++;
      changed = true;
    }
  }

  if (changed) saveMaster(master);
  return master.serverNumbers;
}

function guildIdFromNumber(number) {
  const master = getMaster();
  const target = Number(number);

  return Object.keys(master.serverNumbers)
    .find(guildId => Number(master.serverNumbers[guildId]) === target) || null;
}

/**
 * Resolve a "#N" or raw guild ID token into a Guild the bot can see.
 *
 * @returns {{ ok: boolean, guild?: Guild, guildId?: string, error?: string }}
 */
function resolveServer(client, token) {
  if (!token) {
    return { ok: false, error: 'No server given. Use `#N` (e.g. `#1`) or a server ID.' };
  }

  const raw = String(token).trim();

  // #N form
  if (raw.startsWith('#')) {
    const number = Number(raw.slice(1));

    if (!Number.isInteger(number) || number < 1) {
      return { ok: false, error: `\`${raw}\` is not a valid config number.` };
    }

    const guildId = guildIdFromNumber(number);

    if (!guildId) {
      return { ok: false, error: `No server registered with config number \`#${number}\`.` };
    }

    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return { ok: false, error: `Config \`#${number}\` points at \`${guildId}\`, but the bot is no longer in that server.` };
    }

    return { ok: true, guild, guildId };
  }

  // Raw guild ID
  if (/^\d{15,25}$/.test(raw)) {
    const guild = client.guilds.cache.get(raw);

    if (!guild) {
      return { ok: false, error: `The bot is not in a server with ID \`${raw}\`.` };
    }

    return { ok: true, guild, guildId: raw };
  }

  // Fall back to a name match, which is handy in DMs.
  const byName = client.guilds.cache.find(
    g => g.name.toLowerCase() === raw.toLowerCase()
  );

  if (byName) {
    return { ok: true, guild: byName, guildId: byName.id };
  }

  return { ok: false, error: `Could not resolve \`${raw}\`. Use \`#N\` or a server ID.` };
}

/**
 * A short "#3 · My Server" label for embeds.
 */
function serverLabel(guild) {
  if (!guild) return 'Unknown server';
  return `#${getConfigNumber(guild.id)} · ${guild.name}`;
}

module.exports = {
  getConfigNumber,
  syncConfigNumbers,
  guildIdFromNumber,
  resolveServer,
  serverLabel,
  saveMaster
};
