/**
 * /warnings — View a user's warnings
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');

const ICY = { frost: 0x00d4ff, warn: 0xffaa00, error: 0xff3d71, success: 0x00f5a0 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View a user\'s warning history')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const config = getServerConfig(interaction.guild.id);
    const warnings = config.warnings?.[user.id] || [];

    if (!warnings.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.success).setTitle('✅ No Warnings').setDescription(`${user} has no warnings.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const lines = warnings.map((w, i) =>
      `**#${i+1}** — ${w.reason}\n> By ${w.byTag} • <t:${Math.floor(new Date(w.at).getTime()/1000)}:R>`
    );

    const embed = new EmbedBuilder()
      .setColor(ICY.warn)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle(`⚠️ Warnings — ${user.tag} (${warnings.length})`)
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .setDescription([
        '```',
        `  ${user.tag}`,
        `  ${warnings.length} warning(s)`,
        '```',
        '',
        lines.join('\n\n'),
      ].join('\n'))
      .setFooter({ text: '✦ Icy Companion — Warnings' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
