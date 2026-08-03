/**
 * /report-inactive — Find inactive staff
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');
const { getAllStreaks } = require('../../utils/streakSystem');

const ICY = { frost: 0x00d4ff, lava: 0xff4d6d, warn: 0xffaa00, amber: 0xffd60a };

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return dateKey(d);
}

module.exports = {
  category: 'reports',

  data: new SlashCommandBuilder()
    .setName('report-inactive')
    .setDescription('Find staff who haven\'t marked attendance in N days')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days of inactivity (default 7)').setRequired(false)),

  async execute(interaction) {
    const days = Math.min(Math.max(interaction.options.getInteger('days') || 7, 1), 90);
    const config = getServerConfig(interaction.guild.id);
    const users = config.attendance?.users || {};
    const streaks = getAllStreaks();
    const prefix = `${interaction.guild.id}-`;
    const since = daysAgo(days);
    const today = dateKey();

    if (!config.staffRole) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Staff Role').setDescription('No staff role configured.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const role = interaction.guild.roles.cache.get(config.staffRole);
    const members = role ? [...role.members.values()] : [];

    const inactive = members.filter(m => {
      const record = users[m.id];
      if (!record) return true;
      const day = typeof record === 'string' ? record.slice(0,10) : String(record).slice(0,10);
      return day < since;
    });

    const active = members.filter(m => !inactive.includes(m));

    const inactiveLines = inactive.slice(0, 25).map(m => {
      const record = users[m.id] || 'never';
      const streak = streaks[`${prefix}${m.id}`]?.streak || 0;
      return `> ❌ ${m.user.tag}\n  └ last: \`${record}\` • streak: ${streak} day(s)`;
    });

    const embed = new EmbedBuilder()
      .setColor(inactive.length ? ICY.lava : ICY.frost)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle(`😴 Inactive Report — ${days} day(s)`)
      .setDescription([
        '```',
        `  📋 Total Staff  : ${members.length}`,
        `  ✅ Active       : ${active.length}`,
        `  😴 Inactive     : ${inactive.length}`,
        `  📅 Cutoff       : ${since}`,
        '```',
        '',
        inactiveLines.length
          ? `**😴 Inactive Staff (${inactive.length})**\n${inactiveLines.join('\n')}`
          : `✅ **All staff marked attendance within ${days} day(s)!**`,
        '',
      ].join('\n'))
      .setFooter({ text: `✦ ${role?.name || 'Staff'} role • ${interaction.guild.name}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
