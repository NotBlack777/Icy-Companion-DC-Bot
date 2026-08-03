/**
 * The `@bot help` / `/help` DM panel.
 *
 * Rendered straight from the registry so a new command shows up here
 * automatically, grouped exactly like the Super Owner panel.
 */

const { EmbedBuilder } = require('discord.js');
const registry = require('./registry');
const ui = require('./ui');
const store = require('../utils/globalStore');

/**
 * Only show a group if the viewer can run at least one command in it.
 */
function visibleGroups(userId) {
  return registry.GROUPS
    .map(group => ({
      ...group,
      commands: registry.byGroup(group.id).filter(cmd => store.hasTier(userId, cmd.tier))
    }))
    .filter(group => group.commands.length);
}

function buildDmHelp(ctx) {
  const userId = ctx.user.id;
  const groups = visibleGroups(userId);

  const tier = store.isSuperOwner(userId)
    ? 'Super Owner'
    : store.isGlobalOwner(userId)
      ? 'Global Owner'
      : 'Junior Owner';

  const locked = store.isLocked() && !store.isSessionUnlocked(userId);

  const embed = new EmbedBuilder()
    .setColor(ui.COLORS.brand)
    .setTitle(`${locked ? '🔒' : '🔓'} ${tier} DM Commands`)
    .setDescription([
      'Use `#N` for config number (e.g. `#1`) or a full server ID.',
      'Every command works as a slash command too — `/servers`, `/kick`, ...',
      locked ? '\n⚠️ **The bot is locked.** Run `@bot unlock <password>` to use secured commands.' : ''
    ].join('\n').trim())
    .setTimestamp();

  if (ctx.client.user?.displayAvatarURL) {
    embed.setThumbnail(ctx.client.user.displayAvatarURL());
  }

  for (const group of groups) {
    const body = group.commands
      .map(cmd => {
        const marker = cmd.secure && locked ? ' 🔒' : '';
        return `${cmd.usage}${marker}`;
      })
      .join('\n');

    embed.addFields({
      name: `${group.emoji} ${group.label}`,
      value: `\`\`\`\n${body}\n\`\`\``,
      inline: false
    });
  }

  embed.setFooter({
    text: `Accessible by ${tier} • ${groups.reduce((sum, g) => sum + g.commands.length, 0)} commands`
  });

  return { embeds: [embed] };
}

module.exports = { buildDmHelp, visibleGroups };
