/**
 * Management commands: leave, kick, ban, setowner, resetconfig,
 * resetattendance, setremind.
 */

const registry = require('../registry');
const ui = require('../ui');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');
const {
  getServerConfig,
  saveServerConfig,
  createDefaultConfig
} = require('../../utils/configManager');
const { clearGuildStreaks } = require('../../utils/streakSystem');
const {
  cleanCommandName,
  cleanModuleName,
  listMaintenance,
  setModuleMaintenance,
  setCommandMaintenance
} = require('../../utils/maintenance');
const { clearAllRateLimits } = require('../../utils/cooldown');

/* ---------------- LEAVE ---------------- */

registry.define({
  name: 'leave',
  group: 'management',
  usage: '@bot leave <server id>',
  desc: 'Make the bot leave a server',
  secure: true,
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const label = serverLabel(resolved.guild);

    try {
      await resolved.guild.leave();
    } catch (err) {
      return { embeds: [ui.error('Leave failed', err.message)] };
    }

    return { embeds: [ui.success('Left Server', `The bot has left **${label}**.`)] };
  }
});

/* ---------------- KICK ---------------- */

registry.define({
  name: 'kick',
  group: 'management',
  usage: '@bot kick <#N/serverid> <user id> [reason]',
  desc: 'Kick a member from a server',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user', type: 'user', required: true },
    { name: 'reason', type: 'rest', required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const member = await resolved.guild.members.fetch(String(args.user)).catch(() => null);

    if (!member) {
      return { embeds: [ui.error('Member not found', `\`${args.user}\` is not in **${resolved.guild.name}**.`)] };
    }

    if (!member.kickable) {
      return { embeds: [ui.error('Cannot kick', `The bot lacks permission or **${member.user.tag}** has a higher role.`)] };
    }

    const reason = args.reason || 'No reason provided';

    try {
      await member.kick(`[Super Owner] ${reason}`);
    } catch (err) {
      return { embeds: [ui.error('Kick failed', err.message)] };
    }

    return {
      embeds: [ui.success('Member Kicked', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Member:** ${member.user.tag} (\`${member.id}\`)`,
        `**Reason:** ${reason}`
      ]))]
    };
  }
});

/* ---------------- BAN ---------------- */

registry.define({
  name: 'ban',
  group: 'management',
  usage: '@bot ban <#N/serverid> <user id> [reason]',
  desc: 'Ban a user from a server',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user', type: 'user', required: true },
    { name: 'reason', type: 'rest', required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const userId = String(args.user);
    const reason = args.reason || 'No reason provided';

    const member = await resolved.guild.members.fetch(userId).catch(() => null);

    if (member && !member.bannable) {
      return { embeds: [ui.error('Cannot ban', `The bot lacks permission or **${member.user.tag}** has a higher role.`)] };
    }

    try {
      // Ban by ID so it works for users who already left.
      await resolved.guild.bans.create(userId, { reason: `[Super Owner] ${reason}` });
    } catch (err) {
      return { embeds: [ui.error('Ban failed', err.message)] };
    }

    return {
      embeds: [ui.success('User Banned', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**User:** ${member?.user?.tag || userId} (\`${userId}\`)`,
        `**Reason:** ${reason}`
      ]))]
    };
  }
});

/* ---------------- SETOWNER ---------------- */

