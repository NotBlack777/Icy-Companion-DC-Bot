const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { guard } = require('../../utils/guildAuth');
const { getAllStreaks } = require('../../utils/streakSystem');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('top-staff')
    .setDescription('View the attendance streak leaderboard')
    .addIntegerOption(option =>
      option
        .setName('limit')
        .setDescription('How many members to show (1-25, default 10)')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'any');
    if (!ok) return;

    const limit = interaction.options.getInteger('limit') ?? 10;
    const guildId = interaction.guild.id;
    const prefix = `${guildId}-`;

    const streaks = getAllStreaks();
    const attendance = config.attendance?.users || {};

    // Merge streak data with anyone who has attendance but no streak yet.
    const byUser = new Map();

    for (const [key, value] of Object.entries(streaks)) {
      if (!key.startsWith(prefix)) continue;

      byUser.set(key.slice(prefix.length), {
        streak: Number(value?.streak) || 0,
        lastDay: value?.lastDay || null
      });
    }

    // The attendance record is the source of truth for "last marked".
    // A streak's lastDay can be set manually by an admin, so it must not
    // override the real attendance date.
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
      return interaction.reply({
        content: '📋 No attendance has been recorded in this server yet.',
        ephemeral: true
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    const lines = ranked.map((entry, index) => {
      const rank = MEDALS[index] || `\`${String(index + 1).padStart(2, '0')}\``;
      const markedToday = entry.lastDay === today ? ' ✅' : '';

      return `${rank} <@${entry.userId}> — **${entry.streak}** day${entry.streak === 1 ? '' : 's'}${markedToday}\n> └ last marked \`${entry.lastDay || 'never'}\``;
    });

    const markedTodayCount = [...byUser.values()].filter(e => e.lastDay === today).length;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🏆 Top Staff — Attendance Streaks')
      .setDescription(lines.join('\n\n'))
      .setFooter({
        text: `${byUser.size} tracked • ${markedTodayCount} marked today • ✅ = marked today`
      })
      .setTimestamp();

    const icon = interaction.guild.iconURL({ size: 256 });
    if (icon) embed.setThumbnail(icon);

    return interaction.reply({ embeds: [embed] });
  }
};
