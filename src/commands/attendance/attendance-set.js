/**
 * /attendance-set — Manually set a user's attendance (owner/staff only)
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');
const { updateStreak } = require('../../utils/streakSystem');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00, glacier: 0x0096c7 };

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseDate(dateStr) {
  if (!dateStr) return dateKey();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  return isNaN(d) ? null : dateKey(d);
}

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('attendance-set')
    .setDescription('Manually set a user\'s attendance (owner/staff only)')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt => opt.setName('date').setDescription('Date (YYYY-MM-DD, defaults to today)').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const dateStr = interaction.options.getString('date');

    const config = getServerConfig(interaction.guild.id);
    config.attendance = config.attendance || { users: {} };
    config.attendance.users = config.attendance.users || {};

    const date = parseDate(dateStr);
    if (dateStr && !date) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Invalid Date').setDescription('Use format `YYYY-MM-DD` e.g. `2024-01-15`').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const previous = config.attendance.users[target.id] || '_none_';
    config.attendance.users[target.id] = date;
    saveServerConfig(interaction.guild.id, config);
    const streak = updateStreak(interaction.guild.id, target.id);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ Attendance Set')
        .setDescription([
          '```',
          `  ╭─ Manual Attendance Set`,
          `  │  User     : ${target.tag}`,
          `  │  ID       : ${target.id}`,
          `  │  Date     : ${date}`,
          `  │  Previous : ${previous}`,
          `  │  Streak   : ${streak} day(s)`,
          `  ╰────────────────────────`,
          '```',
          '',
          `Marked by ${interaction.user}.`,
        ].join('\n'))
        .setFooter({ text: '✦ Icy Companion — Attendance' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
