const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('View bot uptime'),

  async execute(interaction) {
    const client = interaction.client;

    const now = Date.now();

    const started =
      now - client.uptime;

    const relative =
      `<t:${Math.floor(
        started / 1000
      )}:R>`;

    const full =
      `<t:${Math.floor(
        started / 1000
      )}:F>`;

    const uptime =
      formatUptime(client.uptime);

    const embed = new EmbedBuilder()
      .setColor(0x7DD3FC)
      .setTitle('⏱️ Bot Uptime')
      .addFields(
        {
          name: '🟢 Online Since',
          value:
            `${full}\n(${relative})`,
          inline: false,
        },
        {
          name: '⌛ Total Uptime',
          value: `\`${uptime}\``,
          inline: false,
        },
        {
          name: '📡 Ping',
          value:
            `\`${client.ws.ping}ms\``,
          inline: true,
        },
      )
      .setFooter({
        text:
          `Requested by ${interaction.user.tag}`,
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });
  },
};

function formatUptime(ms) {
  const seconds =
    Math.floor(ms / 1000) % 60;

  const minutes =
    Math.floor(ms / (1000 * 60)) % 60;

  const hours =
    Math.floor(ms / (1000 * 60 * 60)) % 24;

  const days =
    Math.floor(ms / (1000 * 60 * 60 * 24));

  return (
    `${days}d ` +
    `${hours}h ` +
    `${minutes}m ` +
    `${seconds}s`
  );
}