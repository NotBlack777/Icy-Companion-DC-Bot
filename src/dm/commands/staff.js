/**
 * Staff DM commands for Super Owner:
 *   staff-add, staff-remove, staff-list
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
  usage: '@bot staff-add <#N/serverid> <user id>',
  desc: 'Add a user to the staff role in a server',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    if (!config.staffRole)
      return { embeds: [ui.warn('No Staff Role', 'This server has not set a staff role with `/set-staff-role` yet.')] };

    const role = resolved.guild.roles.cache.get(config.staffRole);
    if (!role)
      return { embeds: [ui.error('Staff Role Missing', 'The configured staff role no longer exists.')] };

    const userId = String(args.user);
    const member = await resolved.guild.members.fetch(userId).catch(() => null);
    if (!member)
      return { embeds: [ui.error('Not in Server', `\`${userId}\` is not a member of **${resolved.guild.name}**.`)] };

    if (member.roles.cache.has(config.staffRole))
      return { embeds: [ui.warn('Already Staff', `${member.user.tag} already has the **${role.name}** role.`)] };

    await member.roles.add(role, '[Super Owner DM] Staff add');

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
            `**Role:** ${role.name}`,
          ]),
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
  usage: '@bot staff-remove <#N/serverid> <user id>',
  desc: 'Remove a user from the staff role',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const config = getServerConfig(resolved.guildId);
    if (!config.staffRole)
      return { embeds: [ui.warn('No Staff Role', 'No staff role configured.')] };

    const role = resolved.guild.roles.cache.get(config.staffRole);
    const userId = String(args.user);
    const member = await resolved.guild.members.fetch(userId).catch(() => null);

    if (!member || !member.roles.cache.has(config.staffRole))
      return { embeds: [ui.warn('Not Staff', `${member?.user?.tag || userId} does not have the ${role?.name || 'staff'} role.`)] };

    await member.roles.remove(role, '[Super Owner DM] Staff remove');

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
            `**Role:** ${role.name}`,
          ]),
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
    if (!config.staffRole)
      return { embeds: [ui.warn('No Staff Role', 'This server has no staff role set.')] };

    const role = resolved.guild.roles.cache.get(config.staffRole);
    if (!role)
      return { embeds: [ui.error('Staff Role Missing', 'The staff role no longer exists in this server.')] };

    const members = [...role.members.values()];
    const users = getServerConfig(resolved.guildId).attendance?.users || {};
    const streaks = getAllStreaks();
    const today = dateKey();
    const prefix = `${resolved.guildId}-`;

    if (!members.length)
      return { embeds: [ui.info('No Staff', `The ${role.name} role has no members.`)] };

    const lines = members.map(m => {
      const record = users[m.id];
      const marked = typeof record === 'string' && record.startsWith(today);
      const streak = streaks[`${prefix}${m.id}`]?.streak || 0;
      return `${marked ? '✅' : '❌'} ${m.user.tag} — 🔥 \`${streak}\` streak`;
    });

    const unmarked = members.filter(m => !users[m.id] || !(typeof users[m.id] === 'string' && users[m.id].startsWith(today))).length;

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.frost)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle(`👥 Staff List — ${serverLabel(resolved.guild)}`)
        .setDescription([
          icyDivider(),
          `**Role:** ${role.name} — **${members.length}** members`,
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

module.exports = {};
