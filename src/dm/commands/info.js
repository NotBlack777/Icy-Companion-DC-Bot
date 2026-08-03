/**
 * Info commands: help, invite, servers, status, memstats, config,
 * stafflist, streaks, attendance, find.
 *
 * All embeds use the icy futuristic UI system.
 */

const os = require('os');
const { EmbedBuilder, OAuth2Scopes, PermissionFlagsBits } = require('discord.js');

const registry  = require('../registry');
const ui         = require('../ui');
const { resolveServer, getConfigNumber, serverLabel, syncConfigNumbers } = require('../../utils/serverResolver');
const { getServerConfig }  = require('../../utils/configManager');
const { getAllStreaks }    = require('../../utils/streakSystem');
const globalStore = require('../../utils/globalStore');
const { buildDmHelp }      = require('../help');

const { ICY } = ui;

// ─── Format Helpers ───────────────────────────────────────────────
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const days    = Math.floor(seconds / 86400);
  const hours   = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs    = seconds % 60;
  return [days ? `${days}d` : null, hours ? `${hours}h` : null, minutes ? `${minutes}m` : null, `${secs}s`]
    .filter(Boolean).join(' ') || '0s';
}

function formatBytes(bytes) {
  const units = ['B','KB','MB','GB'];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value.toFixed(1)} ${units[unit]}`;
}

function icyDivider(color = ICY.frost) {
  return `\`\`\`\n${'═'.repeat(44)}\n\`\`\``;
}

// ─── HELP ─────────────────────────────────────────────────────────
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

// ─── INVITE ───────────────────────────────────────────────────────
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
          PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,  PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.BanMembers
        ]
      });
    } catch {
      link = `https://discord.com/oauth2/authorize?client_id=${ctx.client.user.id}&permissions=8&scope=bot%20applications.commands`;
    }

    const embed = new EmbedBuilder()
      .setColor(ICY.mint)
      .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
      .setTitle('❄️ Invite Link')
      .setDescription([
        icyDivider(ICY.mint),
        '',
        '>  Click the button below to add **Icy Companion** to your server.',
        '',
        `[Click here to add the bot](${link})`,
        '',
        icyDivider(ICY.mint),
      ].join('\n'))
      .setFooter({ text: '✦ Icy Companion — Premium Utility Bot' })
      .setTimestamp();

    return { embeds: [embed] };
  }
});

// ─── SERVERS ───────────────────────────────────────────────────────
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

    const totalMembers = guilds.reduce((sum, g) => sum + (g.memberCount || 0), 0);

    const lines = guilds.map(guild => {
      const n = getConfigNumber(guild.id);
      return `\`#${String(n).padStart(2,'0')}\` **${guild.name}** — \`${guild.memberCount}\` members\n> └ \`${guild.id}\``;
    });

    const pages = ui.chunk(lines);

    return {
      embeds: pages.slice(0, 10).map((page, i) =>
        new EmbedBuilder()
          .setColor(ICY.frost)
          .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
          .setTitle(i === 0 ? `🌐 Servers (${guilds.length})` : `🌐 Servers — Page ${i + 1}`)
          .setDescription([ icyDivider(), page, icyDivider() ].join('\n'))
          .setFooter({ text: `✦ ${guilds.length} servers • ${totalMembers.toLocaleString()} members` })
          .setTimestamp()
      )
    };
  }
});

// ─── STATUS ───────────────────────────────────────────────────────
registry.define({
  name: 'status',
  aliases: ['stats', 'botinfo'],
  group: 'info',
  usage: '@bot status',
  desc: 'Bot health and runtime status',
  async run({ ctx }) {
    const security = globalStore.getSecurity();
    const privacy  = globalStore.getPrivacy();

    return {
      embeds: [ui.status('Bot Status', [
        {
          title: 'Bot',
          color: ICY.frost,
          rows: {
            Tag:    ctx.client.user.tag,
            ID:     `\`${ctx.client.user.id}\``,
            Uptime: formatDuration(ctx.client.uptime || 0),
            Ping:   `\`${Math.round(ctx.client.ws.ping)}ms\``,
          }
        },
        {
          title: 'Reach',
          color: ICY.mint,
          rows: {
            Servers:  ctx.client.guilds.cache.size,
            Users:    ctx.client.guilds.cache.reduce((s, g) => s + (g.memberCount || 0), 0),
            Commands: ctx.client.commands?.size ?? 0,
          }
        },
        {
          title: 'Security',
          color: ICY.violet,
          rows: {
            Locked:   security.locked ? '🔒 YES' : '🔓 no',
            Password: security.passwordHash ? '✅ set' : '❌ not set',
            TOTP:     security.totpSecret  ? '✅ enabled' : '❌ disabled',
            Privacy:  privacy.privacyMode  ? '🔒 ON' : 'off',
            OTJoin:   privacy.otjoinMode   ? '⚠️ ON' : 'off',
          }
        }
      ], { thumbnail: ctx.client.user?.displayAvatarURL?.() || null })]
    };
  }
});