registry.define({
  name: 'setowner',
  group: 'management',
  usage: '@bot setowner <#N/serverid> <user id>',
  desc: 'Set the bot owner for a server',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user', type: 'user', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const userId = String(args.user);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    if (!user) {
      return { embeds: [ui.error('User not found', `Could not fetch \`${userId}\`.`)] };
    }

    const config = getServerConfig(resolved.guildId);
    const previous = config.owner;

    config.owner = userId;
    saveServerConfig(resolved.guildId, config);

    return {
      embeds: [ui.success('Owner Updated', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**New owner:** ${user.tag} (<@${userId}>)`,
        `**Previous:** ${previous ? `<@${previous}>` : 'none'}`
      ]))]
    };
  }
});


/* ---------------- SERVEROWNER ADD ---------------- */

registry.define({
  name: 'serverowner add',
  aliases: ['addserverowner', 'add-serverowner', 'serverowner-add', 'server-owner-add'],
  group: 'management',
  usage: '@bot serverowner add <#N/serverid> <user id>',
  desc: 'Add an extra server bot owner',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user', type: 'user', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const userId = String(args.user);
    const user = await ctx.client.users.fetch(userId).catch(() => null);

    if (!user) {
      return { embeds: [ui.error('User not found', `Could not fetch \`${userId}\`.`)] };
    }

    const config = getServerConfig(resolved.guildId);
    const primary = config.owner || resolved.guild.ownerId;
    config.owner = primary;
    config.extraOwners = Array.isArray(config.extraOwners) ? config.extraOwners : [];

    if (userId === primary || userId === resolved.guild.ownerId) {
      return { embeds: [ui.warn('Already Primary Owner', `${user.tag} is already the primary/server owner for **${resolved.guild.name}**.`)] };
    }

    if (config.extraOwners.includes(userId)) {
      return { embeds: [ui.warn('Already Server Owner', `${user.tag} is already an extra server owner for **${resolved.guild.name}**.`)] };
    }

    config.extraOwners.push(userId);
    saveServerConfig(resolved.guildId, config);

    return {
      embeds: [ui.success('Server Owner Added', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Owner:** ${user.tag} (<@${userId}>)`,
        `**Access:** Can use owner/staff-level bot commands in this server.`
      ]))]
    };
  }
});

/* ---------------- SERVEROWNER REMOVE ---------------- */

registry.define({
  name: 'serverowner remove',
  aliases: ['removeserverowner', 'remove-serverowner', 'serverowner-remove', 'server-owner-remove'],
  group: 'management',
  usage: '@bot serverowner remove <#N/serverid> <user id>',
  desc: 'Remove an extra server bot owner',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user', type: 'user', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const userId = String(args.user);
    const config = getServerConfig(resolved.guildId);
    const primary = config.owner || resolved.guild.ownerId;
    config.owner = primary;
    config.extraOwners = Array.isArray(config.extraOwners) ? config.extraOwners : [];

    if (userId === primary || userId === resolved.guild.ownerId) {
      return { embeds: [ui.error('Cannot Remove Primary', 'The primary/server owner cannot be removed here. Use `@bot setowner <server> <user>` to transfer first.')] };
    }

    if (!config.extraOwners.includes(userId)) {
      return { embeds: [ui.warn('Not Server Owner', `<@${userId}> is not an extra server owner for **${resolved.guild.name}**.`)] };
    }

    config.extraOwners = config.extraOwners.filter(id => id !== userId);
    saveServerConfig(resolved.guildId, config);

    const user = await ctx.client.users.fetch(userId).catch(() => null);

    return {
      embeds: [ui.success('Server Owner Removed', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Owner:** ${user ? `${user.tag} (<@${userId}>)` : `<@${userId}>`}`
      ]))]
    };
  }
});

/* ---------------- SERVEROWNER LIST ---------------- */

registry.define({
  name: 'serverowner list',
  aliases: ['serverowners', 'serverowner-list', 'server-owner-list'],
  group: 'management',
  usage: '@bot serverowner list <#N/serverid>',
  desc: 'List server bot owners',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    const primary = config.owner || resolved.guild.ownerId;
    const extraOwners = Array.isArray(config.extraOwners) ? config.extraOwners : [];

    const lines = [
      `**Server:** ${serverLabel(resolved.guild)}`,
      `**Primary:** <@${primary}>`,
      '',
      `**Extra Owners (${extraOwners.length})**`,
      ...(extraOwners.length ? extraOwners.map(id => `> <@${id}>`) : ['> _none_'])
    ];

    return { embeds: [ui.info('Server Owners', lines.join('\n'))] };
  }
});


