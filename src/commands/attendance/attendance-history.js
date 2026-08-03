/**
 * /attendance-history — View a user's attendance history
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');
const { getAllStreaks } = require('../../utils/streakSystem');

const ICY = { frost: 0x00d4ff, glacier: 0x0096c7, mint: 0x00f5d4, amber: 0xffd60a };

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
    const since = daysAgo(days);

    // Build 30-day grid
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

    // Show grid as blocks of 7 days (weeks)
    const weeks = [];
    for (let i = 0; i < grid.length; i += 7) {
      weeks.push(grid.slice(i, i + 7));
    }

    const gridLines = weeks.map((week, wi) => {
      const markers = week.map(d => {
        if (d.marked) return d.isToday ? '🟢' : '🟦';
        return d.isToday ? '⚪' : '⬛';
      }).join('');
      const startDate = week[0].key.slice(5);
      const endDate = week[week.length - 1].key.slice(5);
      return `  Week ${wi+1} \`${startDate}–${endDate}\` ${markers}`;
    });

    const embed = new EmbedBuilder()
      .setColor(ICY.frost)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle(`📅 Attendance History — ${target.tag}`)
      .setThumbnail(target.displayAvatarURL({ size: 128 }))
      .setDescription([
        '```',
        `  ╭─ ${target.tag}'s Attendance (${days} days)`,
        `  │  Marked    : ${totalMarked}/${days}`,
        `  │  Rate      : ${rate}%`,
        `  │  Streak    : ${streak?.streak || 0} days`,
        `  ╰────────────────────────`,
        '```',
        '',
        '```',
        '  Legend: 🟦=marked  🟢=today+marked  ⬛=missed  ⚪=today',
        '```',
        '',
        '```',
        gridLines.join('\n'),
        '```',
      ].join('\n'))
      .setFooter({ text: `✦ ${days}-day history • ${interaction.guild.name}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
