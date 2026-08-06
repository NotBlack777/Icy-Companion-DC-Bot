const os = require('os');
const { version: discordVersion, SlashCommandBuilder } = require('discord.js');
const { createEmbed, e, COLORS } = require('../../utils/uiHelper');

function optionalBanner() {
  return process.env.BOT_BANNER_URL || process.env.UI_BANNER_URL || process.env.EMBED_BANNER_URL || null;
}

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('View bot information'),

  async execute(interaction, clientArg) {
    const client = clientArg || interaction.client;
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMem = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2);
    const processMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const uptime = formatUptime(client.uptime);
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const channels = client.channels.cache.size;
    const shard = client.shard ? client.shard.ids[0] : 0;
    const avatar = client.user.displayAvatarURL({ size: 1024 });

    const embed = createEmbed({
      author: { name: `${client.user.username} • System Status`, iconURL: avatar },
      title: `${e('settings')} Bot Status: ${client.user.username}`,
      description: [
        `${e('uptime')} **Uptime:** \`${uptime}\``,
        `${e('ram')} **RAM:** \`${processMem} MB\``,
        `${e('library')} **Library:** \`discord.js v${discordVersion}\``,
        '',
        `${e('guilds')} **Guilds:** \`${guilds}\``,
        `${e('users')} **Users:** \`${users}\``,
        `${e('commands')} **Channels:** \`${channels}\``,
        `${e('os')} **OS:** \`${os.platform()} ${os.arch()}\``,
        `${e('shard')} **Shard:** \`${shard}\``,
        '',
        `**System:** \`${usedMem}/${totalMem} GB\` used`
      ].join('\n'),
      fields: [
        { name: 'Guilds', value: `\`${guilds}\``, inline: true },
        { name: 'Users', value: `\`${users}\``, inline: true },
        { name: 'Ping', value: `\`${client.ws.ping}ms\``, inline: true }
      ],
      thumbnail: avatar,
      image: optionalBanner(),
      color: COLORS.orange,
      footer: { text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() },
      timestamp: true,
      compact: true
    });

    await interaction.reply({ embeds: [embed] });
  }
};

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
