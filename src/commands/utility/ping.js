const {
  SlashCommandBuilder
} = require('discord.js');
const { createEmbed, e } = require('../../utils/uiHelper');

module.exports = {
  category: 'utility',

  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction, clientArg) {
    const client = clientArg || interaction.client;

    await interaction.reply({
      content: `${e('loading')} Measuring...`,
      ephemeral: true
    });

    const sent = await interaction.fetchReply();
    const apiPing = sent.createdTimestamp - interaction.createdTimestamp;

    const embed = createEmbed({
      description: `### ${e('rocket')} Connectivity Status\n` +
                   `> **WebSocket:** \`${client.ws.ping}ms\`\n` +
                   `> **API Latency:** \`${apiPing}ms\``,
      footer: { text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() },
      timestamp: true
    });

    await interaction.editReply({
      content: null,
      embeds: [embed]
    });
  }
};
