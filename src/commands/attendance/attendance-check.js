/**
 * /attendance-check — Check a user's attendance record
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');
const { updateStreak, getAllStreaks } = require('../../utils/streakSystem');

const ICY = { frost: 0x00d4ff, glacier: 0x0096c7, mint: 0x00f5d4, amber: 0xffd60a, error: 0xff3d71, warn: 0xffaa00 };

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

    // Count total days marked
    const totalDays = Object.values(users).filter(v => {
      const day = typeof v === 'string' ? v.slice(0,10) : String(v).slice(0,10);
      return day.match(/^\d{4}-\d{2}-\d{2}$/);
    }).length;

    const embed = new EmbedBuilder()
      .setColor(isToday ? ICY.mint : ICY.frost)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle(`${isToday ? '✅' : '⏳'} Attendance Check — ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .setDescription([
        '```',
        `  ╭─ Attendance Record`,
        `  │  User     : ${user.tag}`,
        `  │  ID       : ${user.id}`,
        `  │  Today    : ${isToday ? '✅ Marked' : '❌ Not marked'}`,
        `  │  Record   : ${record || '_none_'}`,
        `  ╰────────────────────────`,
        '```',
        '',
        `\`\`\``,
        `  🔥 Current Streak : ${streak} day${streak!==1?'s':''}`,
        `  🏆 Best Streak    : ${bestStreak} day${bestStreak!==1?'s':''}`,
        `  📅 Total Marked   : ${totalDays} day${totalDays!==1?'s':''}`,
        `\`\`\``,
      ].join('\n'))
      .setFooter({ text: '✦ Icy Companion — Attendance' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
