/**
 * /warn — Issue a warning to a user
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');

const ICY = { frost: 0x00d4ff, warn: 0xffaa00, error: 0xff3d71, success: 0x00f5a0 };

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

    // ─── Warning auto-actions ───────────────────────────────────
    const warnActions = Array.isArray(config.warnActions) ? config.warnActions : [];
    const triggered = warnActions.filter(a => count >= a.threshold).sort((a, b) => b.threshold - a.threshold)[0];

    let autoAction = null;
    if (triggered && member) {
      try {
        switch (triggered.action) {
          case 'timeout': {
            const duration = new Date(Date.now() + (triggered.timeoutMs || 600000));
            await member.disableCommunicationUntil(duration, `[Auto-Action] ${count} warnings — ${reason}`);
            autoAction = `🔇 Timed out for ${Math.round((triggered.timeoutMs || 600000) / 60000)} min`;
            break;
          }
          case 'kick':
            await member.kick(`[Auto-Action] ${count} warnings — ${reason}`);
            autoAction = '👢 Kicked';
            break;
          case 'ban':
            await interaction.guild.bans.create(user.id, { reason: `[Auto-Action] ${count} warnings — ${reason}` });
            autoAction = '🔨 Banned';
            break;
          case 'clear':
            config.warnings[user.id] = [];
            saveServerConfig(interaction.guild.id, config);
            autoAction = '🗑️ Warnings cleared';
            break;
        }
      } catch {}
    }

    // Try to DM the user
    try {
      if (member) {
        await member.send({
          embeds: [new EmbedBuilder()
            .setColor(ICY.warn)
            .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
            .setTitle('⚠️ You have been warned')
            .setDescription([
              `**Server:** ${interaction.guild.name}`,
              `**Reason:** ${reason}`,
              `**Warnings:** ${count}`,
              '',
              'If you believe this was a mistake, please contact staff.',
            ].join('\n'))
            .setFooter({ text: '✦ Icy Companion' })
            .setTimestamp()
          ]
        }).catch(() => {});
      }
    } catch {}

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.warn)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('⚠️ Warning Issued')
        .setDescription([
          '```',
          `  ╭─ Warning #${count}`,
          `  │  User : ${user.tag}`,
          `  │  ID   : ${user.id}`,
          `  │  By   : ${interaction.user.tag}`,
          `  │  Reason: ${reason}`,
          autoAction ? `  │  ⚡ Auto: ${autoAction}` : '',
          `  ╰────────────────────────`,
          '```',
        ].join('\n'))
        .setFooter({ text: `✦ ${count} total warning(s) for ${user.tag}` })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
