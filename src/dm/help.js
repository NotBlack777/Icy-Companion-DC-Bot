/**
 * The @bot help / /dm-help Super Owner command panel.
 * Fully redesigned with icy futuristic aesthetic.
 */

const { EmbedBuilder } = require('discord.js');
const registry = require('./registry');
const loadDmCommands = require('./loadCommands');
const ui = require('./ui');
const store = require('../utils/globalStore');

// ─── Visible groups for a user ───────────────────────────────────
function visibleGroups(userId) {
  loadDmCommands();
  return registry.GROUPS
    .map(group => ({
      ...group,
      commands: registry.byGroup(group.id).filter(cmd => store.hasTier(userId, cmd.tier))
    }))
    .filter(group => group.commands.length);
}

// ─── Group emoji map ───────────────────────────────────────────────
const GROUP_COLORS = {
  info:      0x00d4ff,   // frost
  delete:    0xff4d6d,   // lava red
  broadcast: 0x00f5a0,   // mint
  management:0x9b5de5,   // violet
  reports:   0xffd60a,   // amber
  dmlogger:  0x7df9ff,   // neon
  privacy:   0x00c8ff,   // brand blue
  security:  0xff3d71,   // neon red
  moderation:0xf72585,   // pink
};

const LOCKED_BADGE  = '🔒';
const UNLOCKED_BADGE = '🔓';

function buildDmHelp(ctx) {
  const userId    = ctx.user.id;
  const groups    = visibleGroups(userId);
  const totalCmds = groups.reduce((sum, g) => sum + g.commands.length, 0);

  const tier = store.isSuperOwner(userId)
    ? 'SUPER OWNER'
    : store.isGlobalOwner(userId)
      ? 'GLOBAL OWNER'
      : 'JUNIOR OWNER';

  const locked = store.isLocked() && !store.isSessionUnlocked(userId);
  const badge  = locked ? LOCKED_BADGE : UNLOCKED_BADGE;

  // Title block
  const titleBlock = [
    '```',
    '  ╔═══════════════════════════════════════════════╗',
    `  ║       ❄  ${tier.padEnd(19)} ${badge}  ║`,
    '  ║       Icy Companion — Command Panel           ║',
    '  ╚═══════════════════════════════════════════════╝',
    '```',
  ].join('\n');

  // Lock warning
  const lockLine = locked
    ? '\n> ⚠️ **Bot is LOCKED.** Run `@bot unlock <password>` to access secured commands.'
    : '';

  const descLines = [
    titleBlock,
    '',
    '> **🔹 Tip:** Use `#N` for config number (e.g. `#1`) or a full server ID.',
    '> **🔹 Tip:** Every command works as a slash command too.',
    lockLine,
  ];

  // Build fields per group
  const color = locked ? 0xff4d6d : 0x00d4ff;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: '✦  I C Y   C O M P A N I O N  •  DM PANEL',
      iconURL: ctx.client.user?.displayAvatarURL?.() || undefined,
    })
    .setTitle(`${badge}  ${tier} DM Commands`)
    .setDescription(descLines.join('\n'))
    .setFooter({ text: `✦ ${totalCmds} commands  •  Icy Companion` })
    .setTimestamp();

  if (ctx.client.user?.displayAvatarURL?.()) {
    embed.setThumbnail(ctx.client.user.displayAvatarURL());
  }

  for (const group of groups) {
    const gColor = GROUP_COLORS[group.id] || 0x00d4ff;

    const body = group.commands
      .map(cmd => {
        const lock  = cmd.secure && locked  ? ' 🔒' : '';
        const admin = cmd.tier === 'owner' ? ' ⭐' : (cmd.tier === 'super' ? ' 👑' : '');
        return `  ${cmd.usage}${admin}${lock}`;
      })
      .join('\n');

    embed.addFields({
      name:  `${group.emoji}  ${group.label}`,
      value: `\`\`\`\n${body}\n\`\`\``,
      inline: false,
    });
  }

  return { embeds: [embed] };
}

module.exports = { buildDmHelp, visibleGroups };
