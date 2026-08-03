const os = require('os');
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e } = require('../../utils/uiHelper');

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

    const embed = createEmbed({
      author: { name: client.user.tag, iconURL: client.user.displayAvatarURL() },
      description: `### ${e('rocket')} Bot Information\n` +
                   `> **Servers:** \`${guilds}\`\n` +
                   `> **Users:** \`${users}\`\n` +
                   `> **Channels:** \`${channels}\`\n\n` +
                   `**Technical Details:**\n` +
                   `> ${e('settings')} **Latency:** \`${client.ws.ping}ms\`\n` +
                   `> ${e('file')} **Memory:** \`${processMem} MB\` (System: ${usedMem}/${totalMem} GB)\n` +
                   `> ${e('loading')} **Uptime:** \`${uptime}\`\n` +
                   `> ${e('commands')} **Shard:** \`${shard}\`\n` +
                   `> ${e('success')} **Node.js:** \`${process.version}\``,
      thumbnail: client.user.displayAvatarURL({ size: 1024 }),
      footer: { text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() },
      timestamp: true
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
