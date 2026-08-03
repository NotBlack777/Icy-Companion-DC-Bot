/**
 * Warnings DM commands for Super Owner:
 *   warn, warnings, clear-warnings
 */

const { EmbedBuilder } = require('discord.js');
const registry = require('../registry');
const ui        = require('../ui');
const { resolveServer, serverLabel } = require('../../utils/serverResolver');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');

const { ICY } = ui;

function icyDivider() { return `\`\`\`\n${'═'.repeat(44)}\n\`\`\``; }

/* ─── WARN ─────────────────────────────────────────────────────── */
registry.define({
  name: 'warn',
  group: 'moderation',
  usage: '@bot warn <#N/serverid> <user id> <reason>',
  desc: 'Issue a warning to a user in a server',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true },
    { name: 'reason',  type: 'rest',   required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const userId = String(args.user);
    const reason = args.reason;

    const member = await resolved.guild.members.fetch(userId).catch(() => null);
    const user = member?.user || await ctx.client.users.fetch(userId).catch(() => null);
    if (!user) return { embeds: [ui.error('User Not Found', `Could not fetch \`${userId}\`.`)] };

    const config = getServerConfig(resolved.guildId);
    config.warnings = config.warnings || {};
    config.warnings[userId] = config.warnings[userId] || [];

    const warning = {
      id: Date.now(),
      reason,
      by: ctx.user.id,
      byTag: ctx.user.tag,
      at: new Date().toISOString(),
    };

    config.warnings[userId].push(warning);
    saveServerConfig(resolved.guildId, config);

    const count = config.warnings[userId].length;

    // Try to DM the user
    try {
      if (member) {
        await member.send({
          embeds: [new EmbedBuilder()
            .setColor(ICY.warn)
            .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
            .setTitle('⚠️ You have been warned')
            .setDescription([
              `**Server:** ${resolved.guild.name}`,
              `**Reason:** ${reason}`,
              `**Warnings:** ${count}`,
              '',
              'If you believe this was a mistake, please contact staff.',
            ].join('\n'))
            .setFooter({ text: '✦ Icy Companion' })
            .setTimestamp()
          ]
        }).catch(() => {});
      }
    } catch {}

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.warn)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('⚠️ Warning Issued')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**User:** ${user.tag} (\`${userId}\`)`,
            `**Reason:** ${reason}`,
            `**Total Warnings:** \`${count}\``,
          ]),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ]
    };
  }
});

/* ─── WARNINGS LIST ─────────────────────────────────────────────── */
registry.define({
  name: 'warnings',
  group: 'moderation',
  usage: '@bot warnings <#N/serverid> <user id>',
  desc: 'View a user\'s warning history',
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const userId = String(args.user);
    const config = getServerConfig(resolved.guildId);
    const warnings = config.warnings?.[userId] || [];

    if (!warnings.length)
      return { embeds: [ui.success('No Warnings', `${userId} has no warnings.`)] };

    const lines = warnings.map((w, i) =>
      `**#${i+1}** — ${w.reason}\n> By ${w.byTag} • <t:${Math.floor(new Date(w.at).getTime()/1000)}:R>`
    );

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.warn)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle(`⚠️ Warnings — ${userId} (${warnings.length})`)
        .setDescription([
          icyDivider(),
          lines.join('\n\n'),
          icyDivider(),
        ].join('\n'))
        .setFooter({ text: `✦ ${warnings.length} warning(s) in ${resolved.guild.name}` })
        .setTimestamp()
      ]
    };
  }
});

/* ─── CLEAR WARNINGS ────────────────────────────────────────────── */
registry.define({
  name: 'clear-warnings',
  aliases: ['clearwarnings'],
  group: 'moderation',
  usage: '@bot clear-warnings <#N/serverid> <user id>',
  desc: 'Clear all warnings from a user',
  secure: true,
  args: [
    { name: 'server', type: 'server', required: true },
    { name: 'user',   type: 'user',   required: true }
  ],
  async run({ ctx, args }) {
    const resolved = resolveServer(ctx.client, args.server);
    if (!resolved.ok) return { embeds: [ui.error('Server Not Found', resolved.error)] };

    const userId = String(args.user);
    const config = getServerConfig(resolved.guildId);
    const warnings = config.warnings?.[userId] || [];

    if (!warnings.length)
      return { embeds: [ui.warn('No Warnings', `${userId} has no warnings to clear.`)] };

    const count = warnings.length;
    config.warnings = config.warnings || {};
    delete config.warnings[userId];
    saveServerConfig(resolved.guildId, config);

    return {
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: ctx.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Warnings Cleared')
        .setDescription([
          icyDivider(),
          ui.bullet([
            `**Server:** ${serverLabel(resolved.guild)}`,
            `**User:** \`${userId}\``,
            `**Cleared:** \`${count}\` warning(s)`,
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
