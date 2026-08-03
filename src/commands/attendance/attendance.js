const { SlashCommandBuilder } = require('discord.js');
const {
  getServerConfig,
  saveServerConfig
} = require('../../utils/configManager');
const { updateStreak } = require('../../utils/streakSystem');

function todayKey(date = new Date()) {
  const now = date;
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('attendance')
    .setDescription('Mark your attendance'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
    }

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const config = getServerConfig(guildId);

    config.attendance = config.attendance || { users: {} };
    config.attendance.users = config.attendance.users || {};

    const today = todayKey();
    const existing = config.attendance.users[userId];
    const existingKey = typeof existing === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(existing)
      ? existing
      : (existing ? todayKey(new Date(existing)) : null);

    if (existingKey === today) {
      return interaction.reply({
        content: '⚠️ You have already marked attendance today.',
        ephemeral: true
      });
    }

    config.attendance.users[userId] = today;
    saveServerConfig(guildId, config);

    const streak = updateStreak(guildId, userId);

    return interaction.reply({
      content: `✅ Attendance marked successfully!\n🔥 Current streak: **${streak} day(s)**`
    });
  }
};
