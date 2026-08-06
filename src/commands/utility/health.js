const os = require('os');
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, COLORS } = require('../../utils/uiHelper');
const { getTheme } = require('../../utils/themeManager');
const store = require('../../utils/globalStore');
const { listAudit } = require('../../utils/auditLog');

function uptime(ms) {
  const s = Math.floor((ms || 0) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('health')
    .setDescription('View bot health, runtime and configuration status'),

  async execute(interaction, clientArg) {
    const client = clientArg || interaction.client;
    const mem = process.memoryUsage();
    const dmLogger = store.getDmLogger();
    const theme = getTheme();
    const auditCount = listAudit(100).length;

    return interaction.reply({
      embeds: [createEmbed({
        title: 'System Health',
        description: [
          `**Uptime:** \`${uptime(client.uptime)}\``,
          `**WS Ping:** \`${client.ws.ping}ms\``,
          `**Heap:** \`${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB\``,
          `**RSS:** \`${(mem.rss / 1024 / 1024).toFixed(2)} MB\``,
          `**Guilds:** \`${client.guilds.cache.size}\``,
          `**Channels:** \`${client.channels.cache.size}\``,
          `**Theme:** \`${theme.label}\``,
          `**DM Logger:** \`${dmLogger.enabled ? 'on' : 'off'} / ${dmLogger.mode} / ${dmLogger.accessMode}\``,
          `**Recent audit entries:** \`${auditCount}\``,
          `**OS:** \`${os.platform()} ${os.arch()}\``
        ].join('\n'),
        color: COLORS.sky,
        compact: true
      })],
      ephemeral: true
    });
  }
};
