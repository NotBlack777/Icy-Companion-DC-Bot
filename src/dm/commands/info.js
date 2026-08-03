/**
 * Info commands: help, invite, servers, status, memstats, config,
 * stafflist, streaks, attendance, find.
 */

const os = require('os');
const { EmbedBuilder, OAuth2Scopes, PermissionFlagsBits } = require('discord.js');

const registry = require('../registry');
const ui = require('../ui');
const { resolveServer, getConfigNumber, serverLabel, syncConfigNumbers } = require('../../utils/serverResolver');
const { getServerConfig } = require('../../utils/configManager');
const { getAllStreaks } = require('../../utils/streakSystem');
const globalStore = require('../../utils/globalStore');
const { buildDmHelp } = require('../help');

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [
    days ? `${days}d` : null,
    hours ? `${hours}h` : null,
    minutes ? `${minutes}m` : null,
    `${secs}s`
  ].filter(Boolean).join(' ');
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }

  return `${value.toFixed(1)} ${units[unit]}`;
}

/* ---------------- HELP ---------------- */

registry.define({
  name: 'help',
  aliases: ['commands', 'h'],
  group: 'info',
  usage: '@bot help',
  desc: 'Show this command panel',
  tier: 'junior',
  async run({ ctx }) {
    return buildDmHelp(ctx);
  }
});

/* ---------------- INVITE ---------------- */

registry.define({
  name: 'invite',
  group: 'info',
  usage: '@bot invite',
  desc: 'Get the bot invite link',
  tier: 'junior',
  async run({ ctx }) {
    let link;

    try {
      link = ctx.client.generateInvite({
        scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
        permissions: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.BanMembers
        ]
      });
    } catch {
      link = `https://discord.com/oauth2/authorize?client_id=${ctx.client.user.id}&permissions=8&scope=bot%20applications.commands`;
    }

    return {
      embeds: [ui.info('🔗 Invite Icy Companion', `[Click here to add the bot](${link})`)]
    };
  }
});

/* ---------------- SERVERS ---------------- */

registry.define({
  name: 'servers',
  aliases: ['serverlist', 'guilds'],
  group: 'info',
  usage: '@bot servers',
  desc: 'List every server the bot is in',
  async run({ ctx }) {
    syncConfigNumbers(ctx.client);

    const guilds = [...ctx.client.guilds.cache.values()]
      .sort((a, b) => getConfigNumber(a.id) - getConfigNumber(b.id));

    const lines = guilds.map(guild => {
      const number = getConfigNumber(guild.id);
      return `\`#${String(number).padStart(2, '0')}\` **${guild.name}** — \`${guild.memberCount}\` members\n> └ \`${guild.id}\``;
    });

    const totalMembers = guilds.reduce((sum, g) => sum + (g.memberCount || 0), 0);

    const pages = ui.chunk(lines);

    return {
      embeds: pages.slice(0, 10).map((page, index) =>
        ui.info(
          index === 0 ? `🌐 Servers (${guilds.length})` : `🌐 Servers (page ${index + 1})`,
          page
        ).setFooter({ text: `${guilds.length} servers • ${totalMembers.toLocaleString()} total members` })
      )
    };
  }
});

/* ---------------- STATUS ---------------- */

registry.define({
  name: 'status',
  aliases: ['stats', 'botinfo'],
  group: 'info',
  usage: '@bot status',
  desc: 'Bot health and runtime status',
  async run({ ctx }) {
    const { client } = ctx;
    const security = globalStore.getSecurity();
    const privacy = globalStore.getPrivacy();

    const embed = ui.info('📊 Bot Status')
      .addFields(
        {
          name: '🤖 Bot',
          value: ui.codeTable({
            Tag: client.user.tag,
            ID: client.user.id,
            Uptime: formatDuration(client.uptime || 0),
            Ping: `${Math.round(client.ws.ping)}ms`
          }),
          inline: false
        },
        {
          name: '🌐 Reach',
          value: ui.codeTable({
            Servers: client.guilds.cache.size,
            Users: client.guilds.cache.reduce((s, g) => s + (g.memberCount || 0), 0),
            Commands: client.commands?.size ?? 0
          }),
          inline: false
        },
        {
          name: '🔒 Security',
          value: ui.codeTable({
            Locked: security.locked ? 'YES' : 'no',
            Password: security.passwordHash ? 'set' : 'not set',
            TOTP: security.totpSecret ? 'enabled' : 'disabled',
            Privacy: privacy.privacyMode ? 'ON' : 'off',
            OTJoin: privacy.otjoinMode ? 'ON' : 'off'
          }),
          inline: false
        }
      );

    return { embeds: [embed] };
  }
});

