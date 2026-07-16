const os = require('os');

const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('View bot information'),

  async execute(interaction) {
    const client = interaction.client;

    const totalMem =
      (os.totalmem() / 1024 / 1024 / 1024)
        .toFixed(2);

    const usedMem =
      (
        (os.totalmem() - os.freemem()) /
        1024 /
        1024 /
        1024
      ).toFixed(2);

    const processMem =
      (
        process.memoryUsage().heapUsed /
        1024 /
        1024
      ).toFixed(2);

    const uptime =
      formatUptime(client.uptime);

    const guilds =
      client.guilds.cache.size;

    const users =
      client.guilds.cache.reduce(
        (acc, guild) =>
          acc + guild.memberCount,
        0
      );

    const channels =
      client.channels.cache.size;

    const shard =
      client.shard
        ? client.shard.ids[0]
        : 0;

    const embed = new EmbedBuilder()
      .setColor(0x7DD3FC)
      .setAuthor({
        name: client.user.tag,
        iconURL:
          client.user.displayAvatarURL(),
      })
      .setThumbnail(
        client.user.displayAvatarURL({
          dynamic: true,
          size: 4096,
        })
      )
      .addFields(
        {
          name: '🤖 Bot',
          value:
            `Servers: \`${guilds}\`\n` +
            `Users: \`${users}\`\n` +
            `Channels: \`${channels}\``,
          inline: true,
        },
        {
          name: '📡 Latency',
          value:`WebSocket: \`${client.ws.ping}ms\``,
          inline: true,
        },
        {
          name: '🧠 Memory',
          value:
            `Process: \`${processMem} MB\`\n` +
            `System: \`${usedMem}/${totalMem} GB\``,
          inline: true,
        },
        {
          name: '⏱️ Uptime',
          value: uptime,
          inline: true,
        },
        {
          name: '🧩 Shard',
          value: `\`${shard}\``,
          inline: true,
        },
        {
          name: '⚙️ Node.js',
          value: `\`${process.version}\``,
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