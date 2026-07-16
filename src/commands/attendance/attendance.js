const { SlashCommandBuilder } = require('discord.js');
const {
  getServerConfig,
  saveServerConfig
} = require('../../utils/configManager');

const {
  updateStreak
} = require('../../utils/streakSystem');

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('attendance')
    .setDescription('Mark your attendance'),

  async execute(interaction) {

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const config = getServerConfig(guildId);

    if (!config.attendance) {
      config.attendance = {
        users: {}
      };
    }

    if (!config.attendance.users) {
      config.attendance.users = {};
    }

    const today = new Date().toDateString();

    const existing =
      config.attendance.users[userId];

    if (existing === today) {
      return interaction.reply({
        content: '⚠️ You have already marked attendance today.',
        ephemeral: true
      });
    }

    config.attendance.users[userId] = today;

    saveServerConfig(
      guildId,
      config
    );

    const streak = updateStreak(
      guildId,
      userId
    );

    return interaction.reply({
      content:
        `✅ Attendance marked successfully!\n🔥 Current streak: **${streak} day(s)**`
    });
  }
};