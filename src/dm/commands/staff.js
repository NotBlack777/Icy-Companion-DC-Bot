/**
 * Staff DM commands for Super Owner:
 *   staff-add, staff-remove, staff-list, staff-add-user, staff-remove-user
 *
 * Mirrors the server slash commands for @bot mention use.
 */

const { EmbedBuilder } = require('discord.js');
const registry = require('../registry');
const ui        = require('../ui');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');
const { getAllStreaks } = require('../../utils/streakSystem');

const { ICY } = ui;

function icyDivider() { return `\`\`\`\n${'═'.repeat(44)}\n\`\`\``; }
function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ─── STAFF ADD ──────────────────────────────────────────────────── */
registry.define({
  name: 'staff-add',
  aliases: ['addstaff', 'staffadd'],
  group: 'staff',
  usage: '@bot staff-add <#N/serverid> <user id> [role id]',
  desc: 'Add a user to staff role(s) in a server',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true },
    { name: 'roleId', type: 'string', required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    const staffRoles = Array.isArray(config.staffRoles) && config.staffRoles.length
      ? config.staffRoles
      : config.staffRole ? [config.staffRole] : [];

    if (!staffRoles.length)
      return { embeds: [ui.warn('No Staff Roles', 'This server has not set any staff roles with `/set-staff-role` yet.')] };

    const userId = String(args.user);
    const member = await resolved.guild.members.fetch(userId).catch(() => null);
    if (!member)
      return { embeds: [ui.error('Not in Server', `\`${userId}\` is not a member of **${resolved.guild.name}**.`)] };

    // If specific role provided, only add that one
    let rolesToAdd = staffRoles;
    if (args.roleId) {
      if (!staffRoles.includes(args.roleId))
        return { embeds: [ui.error('Not a Staff Role', `Role \`${args.roleId}\` is not a configured staff role.`)] };
      rolesToAdd = [args.roleId];
    }

    const added = [];
    const alreadyHad = [];

    for (const roleId of rolesToAdd) {
      const role = resolved.guild.roles.cache.get(roleId);
      if (!role) continue;

      if (member.roles.cache.has(roleId)) {
        alreadyHad.push(role.name);
      } else {
        await member.roles.add(role, '[Super Owner DM] Staff add');
        added.push(role.name);
      }
    }

    if (!added.length && alreadyHad.length)
      return { embeds: [ui.warn('Already Staff', `${member.user.tag} already has all staff role(s): ${alreadyHad.join(', ')}`)] };

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Staff Added')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**User:** ${member.user.tag} (\`${member.user.id}\`)`,
            added.length ? `**Added to:** ${added.join(', ')}` : null,
            alreadyHad.length ? `**Already had:** ${alreadyHad.join(', ')}` : null,
          ].filter(Boolean)),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Staff' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── STAFF REMOVE ──────────────────────────────────────────────── */
registry.define({
  name: 'staff-remove',
  aliases: ['removestaff', 'staffremove'],
  group: 'staff',
  usage: '@bot staff-remove <#N/serverid> <user id> [role id]',
  desc: 'Remove a user from staff role(s)',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true },
    { name: 'roleId', type: 'string', required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    const staffRoles = Array.isArray(config.staffRoles) && config.staffRoles.length
      ? config.staffRoles
      : config.staffRole ? [config.staffRole] : [];

    if (!staffRoles.length)
      return { embeds: [ui.warn('No Staff Roles', 'No staff roles configured.')] };

    const userId = String(args.user);
    const member = await resolved.guild.members.fetch(userId).catch(() => null);
    if (!member)
      return { embeds: [ui.error('Not in Server', `\`${userId}\` is not a member of this server.`)] };

    let rolesToRemove = staffRoles;
    if (args.roleId) {
      if (!staffRoles.includes(args.roleId))
        return { embeds: [ui.error('Not a Staff Role', `Role \`${args.roleId}\` is not a configured staff role.`)] };
      rolesToRemove = [args.roleId];
    }

    const removed = [];
    const didNotHave = [];

    for (const roleId of rolesToRemove) {
      const role = resolved.guild.roles.cache.get(roleId);
      if (!role) continue;

      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(role, '[Super Owner DM] Staff remove');
        removed.push(role.name);
      } else {
        didNotHave.push(role.name);
      }
    }

    if (!removed.length)
      return { embeds: [ui.warn('Not Staff', `${member.user.tag} does not have any of the specified staff roles.`)] };

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Staff Removed')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**User:** ${member.user.tag} (\`${member.user.id}\`)`,
            removed.length ? `**Removed from:** ${removed.join(', ')}` : null,
            didNotHave.length ? `**Didn't have:** ${didNotHave.join(', ')}` : null,
          ].filter(Boolean)),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Staff' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── STAFF LIST ───────────────────────────────────────────────── */
