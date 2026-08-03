/**
 * /staff-list — List all staff members with their attendance
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');
const { getAllStreaks } = require('../../utils/streakSystem');

const ICY = { frost: 0x00d4ff, glacier: 0x0096c7, mint: 0x00f5d4, amber: 0xffd60a, lava: 0xff4d6d };

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

module.exports = {
  category: 'staff',

  data: new SlashCommandBuilder()
    .setName('staff-list')
    .setDescription('List all staff members with their attendance status')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to check (default 7)').setRequired(false)),

  async execute(interaction) {
    const days = Math.min(Math.max(interaction.options.getInteger('days') || 7, 1), 30);
    const config = getServerConfig(interaction.guild.id);
    const today = dateKey();
    const since = (d => { const x = new Date(); x.setDate(x.getDate() - d); return dateKey(x); })(days);

    if (!config.staffRole) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ No Staff Role').setDescription('No staff role has been set. Run `/set-staff-role` first.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const role = interaction.guild.roles.cache.get(config.staffRole);
    if (!role) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Staff Role Missing').setDescription('The configured staff role no longer exists.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const members = [...role.members.values()];
    const users = config.attendance?.users || {};
    const streaks = getAllStreaks();

    if (!members.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('📋 No Staff Members').setDescription(`The ${role.name} role has no members.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const lines = members.map(m => {
      const record = users[m.id];
      const markedToday = typeof record === 'string' && record.startsWith(today);
      const streak = streaks[`${interaction.guild.id}-${m.id}`]?.streak || 0;
      const status = markedToday ? '✅' : '❌';
      return `${status} ${m.user.tag} — 🔥 \`${streak}\` streak`;
    });

    const unmarked = members.filter(m => !users[m.id] || !(typeof users[m.id] === 'string' && users[m.id].startsWith(today)));

    const embed = new EmbedBuilder()
      .setColor(ICY.frost)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle(`👥 Staff List (${role.name})`)
      .setDescription([
        '```',
        `  ${role.name} — ${members.length} members`,
        `  Checking last ${days} day(s) attendance`,
        '```',
        '',
        lines.join('\n') || '_No staff members._',
        '',
        unmarked.length
          ? `⚠️ **${unmarked.length}** not marked today: ${unmarked.map(m => m.user.tag).join(', ')}`
          : '',
      ].join('\n'))
      .setFooter({ text: `✦ ${unmarked.length} unmarked today • ${interaction.guild.name}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