/* ---------------- MEMSTATS ---------------- */

registry.define({
  name: 'memstats',
  aliases: ['memory'],
  group: 'info',
  usage: '@bot memstats',
  desc: 'Memory and system usage',
  async run() {
    const mem = process.memoryUsage();

    const embed = ui.info('🧠 Memory Stats')
      .addFields(
        {
          name: 'Process',
          value: ui.codeTable({
            RSS: formatBytes(mem.rss),
            'Heap used': formatBytes(mem.heapUsed),
            'Heap total': formatBytes(mem.heapTotal),
            External: formatBytes(mem.external)
          })
        },
        {
          name: 'System',
          value: ui.codeTable({
            Platform: `${os.platform()} ${os.arch()}`,
            CPUs: os.cpus().length,
            'Free mem': formatBytes(os.freemem()),
            'Total mem': formatBytes(os.totalmem()),
            Node: process.version
          })
        }
      );

    return { embeds: [embed] };
  }
});

/* ---------------- CONFIG ---------------- */

registry.define({
  name: 'config',
  group: 'info',
  usage: '@bot config <#N/serverid>',
  desc: 'View a server configuration',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    const guild = resolved.guild;

    const embed = ui.info(`⚙️ Config — ${serverLabel(guild)}`)
      .addFields(
        {
          name: 'General',
          value: ui.codeTable({
            'Guild ID': guild.id,
            'Config #': getConfigNumber(guild.id),
            Prefix: config.prefix || '.',
            Members: guild.memberCount
          })
        },
        {
          name: 'Roles & Channels',
          value: ui.codeTable({
            Owner: config.owner || guild.ownerId,
            'Staff role': config.staffRole || 'none',
            'Attendance ch': config.attendanceChannel || 'none',
            'Remind time': config.remindTime || 'none'
          })
        },
        {
          name: 'Ignore Lists',
          value: ui.codeTable({
            Users: config.ignoreUsers?.length || 0,
            Roles: config.ignoreRoles?.length || 0,
            Channels: config.ignoreChannels?.length || 0,
            'Extra owners': config.extraOwners?.length || 0
          })
        }
      );

    return { embeds: [embed] };
  }
});

/* ---------------- STAFFLIST ---------------- */

registry.define({
  name: 'stafflist',
  aliases: ['staff'],
  group: 'info',
  usage: '@bot stafflist <#N/serverid>',
  desc: 'List staff and owners of a server',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const guild = resolved.guild;
    const config = getServerConfig(guild.id);

    const lines = [`👑 **Server owner:** <@${guild.ownerId}>`];

    if (config.owner && config.owner !== guild.ownerId) {
      lines.push(`⭐ **Bot owner:** <@${config.owner}>`);
    }

    if (config.extraOwners?.length) {
      lines.push('', '**Extra owners**', ...config.extraOwners.map(id => `> <@${id}>`));
    }

    if (config.staffRole) {
      const role = guild.roles.cache.get(config.staffRole);
      lines.push('', `**Staff role:** ${role ? `${role.name} (${role.members.size} members)` : `\`${config.staffRole}\` (missing)`}`);

      if (role?.members?.size) {
        lines.push(...[...role.members.values()].slice(0, 25).map(m => `> ${m.user.tag}`));
      }
    }

    return {
      embeds: [ui.info(`👥 Staff — ${serverLabel(guild)}`, lines.join('\n'))]
    };
  }
});

/* ---------------- STREAKS ---------------- */

registry.define({
  name: 'streaks',
  group: 'info',
  usage: '@bot streaks <#N/serverid>',
  desc: 'View attendance streak leaderboard',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const guild = resolved.guild;
    const all = getAllStreaks();
    const prefix = `${guild.id}-`;

    const entries = Object.entries(all)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        userId: key.slice(prefix.length),
        streak: Number(value?.streak) || 0,
        lastDay: value?.lastDay || 'unknown'
      }))
      .sort((a, b) => b.streak - a.streak);

    if (!entries.length) {
      return { embeds: [ui.warn('No streaks', `No attendance streaks recorded for **${guild.name}**.`)] };
    }

    const medals = ['🥇', '🥈', '🥉'];

    const lines = entries.slice(0, 25).map((entry, index) =>
      `${medals[index] || `\`${String(index + 1).padStart(2, '0')}\``} <@${entry.userId}> — **${entry.streak}** day${entry.streak === 1 ? '' : 's'} \`(${entry.lastDay})\``
    );

    return {
      embeds: [ui.info(`🔥 Streaks — ${serverLabel(guild)}`, lines.join('\n'))
        .setFooter({ text: `${entries.length} tracked members` })]
    };
  }
});