/* ---------------- MAINTENANCE LIST ---------------- */

function parseToggle(value) {
  const raw = String(value || '').toLowerCase();
  if (['on', 'true', 'yes', 'enable', 'enabled', 'maintenance'].includes(raw)) return true;
  if (['off', 'false', 'no', 'disable', 'disabled', 'live'].includes(raw)) return false;
  return null;
}

function maintenanceSummary(config) {
  const list = listMaintenance(config);
  if (!list.total) return 'Everything is live. No modules or commands are under maintenance.';

  return [
    `**Total disabled:** \`${list.total}\``,
    '',
    `**Modules (${list.modules.length})**`,
    list.modules.length ? list.modules.map(entry => `> **${entry.name}** — ${entry.note || 'No note'}`).join('\n') : '> _None_',
    '',
    `**Commands (${list.commands.length})**`,
    list.commands.length ? list.commands.map(entry => `> **${entry.name}** — ${entry.note || 'No note'}`).join('\n') : '> _None_'
  ].join('\n');
}

registry.define({
  name: 'maintenance list',
  aliases: ['maint list', 'maintenance status'],
  group: 'management',
  usage: '@bot maintenance list <#N/serverid>',
  desc: 'Show modules and commands under maintenance in a server',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    return {
      embeds: [ui.panel('Maintenance Status', [
        `**Server:** ${serverLabel(resolved.guild)}`,
        '',
        maintenanceSummary(config)
      ], { color: ui.ICY.warn })]
    };
  }
});

registry.define({
  name: 'maintenance module',
  aliases: ['maint module'],
  group: 'management',
  usage: '@bot maintenance module <#N/serverid> <module> <on/off> [note]',
  desc: 'Toggle maintenance for a whole module/category',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'module', type: 'word', required: true },
    { name: 'state', type: 'word', required: true },
    { name: 'note', type: 'rest', required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const enabled = parseToggle(args.state);
    if (enabled === null) return { embeds: [ui.error('Invalid State', 'Use `on` for maintenance or `off` to make it live.')] };

    const config = getServerConfig(resolved.guildId);
    const moduleName = cleanModuleName(args.module);
    setModuleMaintenance(config, moduleName, enabled, args.note, ctx.user.id);
    saveServerConfig(resolved.guildId, config);

    return {
      embeds: [ui.panel(enabled ? 'Module Under Maintenance' : 'Module Back Online', [
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Module:** \`${moduleName}\``,
        enabled ? `**Note shown:** ${args.note || 'Temporarily under maintenance.'}` : '**Status:** Live again'
      ], { color: enabled ? ui.ICY.warn : ui.ICY.success })]
    };
  }
});

registry.define({
  name: 'maintenance command',
  aliases: ['maint command'],
  group: 'management',
  usage: '@bot maintenance command <#N/serverid> <command> <on/off> [note]',
  desc: 'Toggle maintenance for one command',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'command', type: 'word', required: true },
    { name: 'state', type: 'word', required: true },
    { name: 'note', type: 'rest', required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const enabled = parseToggle(args.state);
    if (enabled === null) return { embeds: [ui.error('Invalid State', 'Use `on` for maintenance or `off` to make it live.')] };

    const config = getServerConfig(resolved.guildId);
    const commandName = cleanCommandName(args.command);
    setCommandMaintenance(config, commandName, enabled, args.note, ctx.user.id);
    saveServerConfig(resolved.guildId, config);

    return {
      embeds: [ui.panel(enabled ? 'Command Under Maintenance' : 'Command Back Online', [
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Command:** \`/${commandName}\``,
        enabled ? `**Note shown:** ${args.note || 'Temporarily under maintenance.'}` : '**Status:** Live again'
      ], { color: enabled ? ui.ICY.warn : ui.ICY.success })]
    };
  }
});

