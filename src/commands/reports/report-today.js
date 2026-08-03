/**
 * /report-today — Today's attendance report
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');
const { getAllStreaks } = require('../../utils/streakSystem');

const ICY = { frost: 0x00d4ff, glacier: 0x0096c7, mint: 0x00f5d4, amber: 0xffd60a, lava: 0xff4d6d, success: 0x00f5a0 };

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

module.exports = {
  category: 'reports',

  data: new SlashCommandBuilder()
    .setName('report-today')
    .setDescription('Today\'s attendance report for this server'),

  async execute(interaction) {
    const config = getServerConfig(interaction.guild.id);
    const users = config.attendance?.users || {};
    const streaks = getAllStreaks();
    const today = dateKey();
    const prefix = `${interaction.guild.id}-`;

    const entries = Object.entries(users);
    const marked = entries.filter(([, v]) => typeof v === 'string' && v.startsWith(today));
    const unmarked = entries.filter(([, v]) => typeof v !== 'string' || !v.startsWith(today));

    const markedLines = marked.slice(0, 20).map(([id]) => `> ✅ <@${id}>`);
    const unmarkedLines = unmarked.slice(0, 20).map(([id]) => `> ❌ <@${id}>`);

    const topStreaks = [...entries]
      .map(([id, v]) => ({ id, streak: Number(streaks[`${prefix}${id}`]?.streak) || 0 }))
      .filter(e => e.streak > 0)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 5);

    const rate = entries.length ? Math.round((marked.length / entries.length) * 100) : 0;
    const bar = '█'.repeat(Math.round(rate/5)).padEnd(20, '░');

    const embed = new EmbedBuilder()
      .setColor(ICY.frost)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle(`📊 Today\'s Report — ${interaction.guild.name}`)
      .setDescription([
        '```',
        `  📅 ${today}`,
        `  📈 Rate  : ${bar} ${rate}%`,
        `  ✅ Marked: ${marked.length} / ${entries.length}`,
        `  ❌ Missing: ${unmarked.length}`,
        '```',
        '',
        markedLines.length ? `**✅ Marked (${marked.length})**\n${markedLines.join('\n')}` : '',
        unmarkedLines.length ? `\n**❌ Not Marked (${unmarked.length})**\n${unmarkedLines.join('\n')}` : '',
        topStreaks.length ? `\n**🔥 Top Streaks**\n${topStreaks.map((e,i) => `${['🥇','🥈','🥉'][i]||`·`} <@${e.id}> — **${e.streak}** days`).join('\n')}` : '',
      ].filter(Boolean).join('\n'))
      .setFooter({ text: `✦ ${entries.length} tracked • ${interaction.guild.name}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
