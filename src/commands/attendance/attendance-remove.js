/**
 * /attendance-remove — Remove a user's attendance record
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('attendance-remove')
    .setDescription('Remove a user\'s attendance record (owner/staff only)')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const config = getServerConfig(interaction.guild.id);

    if (!config.attendance?.users?.[target.id]) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Record').setDescription(`${target} has no attendance record to remove.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const previous = config.attendance.users[target.id];
    delete config.attendance.users[target.id];
    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('🗑️ Attendance Removed')
        .setDescription([
          `**User:** ${target} (\`${target.id}\`)`,
          `**Removed:** \`${previous}\``,
          '',
          `Removed by ${interaction.user}. Streak reset.`,
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Attendance' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