/* ---------------- ATTENDANCE ---------------- */

registry.define({
  name: 'attendance',
  group: 'info',
  usage: '@bot attendance <#N/serverid>',
  desc: 'View attendance records for a server',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server not found', resolved.error)] };

    const guild = resolved.guild;
    const config = getServerConfig(guild.id);
    const users = config.attendance?.users || {};

    const entries = Object.entries(users);

    if (!entries.length) {
      return { embeds: [ui.warn('No attendance', `No attendance recorded for **${guild.name}**.`)] };
    }

    const today = new Date().toISOString().slice(0, 10);
    const todayCount = entries.filter(([, day]) => String(day).startsWith(today)).length;

    const lines = entries
      .sort((a, b) => String(b[1]).localeCompare(String(a[1])))
      .slice(0, 30)
      .map(([userId, day], index) => `\`${String(index + 1).padStart(2, '0')}\` <@${userId}> → \`${day}\``);

    return {
      embeds: [ui.info(`📋 Attendance — ${serverLabel(guild)}`, lines.join('\n'))
        .setFooter({ text: `${entries.length} total • ${todayCount} marked today` })]
    };
  }
});

/* ---------------- FIND ---------------- */

registry.define({
  name: 'find',
  aliases: ['lookup', 'whois'],
  group: 'info',
  usage: '@bot find <user id>',
  desc: 'Find which servers a user shares with the bot',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    let user;

    try {
      user = await ctx.client.users.fetch(args.user, { force: true });
    } catch {
      return { embeds: [ui.error('User not found', `Could not fetch \`${args.user}\`.`)] };
    }

    const shared = [];

    for (const guild of ctx.client.guilds.cache.values()) {
      let member = guild.members.cache.get(user.id);

      if (!member) {
        member = await guild.members.fetch(user.id).catch(() => null);
      }

      if (member) {
        shared.push({ guild, member });
      }
    }

    const embed = new EmbedBuilder()
      .setColor(ui.COLORS.brand)
      .setTitle(`🔍 ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields({
        name: 'User',
        value: ui.codeTable({
          ID: user.id,
          Bot: user.bot ? 'yes' : 'no',
          Created: user.createdAt.toISOString().slice(0, 10)
        })
      })
      .setTimestamp();

    if (shared.length) {
      const lines = shared.slice(0, 20).map(({ guild, member }) =>
        `\`#${getConfigNumber(guild.id)}\` **${guild.name}**\n> └ joined \`${member.joinedAt?.toISOString().slice(0, 10) || 'unknown'}\` • ${member.roles.cache.size - 1} roles`
      );

      embed.addFields({ name: `🌐 Shared servers (${shared.length})`, value: ui.truncate(lines.join('\n')) });
    } else {
      embed.addFields({ name: '🌐 Shared servers', value: 'None found.' });
    }

    return { embeds: [embed] };
  }
});

module.exports = {};
