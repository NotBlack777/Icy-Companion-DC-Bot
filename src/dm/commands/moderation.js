/**
 * Moderation commands for DM/mention use by Super Owner:
 *   role-info, role-give, role-remove
 *   timeout-give, timeout-remove, mute, vc-move
 *
 * These mirror the server slash commands so the Super Owner can
 * run them from anywhere via @bot mention.
 */

const { EmbedBuilder } = require('discord.js');
const registry = require('../registry');
const ui        = require('../ui');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');
const { getDisplayRolePosition, formatRolePosition, roleHexColor } = require('../../utils/rolePosition');
const { ICY } = ui;

function icyDivider() { return `\`\`\`\n${'═'.repeat(44)}\n\`\`\``; }

/* ─── ROLE INFO ─────────────────────────────────────────────────── */
registry.define({
  name: 'role-info',
  aliases: ['roleinfo'],
  group: 'moderation',
  usage: '@bot role-info <#N/serverid> <role id>',
  desc: 'View detailed info about a role in a server',
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'role',   type: 'role',   required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const roleId = String(args.role);
    const role   = resolved.guild.roles.cache.get(roleId);

    if (!role) {
      return { embeds: [ui.error('Role Not Found', `\`${roleId}\` is not a role in **${resolved.guild.name}**.`)] };
    }

    const perms = role.permissions.toArray();
    const notablePermissions = [
      'Administrator',
      'ManageGuild',
      'ManageRoles',
      'ManageChannels',
      'ManageMessages',
      'KickMembers',
      'BanMembers',
      'ModerateMembers',
      'MentionEveryone'
    ];
    const highlight = notablePermissions.filter(permission => perms.includes(permission));
    const hierarchy = getDisplayRolePosition(resolved.guild, role);
    const roleIcon = role.iconURL?.({ size: 256 }) || null;

    const embed = ui.panel(`Role Status: ${role.name}`, [
      `${ui.GLOW_LINE}`,
      ui.bullet([
        `**Server:** ${serverLabel(resolved.guild)}`,
        `**Role:** <@&${role.id}> (\`${role.id}\`)`,
        `**Hierarchy Position:** \`${formatRolePosition(hierarchy)}\``,
        '**Top means #1** — higher roles are counted from the top of the server list.',
        `**Color:** \`${roleHexColor(role)}\``,
        `**Members:** \`${role.members.size}\``,
        `**Created:** <t:${Math.floor(role.createdAt.getTime()/1000)}:D>`
      ])
    ], {
      color: role.color || ICY.violet,
      thumbnail: roleIcon || resolved.guild.iconURL?.({ size: 512 }) || undefined,
      footer: `${resolved.guild.name} • Sunset Ice Role Matrix`
    });

    embed.addFields(
      {
        name: '◈ Hierarchy',
        value: [
          `**Position:** \`${hierarchy.position || '?'}\``,
          `**Total roles:** \`${hierarchy.total}\``,
          `**Above:** ${hierarchy.above ? `<@&${hierarchy.above.id}>` : '`None`'}`,
          `**Below:** ${hierarchy.below ? `<@&${hierarchy.below.id}>` : '`None`'}`
        ].join('\n'),
        inline: true
      },
      {
        name: '◈ Toggles',
        value: [
          `**Hoisted:** ${role.hoist ? '`Yes`' : '`No`'}`,
          `**Mentionable:** ${role.mentionable ? '`Yes`' : '`No`'}`,
          `**Managed:** ${role.managed ? '`Yes`' : '`No`'}`,
          `**Unicode Icon:** ${role.unicodeEmoji || '`None`'}`
        ].join('\n'),
        inline: true
      },
      {
        name: highlight.length ? '◈ Notable Permissions' : '◈ Permissions',
        value: highlight.length
          ? highlight.map(permission => `\`${permission.replace(/([a-z])([A-Z])/g, '$1 $2')}\``).join(' ')
          : (perms.length ? perms.slice(0, 12).join(', ') + (perms.length > 12 ? ` +${perms.length - 12} more` : '') : '`None`'),
        inline: false
      }
    );

    return { embeds: [embed] };
  }
});

