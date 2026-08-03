const { SlashCommandBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');
const { createEmbed, e } = require('../../utils/uiHelper');

module.exports = {
  category: 'moderation',
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const config = getServerConfig(interaction.guild.id);
    config.warnings = config.warnings || {};
    config.warnings[user.id] = config.warnings[user.id] || [];

    const warning = {
      id: Date.now(),
      reason,
      by: interaction.user.id,
      byTag: interaction.user.tag,
      at: new Date().toISOString(),
    };

    config.warnings[user.id].push(warning);
    saveServerConfig(interaction.guild.id, config);
    const count = config.warnings[user.id].length;

    const warnActions = Array.isArray(config.warnActions) ? config.warnActions : [];
    const triggered = warnActions.filter(a => count >= a.threshold).sort((a, b) => b.threshold - a.threshold)[0];

    let autoAction = null;
    if (triggered && member) {
      try {
        switch (triggered.action) {
          case 'timeout': {
            const duration = new Date(Date.now() + (triggered.timeoutMs || 600000));
            await member.disableCommunicationUntil(duration, `[Auto-Action] ${count} warnings — ${reason}`);
            autoAction = `Timed out for ${Math.round((triggered.timeoutMs || 600000) / 60000)} min`;
            break;
          }
          case 'kick':
            await member.kick(`[Auto-Action] ${count} warnings — ${reason}`);
            autoAction = 'Kicked from server';
            break;
          case 'ban':
            await interaction.guild.bans.create(user.id, { reason: `[Auto-Action] ${count} warnings — ${reason}` });
            autoAction = 'Banned from server';
            break;
          case 'clear':
            config.warnings[user.id] = [];
            saveServerConfig(interaction.guild.id, config);
            autoAction = 'Warnings cleared';
            break;
        }
      } catch {}
    }

    try {
      if (member) {
        const dmEmbed = createEmbed({
          color: 0xffaa00,
          author: { name: 'Icy Companion', iconURL: interaction.client.user.displayAvatarURL() },
          description: `### ${e('error')} Warning Received\n` +
                       `> **Server:** ${interaction.guild.name}\n` +
                       `> **Reason:** ${reason}\n` +
                       `> **Warning Count:** \`${count}\`\n\n` +
                       `*If you believe this was a mistake, please contact staff.*`,
          timestamp: true
        });
        await member.send({ embeds: [dmEmbed] }).catch(() => null);
      }
    } catch {}

    const embed = createEmbed({
      color: 0xffaa00,
      author: { name: 'Warning Issued', iconURL: user.displayAvatarURL() },
      description: `### ${e('error')} Punishment Details\n` +
                   `> **Target:** ${user.tag} (\`${user.id}\`)\n` +
                   `> **Reason:** ${reason}\n` +
                   `> **Moderator:** ${interaction.user.tag}\n` +
                   `> **Total Warnings:** \`${count}\`` +
                   (autoAction ? `\n> **Auto Action:** \`${autoAction}\`` : ''),
      footer: { text: `Case #${warning.id}` },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed] });
  }
};
