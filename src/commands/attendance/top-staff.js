const { SlashCommandBuilder } = require('discord.js');
const { guard } = require('../../utils/guildAuth');
const { getAllStreaks } = require('../../utils/streakSystem');
const { createEmbed, e } = require('../../utils/uiHelper');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  category: 'attendance',
  data: new SlashCommandBuilder()
    .setName('top-staff')
    .setDescription('View the attendance streak leaderboard')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('How many members to show (1-25, default 10)')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'any');
    if (!ok) return;

    const limit = interaction.options.getInteger('limit') ?? 10;
    const guildId = interaction.guild.id;
    const prefix = `${guildId}-`;

    const streaks = getAllStreaks();
    const attendance = config.attendance?.users || {};
    const byUser = new Map();

    for (const [key, value] of Object.entries(streaks)) {
      if (!key.startsWith(prefix)) continue;
      byUser.set(key.slice(prefix.length), {
        streak: Number(value?.streak) || 0,
        lastDay: value?.lastDay || null
      });
    }

    for (const [userId, day] of Object.entries(attendance)) {
      const existing = byUser.get(userId);
      byUser.set(userId, {
        streak: existing?.streak ?? 0,
        lastDay: String(day).slice(0, 10)
      });
    }

    const ranked = [...byUser.entries()]
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.streak - a.streak || String(b.lastDay).localeCompare(String(a.lastDay)))
      .slice(0, limit);

    if (!ranked.length) {
      return interaction.reply({ content: '📋 No attendance has been recorded in this server yet.', ephemeral: true });
    }

    const today = new Date().toISOString().slice(0, 10);
    const lines = ranked.map((entry, index) => {
      const rank = MEDALS[index] || `**${index + 1}.**`;
      const markedToday = entry.lastDay === today ? ` ${e('success')}` : '';
      return `${rank} <@${entry.userId}> - \`${entry.streak}d\`${markedToday}`;
    });

    const markedTodayCount = [...byUser.values()].filter(e => e.lastDay === today).length;

    const embed = createEmbed({
      color: 0xffd60a,
      author: { name: 'Staff Leaderboard', iconURL: interaction.guild.iconURL() || undefined },
      description: `### 🏆 Top Attendance Streaks\n\n${lines.join('\n')}\n\n` +
                   `> **Stats:** ${byUser.size} total tracked • ${markedTodayCount} marked today`,
      thumbnail: interaction.guild.iconURL({ size: 1024 }),
      footer: { text: `✅ = marked today` },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed] });
  }
};