/* ---------------- RATE LIMIT ---------------- */

registry.define({
  name: 'ratelimit',
  aliases: ['rate-limit', 'cooldown'],
  group: 'management',
  usage: '@bot ratelimit <#N/serverid> <status|off|seconds>',
  desc: 'Show, disable or set server command rate limits',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'value', type: 'word', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    config.rateLimit = config.rateLimit || { enabled: true, durationMs: 3000 };
    const value = String(args.value).toLowerCase();

    if (value === 'off' || value === 'disable') {
      config.rateLimit.enabled = false;
      clearAllRateLimits();
      saveServerConfig(resolved.guildId, config);
    } else if (value !== 'status') {
      const seconds = Number(value);
      if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86400) {
        return { embeds: [ui.error('Invalid Rate Limit', 'Use `status`, `off`, or a duration in seconds from `0` to `86400`.')] };
      }
      config.rateLimit.enabled = seconds > 0;
      config.rateLimit.durationMs = seconds * 1000;
      clearAllRateLimits();
      saveServerConfig(resolved.guildId, config);
    }

    return {
      embeds: [ui.panel('Rate Limit', [
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Status:** ${config.rateLimit.enabled ? '`Enabled`' : '`Disabled`'}`,
        `**Duration:** \`${Math.round((config.rateLimit.durationMs || 0) / 1000)}s\``,
        '> Applies per user + per command. Server owners bypass it.'
      ], { color: config.rateLimit.enabled ? ui.ICY.frost : ui.ICY.warn })]
    };
  }
});

/* ---------------- RESETCONFIG ---------------- */

registry.define({
  name: 'resetconfig',
  group: 'management',
  usage: '@bot resetconfig <#N/serverid>',
  desc: 'Reset a server config to defaults',
  secure: true,
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const fresh = createDefaultConfig(resolved.guildId);
    fresh.guildName = resolved.guild.name;
    fresh.owner = resolved.guild.ownerId;

    saveServerConfig(resolved.guildId, fresh);

    return {
      embeds: [ui.success('Config Reset', `**${serverLabel(resolved.guild)}** has been reset to defaults.\n> Attendance, ignore lists and staff settings are cleared.`)]
    };
  }
});

/* ---------------- RESETATTENDANCE ---------------- */

registry.define({
  name: 'resetattendance',
  group: 'management',
  usage: '@bot resetattendance <#N/serverid>',
  desc: 'Clear attendance records and streaks',
  secure: true,
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    const cleared = Object.keys(config.attendance?.users || {}).length;

    config.attendance = { users: {} };
    saveServerConfig(resolved.guildId, config);

    const streaks = clearGuildStreaks(resolved.guildId);

    return {
      embeds: [ui.success('Attendance Reset', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Records cleared:** \`${cleared}\``,
        `**Streaks cleared:** \`${streaks}\``
      ]))]
    };
  }
});

/* ---------------- SETREMIND ---------------- */

registry.define({
  name: 'setremind',
  group: 'management',
  usage: '@bot setremind <#N/serverid> <HH:MM>',
  desc: 'Set the daily attendance reminder time',
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'time', type: 'word', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const time = String(args.time).trim();

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
      return { embeds: [ui.error('Invalid time', `\`${time}\` is not valid. Use 24-hour \`HH:MM\`, e.g. \`09:30\` or \`21:00\`.`)] };
    }

    const config = getServerConfig(resolved.guildId);
    const previous = config.remindTime;

    config.remindTime = time;
    saveServerConfig(resolved.guildId, config);

    return {
      embeds: [ui.success('Reminder Time Set', ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Time:** \`${time}\``,
        `**Previous:** \`${previous || 'none'}\``,
        `**Subscribers:** \`${config.remindUsers?.length || 0}\``
      ]))]
    };
  }
});

module.exports = {};
