const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  category: 'utility',

  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction, clientArg) {

    const client = clientArg || interaction.client;

    await interaction.reply({
      content: '⏳ Measuring...'
    });

    const sent = await interaction.fetchReply();

    const apiPing =
      sent.createdTimestamp -
      interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setColor(0x7DD3FC)
      .setTitle('🏓 Pong!')
      .addFields(
        {
          name: '📡 WebSocket',
          value: `\`${client.ws.ping}ms\``,
          inline: true
        },
        {
          name: '🔄 API',
          value: `\`${apiPing}ms\``,
          inline: true
        }
      )
      .setTimestamp();

    await interaction.editReply({
      content: null,
      embeds: [embed]
    });
  }
};