registry.define({
  name: 'staff-list',
  aliases: ['stafflist'],
  group: 'staff',
  usage: '@bot staff-list <#N/serverid> [days]',
  desc: 'List staff members with attendance status',
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'days',   type: 'int',   required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    const staffRoles = Array.isArray(config.staffRoles) && config.staffRoles.length
      ? config.staffRoles
      : config.staffRole ? [config.staffRole] : [];

    if (!staffRoles.length)
      return { embeds: [ui.warn('No Staff Roles', 'This server has no staff roles set.')] };

    // Collect all members across all staff roles (deduplicated)
    const memberMap = new Map();
    const roleNames = [];

    for (const roleId of staffRoles) {
      const role = resolved.guild.roles.cache.get(roleId);
      if (!role) continue;
      roleNames.push(role.name);

      for (const [id, member] of role.members) {
        if (!memberMap.has(id)) {
          memberMap.set(id, { member, roles: [] });
        }
        memberMap.get(id).roles.push(role.name);
      }
    }

    const members = [...memberMap.values()];
    const users = getServerConfig(resolved.guildId).attendance?.users || {};
    const streaks = getAllStreaks();
    const today = dateKey();
    const prefix = `${resolved.guildId}-`;

    if (!members.length)
      return { embeds: [ui.info('No Staff', 'The staff role(s) have no members.')] };

    const lines = members.map(({ member: m }) => {
      const record = users[m.id];
      const marked = typeof record === 'string' && record.startsWith(today);
      const streak = streaks[`${prefix}${m.id}`]?.streak || 0;
      return `${marked ? '✅' : '❌'} ${m.user.tag} — 🔥 \`${streak}\` streak`;
    });

    const unmarked = members.filter(({ member: m }) => !users[m.id] || !(typeof users[m.id] === 'string' && users[m.id].startsWith(today))).length;

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.frost)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle(`👥 Staff List — ${serverLabel(resolved.guild)}`)
        .setDescription([
          icyDivider(),
          `**Roles:** ${roleNames.join(', ')} — **${members.length}** members`,
          lines.join('\n'),
          '',
          unmarked ? `⚠️ **${unmarked}** not marked today` : '✅ All staff marked today!',
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: `✦ ${unmarked} unmarked • ${resolved.guild.name}` })
        .setTimestamp()
      ]
    };
  }
});

/* ─── STAFF ADD USER (virtual staff) ──────────────────────────── */
registry.define({
  name: 'staff-add-user',
  aliases: ['addstaffuser', 'staffadduser'],
  group: 'staff',
  usage: '@bot staff-add-user <#N/serverid> <user id> [note]',
  desc: 'Add a user as virtual staff (bypasses role requirement)',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true },
    { name: 'note',   type: 'string', required: false }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    const userId = String(args.user);
    const note = args.note || null;

    const member = await resolved.guild.members.fetch(userId).catch(() => null);
    if (!member)
      return { embeds: [ui.error('Not in Server', `\`${userId}\` is not a member of **${resolved.guild.name}**.`)] };

    config.virtualStaff = Array.isArray(config.virtualStaff) ? config.virtualStaff : [];

    if (config.virtualStaff.some(s => s.id === userId))
      return { embeds: [ui.warn('Already Staff', `${member.user.tag} is already virtual staff.`)] };

    config.virtualStaff.push({
      id: userId,
      tag: member.user.tag,
      addedBy: ctx.user.id,
      addedByTag: ctx.user.tag,
      addedAt: new Date().toISOString(),
      note
    });

    saveServerConfig(resolved.guildId, config);

    const lines = [
      `**Server:** ${serverLabel(resolved.guild)}`,
      `**User:** ${member.user.tag} (\`${userId}\`)`,
    ];
    if (note) lines.push(`**Note:** ${note}`);
    lines.push(`**Total virtual staff:** \`${config.virtualStaff.length}\``);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ User Added to Virtual Staff')
        .setDescription([icyDivider(), ui.bullet(lines), icyDivider()].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Staff' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── STAFF REMOVE USER (virtual staff) ───────────────────────── */
registry.define({
  name: 'staff-remove-user',
  aliases: ['removestaffuser', 'staffremoveuser'],
  group: 'staff',
  usage: '@bot staff-remove-user <#N/serverid> <user id>',
  desc: 'Remove a user from virtual staff',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    const userId = String(args.user);

    config.virtualStaff = Array.isArray(config.virtualStaff) ? config.virtualStaff : [];
    const index = config.virtualStaff.findIndex(s => s.id === userId);

    if (index === -1)
      return { embeds: [ui.warn('Not Virtual Staff', `\`${userId}\` is not registered as virtual staff.`)] };

    const removed = config.virtualStaff.splice(index, 1)[0];
    saveServerConfig(resolved.guildId, config);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ User Removed from Virtual Staff')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**User:** ${removed.tag || userId}`,
            `**Remaining:** \`${config.virtualStaff.length}\``,
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Staff' })
        .setTimestamp()
      ]
    };
  }
});

module.exports = {};