// ─── MEMSTATS ─────────────────────────────────────────────────────
registry.define({
  name: 'memstats',
  aliases: ['memory'],
  group: 'info',
  usage: '@bot memstats',
  desc: 'Memory and system usage',
  async run() {
    const mem = process.memoryUsage();
    return {
      embeds: [ui.status('Memory & System', [
        {
          title: 'Process Memory',
          color: ICY.glacier,
          rows: {
            RSS:        formatBytes(mem.rss),
            'Heap Used': formatBytes(mem.heapUsed),
            'Heap Total':formatBytes(mem.heapTotal),
            External:   formatBytes(mem.external),
          }
        },
        {
          title: 'System',
          color: ICY.frost,
          rows: {
            Platform: `${os.platform()} ${os.arch()}`,
            CPUs:     os.cpus().length,
            'Free RAM':formatBytes(os.freemem()),
            'Total RAM':formatBytes(os.totalmem()),
            Node:     process.version,
          }
        }
      ])]
    };
  }
});

// ─── CONFIG ───────────────────────────────────────────────────────
registry.define({
  name: 'config',
  group: 'info',
  usage: '@bot config <#N/serverid>',
  desc: 'View a server configuration',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    const guild  = resolved.guild;

    return {
      embeds: [ui.status(`⚙️ Config — ${serverLabel(guild)}`, [
        {
          title: 'General',
          color: ICY.frost,
          rows: {
            'Guild ID':    `\`${guild.id}\``,
            'Config #':    `#${getConfigNumber(guild.id)}`,
            Prefix:        config.prefix || '.',
            Members:       guild.memberCount,
          }
        },
        {
          title: 'Roles & Channels',
          color: ICY.glacier,
          rows: {
            Owner:          config.owner || guild.ownerId,
            'Staff Role':   config.staffRole || '_none_',
            'Attendance Ch':config.attendanceChannel || '_none_',
            'Remind Time':  config.remindTime || '_none_',
          }
        },
        {
          title: 'Ignore Lists',
          color: ICY.violet,
          rows: {
            Users:        config.ignoreUsers?.length || 0,
            Roles:        config.ignoreRoles?.length || 0,
            Channels:     config.ignoreChannels?.length || 0,
            'Extra Owners':config.extraOwners?.length || 0,
          }
        }
      ], { thumbnail: guild.iconURL?.() || null })]
    };
  }
});

// ─── STAFFLIST ────────────────────────────────────────────────────
registry.define({
  name: 'stafflist',
  aliases: ['staff'],
  group: 'info',
  usage: '@bot stafflist <#N/serverid>',
  desc: 'List staff and owners of a server',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const guild  = resolved.guild;
    const config = getServerConfig(guild.id);

    const lines = [`👑 **Server Owner:** <@${guild.ownerId}>`];
    if (config.owner && config.owner !== guild.ownerId)
      lines.push(`⭐ **Bot Owner:** <@${config.owner}>`);
    if (config.extraOwners?.length)
      lines.push('', '**Extra Owners**', ...config.extraOwners.map(id => `> <@${id}>`));

    if (config.staffRole) {
      const role = guild.roles.cache.get(config.staffRole);
      lines.push('', `**Staff Role:** ${role ? `${role.name} (${role.members.size} members)` : `\`${config.staffRole}\` (missing)`}`);
      if (role?.members?.size)
        lines.push(...[...role.members.values()].slice(0, 25).map(m => `> ${m.user.tag}`));
    }

    return {
      embeds: [ui.panel(`👥 Staff — ${serverLabel(guild)}`, lines.join('\n'), { color: ICY.glacier })]
    };
  }
});

// ─── STREAKS ──────────────────────────────────────────────────────
registry.define({
  name: 'streaks',
  group: 'info',
  usage: '@bot streaks <#N/serverid>',
  desc: 'View attendance streak leaderboard',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const guild   = resolved.guild;
    const all     = getAllStreaks();
    const prefix  = `${guild.id}-`;

    const entries = Object.entries(all)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => ({ userId: k.slice(prefix.length), streak: Number(v?.streak) || 0, lastDay: v?.lastDay || '?' }))
      .sort((a, b) => b.streak - a.streak);

    if (!entries.length)
      return { embeds: [ui.warn('No Streaks', `No attendance streaks recorded for **${guild.name}**.`)] };

    const medals = ['🥇','🥈','🥉'];
    const lines  = entries.slice(0, 25).map((e, i) =>
      `${medals[i] || `\`${String(i+1).padStart(2,'0')}\``} <@${e.userId}> — **${e.streak}** day${e.streak===1?'':'s'} \`(${e.lastDay})\``
    );

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.amber)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle(`🔥 Streaks — ${serverLabel(guild)}`)
        .setDescription([ icyDivider(ICY.amber), lines.join('\n'), icyDivider(ICY.amber) ].join('\n'))
        .setFooter({ text: `✦ ${entries.length} tracked members` })
        .setTimestamp()
      ]
    };
  }
});

