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
