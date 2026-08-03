const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { guard } = require('../../utils/guildAuth');

/**
 * Render a list of IDs as mentions, flagging entries that no longer exist.
 */
function renderList(ids, mention, exists) {
  if (!ids.length) return '_None_';

  return ids
    .slice(0, 20)
    .map(id => (exists(id) ? `> ${mention(id)}` : `> \`${id}\` _(deleted)_`))
    .join('\n') + (ids.length > 20 ? `\n> ...and ${ids.length - 20} more` : '');
}

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('ignore-list')
    .setDescription('View everything the bot is currently ignoring'),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'staff');
    if (!ok) return;

    const guild = interaction.guild;

    const roles = Array.isArray(config.ignoreRoles) ? config.ignoreRoles : [];
    const users = Array.isArray(config.ignoreUsers) ? config.ignoreUsers : [];
    const channels = Array.isArray(config.ignoreChannels) ? config.ignoreChannels : [];

    const total = roles.length + users.length + channels.length;

    const embed = new EmbedBuilder()
      .setColor(total ? 0xfee75c : 0x57f287)
      .setTitle('🚫 Ignore List')
      .setDescription(
        total
          ? `The bot is ignoring **${total}** entr${total === 1 ? 'y' : 'ies'} in this server.`
          : 'Nothing is being ignored in this server.'
      )
      .addFields(
        {
          name: `🎭 Roles (${roles.length})`,
          value: renderList(roles, id => `<@&${id}>`, id => guild.roles.cache.has(id)),
          inline: false
        },
        {
          name: `👤 Users (${users.length})`,
          value: renderList(users, id => `<@${id}>`, () => true),
          inline: false
        },
        {
          name: `💬 Channels (${channels.length})`,
          value: renderList(channels, id => `<#${id}>`, id => guild.channels.cache.has(id)),
          inline: false
        }
      )
      .setFooter({ text: 'Use /ignore-role, /ignore-user or /ignore-channel to toggle entries' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