// ─── ATTENDANCE ────────────────────────────────────────────────────
registry.define({
  name: 'attendance',
  group: 'info',
  usage: '@bot attendance <#N/serverid>',
  desc: 'View attendance records for a server',
  args: [{ name: 'server', type: 'server', required: true }],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const guild   = resolved.guild;
    const users   = getServerConfig(guild.id).attendance?.users || {};
    const today   = new Date().toISOString().slice(0, 10);
    const entries = Object.entries(users);

    if (!entries.length)
      return { embeds: [ui.warn('No Attendance', `No attendance recorded for **${guild.name}**.`)] };

    const todayCount = entries.filter(([, d]) => String(d).startsWith(today)).length;
    const lines = entries
      .sort((a, b) => String(b[1]).localeCompare(String(a[1])))
      .slice(0, 30)
      .map(([userId, day], i) => `\`${String(i+1).padStart(2,'0')}\` <@${userId}> → \`${day}\``);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.mint)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle(`📋 Attendance — ${serverLabel(guild)}`)
        .setDescription([ icyDivider(ICY.mint), lines.join('\n'), icyDivider(ICY.mint) ].join('\n'))
        .setFooter({ text: `✦ ${entries.length} total • ${todayCount} marked today` })
        .setTimestamp()
      ]
    };
  }
});

// ─── FIND ─────────────────────────────────────────────────────────
registry.define({
  name: 'find',
  aliases: ['lookup', 'whois'],
  group: 'info',
  usage: '@bot find <user id>',
  desc: 'Find which servers a user shares with the bot',
  args: [{ name: 'user', type: 'user', required: true }],
  async run({ ctx, args }) {
    let user;
    try { user = await ctx.client.users.fetch(args.user, { force: true }); }
    catch { return { embeds: [ui.error('User Not Found', `Could not fetch \`${args.user}\`.`)] }; }

    const shared = [];
    for (const guild of ctx.client.guilds.cache.values()) {
      let member = guild.members.cache.get(user.id);
      if (!member) member = await guild.members.fetch(user.id).catch(() => null);
      if (member) shared.push({ guild, member });
    }

    const embed = new EmbedBuilder()
      .setColor(ICY.frost)
      .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
      .setTitle(`🔍 ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setDescription([
        icyDivider(),
        ui.codeTable({ ID: user.id, Bot: user.bot ? 'yes' : 'no', Created: user.createdAt.toISOString().slice(0,10) }),
        '',
        shared.length
          ? shared.slice(0,20).map(({ guild, member }) =>
              `\`#${getConfigNumber(guild.id)}\` **${guild.name}**\n> └ joined \`${member.joinedAt?.toISOString().slice(0,10)||'?'}\` • ${member.roles.cache.size-1} roles`
            ).join('\n')
          : '> No shared servers found.',
        '',
        icyDivider(),
      ].join('\n'))
      .setFooter({ text: `✦ ${shared.length} shared server${shared.length!==1?'s':''}  •  ID: ${user.id}` })
      .setTimestamp();

    return { embeds: [embed] };
  }
});

module.exports = {};
