const { SlashCommandBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');
const { getAllStreaks } = require('../../utils/streakSystem');
const { createEmbed, e } = require('../../utils/uiHelper');

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function daysAgo(days) {
  const d = new Date(); d.setDate(d.getDate() - days);
  return dateKey(d);
}

module.exports = {
  category: 'attendance',
  data: new SlashCommandBuilder()
    .setName('attendance-history')
    .setDescription('View a user\'s attendance history over the last N days')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days to look back (default 30)').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const days = Math.min(Math.max(interaction.options.getInteger('days') || 30, 1), 90);

    const config = getServerConfig(interaction.guild.id);
    const record = config.attendance?.users?.[target.id];
    const streaks = getAllStreaks();
    const streak = streaks[`${interaction.guild.id}-${target.id}`];

    const today = dateKey();
    const grid = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const marked = typeof record === 'string' && record.startsWith(key);
      const isToday = key === today;
      grid.push({ key, marked, isToday });
    }

    const totalMarked = grid.filter(g => g.marked).length;
    const rate = Math.round((totalMarked / days) * 100);

    const weeks = [];
    for (let i = 0; i < grid.length; i += 7) {
      weeks.push(grid.slice(i, i + 7));
    }

    const gridLines = weeks.map((week, wi) => {
      const markers = week.map(d => {
        if (d.marked) return d.isToday ? '🟢' : '🟦';
        return d.isToday ? '⚪' : '⬛';
      }).join('');
      return `Week ${wi+1}: ${markers}`;
    });

    const embed = createEmbed({
      author: { name: `History: ${target.tag}`, iconURL: target.displayAvatarURL() },
      description: `### ${e('file')} Attendance Analytics\n` +
                   `> **Period:** Last \`${days}\` days\n` +
                   `> **Total Marked:** \`${totalMarked}\` days\n` +
                   `> **Attendance Rate:** \`${rate}%\`\n` +
                   `> **Current Streak:** \`${streak?.streak || 0} days\`\n\n` +
                   `**Visual Activity:**\n` +
                   `\`\`\`\n${gridLines.join('\n')}\n\`\`\`\n` +
                   `> 🟦 Marked | ⬛ Missed | 🟢 Today`,
      thumbnail: target.displayAvatarURL({ size: 256 }),
      footer: { text: `Tracking since ${daysAgo(days)}` },
      timestamp: true
    });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
