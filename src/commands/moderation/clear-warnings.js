/**
 * /clear-warnings — Clear a user's warnings
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, warn: 0xffaa00, error: 0xff3d71 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('clear-warnings')
    .setDescription('Clear all warnings from a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const config = getServerConfig(interaction.guild.id);
    const warnings = config.warnings?.[user.id] || [];

    if (!warnings.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Warnings').setDescription(`${user} has no warnings to clear.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const count = warnings.length;
    config.warnings = config.warnings || {};
    delete config.warnings[user.id];
    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Warnings Cleared')
        .setDescription([
          `**User:** ${user} (\`${user.id}\`)`,
          `**Cleared:** \`${count}\` warning(s)`,
          `**By:** ${interaction.user}`,
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Moderation' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
