const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e } = require('../../utils/uiHelper');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('View bot uptime'),

  async execute(interaction, clientArg) {
    const client = clientArg || interaction.client;
    const now = Date.now();
    const started = now - client.uptime;
    const relative = `<t:${Math.floor(started / 1000)}:R>`;
    const full = `<t:${Math.floor(started / 1000)}:F>`;
    const uptime = formatUptime(client.uptime);

    const embed = createEmbed({
      description: `### ${e('settings')} System Uptime\n` +
                   `> **Online Since:** ${full} (${relative})\n` +
                   `> **Active Duration:** \`${uptime}\`\n` +
                   `> **Heartbeat:** \`${client.ws.ping}ms\``,
      footer: { text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() },
      timestamp: true
    });

    await interaction.reply({
      embeds: [embed]
    });
  }
};

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
