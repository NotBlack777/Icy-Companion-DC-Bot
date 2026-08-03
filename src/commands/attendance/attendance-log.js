const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('attendance-log')
    .setDescription('View the latest attendance logs'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
    }

    const config = getServerConfig(interaction.guild.id);
    const logs = config.attendance?.users || {};

    const entries = Object.entries(logs)
      .slice(-10)
      .reverse()
      .map(([userId, markedAt], index) => `${index + 1}. <@${userId}> → ${markedAt}`);

    if (!entries.length) {
      return interaction.reply({
        content: '📋 No attendance logs found yet.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('📋 Latest Attendance Logs')
      .setDescription(entries.join('\n'))
      .setFooter({ text: `Showing ${entries.length} latest entr${entries.length === 1 ? 'y' : 'ies'}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
