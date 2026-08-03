/**
 * /leaderboard — Attendance streak leaderboard
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');
const { getAllStreaks } = require('../../utils/streakSystem');

const ICY = { frost: 0x00d4ff, amber: 0xffd60a, mint: 0x00f5d4 };

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

module.exports = {
  category: 'reports',

  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Attendance streak leaderboard')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of users to show (default 10)').setRequired(false)),

  async execute(interaction) {
    const limit = Math.min(Math.max(interaction.options.getInteger('limit') || 10, 1), 50);
    const config = getServerConfig(interaction.guild.id);
    const users = config.attendance?.users || {};
    const streaks = getAllStreaks();
    const prefix = `${interaction.guild.id}-`;
    const today = dateKey();

    const entries = Object.entries(users).map(([id, day]) => {
      const streak = Number(streaks[`${prefix}${id}`]?.streak) || 0;
      const lastDay = typeof day === 'string' ? day.slice(0,10) : String(day).slice(0,10);
      const markedToday = lastDay === today;
      return { id, streak, lastDay, markedToday };
    }).sort((a, b) => b.streak - a.streak);

    if (!entries.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.frost).setTitle('📊 Leaderboard').setDescription('No attendance records yet.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const lines = entries.slice(0, limit).map((e, i) => {
      const status = e.markedToday ? '🟢' : '⚪';
      return `${medals[i] || `\`${String(i+1).padStart(2,'0')}\``} ${status} **${e.streak}** days — <@${e.id}>\n  └ \`${e.lastDay}\``;
    });

    const embed = new EmbedBuilder()
      .setColor(ICY.amber)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle(`🏆 Attendance Leaderboard — ${interaction.guild.name}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `✦ ${entries.length} tracked • 🟢 marked today` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
