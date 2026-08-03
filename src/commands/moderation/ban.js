const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e, errorEmbed } = require('../../utils/uiHelper');

module.exports = {
  category: 'moderation',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days of messages to delete (0-7)').setRequired(false).setMinValue(0).setMaxValue(7)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') ?? 1;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member && !member.bannable) {
      return interaction.reply({
        embeds: [errorEmbed(`Cannot ban **${user.tag}** — they may have a higher role or the bot lacks permissions.`)],
        ephemeral: true
      });
    }

    if (member) {
      const dmEmbed = createEmbed({
        color: 0xff4d6d,
        author: { name: 'Icy Companion', iconURL: interaction.client.user.displayAvatarURL() },
        description: `### ${e('error')} Ban Notification\n` +
                     `> **Server:** ${interaction.guild.name}\n` +
                     `> **Reason:** ${reason}\n\n` +
                     `*If you believe this was a mistake, contact the server staff.*`,
        timestamp: true
      });
      await member.send({ embeds: [dmEmbed] }).catch(() => null);
    }

    try {
      await interaction.guild.bans.create(user.id, {
        deleteMessageSeconds: days * 86400,
        reason: `[Ban] ${reason} — By ${interaction.user.tag}`
      });
    } catch (err) {
      return interaction.reply({
        embeds: [errorEmbed(`Ban failed: \`${err.message}\``)],
        ephemeral: true
      });
    }

    const embed = createEmbed({
      color: 0xff4d6d,
      author: { name: 'User Banned', iconURL: user.displayAvatarURL() },
      description: `### ${e('error')} Execution Details\n` +
                   `> **Target:** ${user.tag} (\`${user.id}\`)\n` +
                   `> **Reason:** ${reason}\n` +
                   `> **Moderator:** ${interaction.user.tag}\n` +
                   `> **History Cleared:** \`${days} day(s)\``,
      footer: { text: 'Moderation Action Log' },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed] });
  }
};
