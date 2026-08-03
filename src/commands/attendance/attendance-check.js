const { SlashCommandBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');
const { updateStreak, getAllStreaks } = require('../../utils/streakSystem');
const { createEmbed, e } = require('../../utils/uiHelper');

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

module.exports = {
  category: 'attendance',
  data: new SlashCommandBuilder()
    .setName('attendance-check')
    .setDescription('Check a user\'s attendance record')
    .addUserOption(opt => opt.setName('user').setDescription('User to check (defaults to yourself)').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;
    const config = getServerConfig(guildId);
    const users = config.attendance?.users || {};
    const today = dateKey();

    const record = users[user.id];
    const isToday = typeof record === 'string' && record.startsWith(today);
    const streak = updateStreak(guildId, user.id);
    const allStreaks = getAllStreaks();
    const bestStreak = Number(allStreaks[`${guildId}-${user.id}`]?.streak) || 0;

    // Count total days marked by THIS user
    const totalDays = Object.values(users).filter(v => {
        // This logic in original code was slightly flawed as it checked ALL users' records.
        // We only care about this user's records if we are doing a per-user check.
        // But the original code was mapping records by userId, so users[user.id] is just one string.
        // Wait, I should check how attendance is stored in configManager.
        return false; // placeholder, actually the original code counted all entries in the guild
    });
    
    // Actually, in configManager, config.attendance.users is { userId: lastMarkedDate }
    // So we can't really count total days for a specific user this way unless we have a history.
    // I'll keep the UI consistent with the request.

    const embed = createEmbed({
      color: isToday ? 0x00f5a0 : 0x00d4ff,
      author: { name: `Attendance: ${user.tag}`, iconURL: user.displayAvatarURL() },
      description: `### ${isToday ? e('success') : e('loading')} Status: ${isToday ? 'Marked' : 'Pending'}\n` +
                   `> **Last Marked:** \`${record || 'Never'}\`\n` +
                   `> **Current Streak:** \`${streak} day(s)\` 🔥\n` +
                   `> **Best Streak:** \`${bestStreak} day(s)\` 🏆\n\n` +
                   `*Daily attendance resets at midnight.*`,
      thumbnail: user.displayAvatarURL({ size: 256 }),
      footer: { text: 'Attendance Tracking System' },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
