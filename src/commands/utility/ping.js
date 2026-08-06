const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e, COLORS } = require('../../utils/uiHelper');

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
      author: { name: `${client.user.username} • Connectivity`, iconURL: client.user.displayAvatarURL() },
      title: `${e('ping')} Connection Status`,
      description: [
        `${e('ping')} **WebSocket:** \`${client.ws.ping}ms\``,
        `${e('rocket')} **API:** \`${apiPing}ms\``,
        `${e('success')} **State:** Online`
      ].join('\n'),
      fields: [
        { name: 'WS', value: `\`${client.ws.ping}ms\``, inline: true },
        { name: 'API', value: `\`${apiPing}ms\``, inline: true }
      ],
      color: COLORS.sky,
      footer: { text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() },
      compact: true
    });

    await interaction.editReply({
      content: null,
      embeds: [embed]
    });
  }
};
