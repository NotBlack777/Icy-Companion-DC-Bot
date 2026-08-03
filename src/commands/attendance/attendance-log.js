const { SlashCommandBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');
const { createEmbed, e } = require('../../utils/uiHelper');

module.exports = {
  category: 'attendance',
  data: new SlashCommandBuilder()
    .setName('attendance-log')
    .setDescription('View the latest attendance logs'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
    }

    const config = getServerConfig(interaction.guild.id);
    const logs = config.attendance?.users || {};

    const entries = Object.entries(logs)
      .slice(-10)
      .reverse()
      .map(([userId, markedAt], index) => `**${index + 1}.** <@${userId}> \`${markedAt}\``);

    if (!entries.length) {
      return interaction.reply({ content: '📋 No attendance logs found yet.', ephemeral: true });
    }

    const embed = createEmbed({
      color: 0x00f5a0,
      author: { name: 'Attendance Activity', iconURL: interaction.guild.iconURL() || undefined },
      description: `### ${e('file')} Recent Logs\n\n${entries.join('\n')}`,
      footer: { text: `Showing ${entries.length} latest logs` },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed] });
  }
};