/* ─── ROLE GIVE ─────────────────────────────────────────────────── */
registry.define({
  name: 'role-give',
  aliases: ['rolegive', 'addrole', 'roleadd'],
  group: 'moderation',
  usage: '@bot role-give <#N/serverid> <user id> <role id>',
  desc: 'Give a role to a user in a server',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true },
    { name: 'role',   type: 'role',   required: true },
    { name: 'reason', type: 'rest',   required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const userId = String(args.user);
    const roleId = String(args.role);

    const member = await resolved.guild.members.fetch(userId).catch(() => null);
    if (!member) return { embeds: [ui.error('Member Not Found', `\`${userId}\` is not in **${resolved.guild.name}**.`)] };

    const role = resolved.guild.roles.cache.get(roleId);
    if (!role)  return { embeds: [ui.error('Role Not Found', `\`${roleId}\` is not a role in **${resolved.guild.name}**.`)] };

    if (member.roles.cache.has(role.id))
      return { embeds: [ui.warn('Already Has Role', `${member.user.tag} already has the **${role.name}** role.`)] };

    const reason = args.reason || 'No reason provided';

    try {
      await member.roles.add(role, `[Super Owner DM] ${reason}`);
    } catch (err) {
      return { embeds: [ui.error('Failed to Add Role', `Could not give **${role.name}** to ${member.user.tag}.\n> \`${err.message}\``)] };
    }

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Role Added')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**User:** ${member.user.tag} (\`${member.user.id}\`)`,
            `**Role:** ${role.name} (\`${role.id}\`)`,
            `**Reason:** ${reason}`,
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── ROLE REMOVE ───────────────────────────────────────────────── */
registry.define({
  name: 'role-remove',
  aliases: ['roleremove', 'removerole', 'rolerem'],
  group: 'moderation',
  usage: '@bot role-remove <#N/serverid> <user id> <role id>',
  desc: 'Remove a role from a user in a server',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true },
    { name: 'role',   type: 'role',   required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const userId = String(args.user);
    const roleId = String(args.role);

    const member = await resolved.guild.members.fetch(userId).catch(() => null);
    if (!member) return { embeds: [ui.error('Member Not Found', `\`${userId}\` is not in **${resolved.guild.name}**.`)] };

    const role = resolved.guild.roles.cache.get(roleId);
    if (!role)  return { embeds: [ui.error('Role Not Found', `\`${roleId}\` is not a role in **${resolved.guild.name}**.`)] };

    if (!member.roles.cache.has(role.id))
      return { embeds: [ui.warn('No Role', `${member.user.tag} does not have the **${role.name}** role.`)] };

    try {
      await member.roles.remove(role, '[Super Owner DM]');
    } catch (err) {
      return { embeds: [ui.error('Failed to Remove Role', `Could not remove **${role.name}** from ${member.user.tag}.\n> \`${err.message}\``)] };
    }

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Role Removed')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**User:** ${member.user.tag} (\`${member.user.id}\`)`,
            `**Role:** ${role.name} (\`${role.id}\`)`,
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── TIMEOUT GIVE ───────────────────────────────────────────────── */
registry.define({
  name: 'timeout-give',
  aliases: ['timeout', 'timeout-give', 'mute-user'],
  group: 'moderation',
  usage: '@bot timeout-give <#N/serverid> <user id> <minutes> [reason]',
  desc: 'Apply a timeout to a user in a server',
  secure: true,
  args: [
    { name: 'server',  type: 'server', required: true },
    { name: 'user',    type: 'user',   required: true },
    { name: 'minutes', type: 'int',    required: true },
    { name: 'reason',  type: 'rest',  required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const userId   = String(args.user);
    const minutes  = Number(args.minutes);
    const reason   = args.reason || 'No reason provided';

    if (minutes < 1 || minutes > 40320)
      return { embeds: [ui.error('Invalid Duration', 'Timeout must be between **1** and **40320** minutes (28 days).')] };

    const member = await resolved.guild.members.fetch(userId).catch(() => null);
    if (!member) return { embeds: [ui.error('Member Not Found', `\`${userId}\` is not in **${resolved.guild.name}**.`)] };

    if (!member.manageable)
      return { embeds: [ui.error('Cannot Timeout', `The bot cannot timeout **${member.user.tag}** — they may have a higher role.`)] };

    const duration = new Date(Date.now() + minutes * 60 * 1000);

    try {
      await member.disableCommunicationUntil(duration, `[Super Owner DM] ${reason}`);
    } catch (err) {
      return { embeds: [ui.error('Timeout Failed', `Could not timeout **${member.user.tag}**.\n> \`${err.message}\``)] };
    }

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '⏱️ Timeout Applied', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('⏱️ User Timed Out')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**User:** ${member.user.tag} (\`${member.user.id}\`)`,
            `**Duration:** \`${minutes}\` minute${minutes!==1?'s':''}`,
            `**Until:** <t:${Math.floor(duration.getTime()/1000)}:F>`,
            `**Reason:** ${reason}`,
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── TIMEOUT REMOVE ────────────────────────────────────────────── */
registry.define({
  name: 'timeout-remove',
  aliases: ['untimeout', 'unmute'],
  group: 'moderation',
  usage: '@bot timeout-remove <#N/serverid> <user id>',
  desc: 'Remove a timeout from a user',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const userId = String(args.user);
    const member = await resolved.guild.members.fetch(userId).catch(() => null);
    if (!member) return { embeds: [ui.error('Member Not Found', `\`${userId}\` is not in **${resolved.guild.name}**.`)] };

    if (!member.isCommunicationDisabled())
      return { embeds: [ui.warn('No Active Timeout', `${member.user.tag} does not have an active timeout.`)] };

    try {
      await member.disableCommunicationUntil(null, '[Super Owner DM] Timeout removed');
    } catch (err) {
      return { embeds: [ui.error('Failed', `Could not remove timeout from **${member.user.tag}**.\n> \`${err.message}\``)] };
    }

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Timeout Removed')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**User:** ${member.user.tag} (\`${member.user.id}\`)`,
            '',
            '⏱️ The user can send messages again.',
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── MUTE ───────────────────────────────────────────────────────── */
registry.define({
  name: 'mute',
  group: 'moderation',
  usage: '@bot mute <#N/serverid> <user id> [minutes] [reason]',
  desc: 'Server-mute a user (optionally with timeout)',
  secure: true,
  args: [
    { name: 'server',  type: 'server', required: true },
    { name: 'user',    type: 'user',   required: true },
    { name: 'minutes', type: 'int',    required: false },
    { name: 'reason',  type: 'rest',  required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const userId   = String(args.user);
    const minutes  = args.minutes ? Number(args.minutes) : null;
    const reason   = args.reason || 'No reason provided';

    const member = await resolved.guild.members.fetch(userId).catch(() => null);
    if (!member) return { embeds: [ui.error('Member Not Found', `\`${userId}\` is not in **${resolved.guild.name}**.`)] };

    try {
      await member.voice.setMute(true, `[Super Owner DM] ${reason}`);
    } catch (err) {
      return { embeds: [ui.error('Mute Failed', `Could not mute **${member.user.tag}**.\n> \`${err.message}\``)] };
    }

    if (minutes) {
      const duration = new Date(Date.now() + minutes * 60 * 1000);
      try { await member.disableCommunicationUntil(duration, `[Super Owner DM] ${reason}`); } catch { /* non-fatal */ }
    }

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '🔇 User Muted', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🔇 User Muted')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**User:** ${member.user.tag} (\`${member.user.id}\`)`,
            minutes ? `**Duration:** \`${minutes}\` minute${minutes!==1?'s':''}` : '**Duration:** indefinite',
            `**Reason:** ${reason}`,
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── VC MOVE ────────────────────────────────────────────────────── */
registry.define({
  name: 'vc-move',
  aliases: ['vcmove', 'move-vc', 'voicemove'],
  group: 'moderation',
  usage: '@bot vc-move <#N/serverid> <user id> <channel id>',
  desc: 'Move a user between voice channels',
  secure: true,
  args: [
    { name: 'server',  type: 'server', required: true },
    { name: 'user',    type: 'user',   required: true },
    { name: 'channel', type: 'channel', required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const userId    = String(args.user);
    const channelId = String(args.channel);

    const member = await resolved.guild.members.fetch(userId).catch(() => null);
    if (!member) return { embeds: [ui.error('Member Not Found', `\`${userId}\` is not in **${resolved.guild.name}**.`)] };

    if (!member.voice?.channel)
      return { embeds: [ui.warn('Not in Voice', `${member.user.tag} is not connected to any voice channel.`)] };

    const channel = resolved.guild.channels.cache.get(channelId);
    if (!channel || !channel.isVoiceBased())
      return { embeds: [ui.error('Invalid Voice Channel', `\`${channelId}\` is not a voice channel in **${resolved.guild.name}**.`)] };

    const fromChannel = member.voice.channel;

    try {
      await member.voice.setChannel(channel, '[Super Owner DM] VC Move');
    } catch (err) {
      return { embeds: [ui.error('Move Failed', `Could not move **${member.user.tag}**.\n> \`${err.message}\``)] };
    }

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '🔊 Voice Channel Move', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🔊 User Moved')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**User:** ${member.user.tag} (\`${member.user.id}\`)`,
            `**From:** ${fromChannel.name} (\`${fromChannel.id}\`)`,
            `**To:** ${channel.name} (\`${channel.id}\`)`,
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ]
    };
  }
});

module.exports = {};
