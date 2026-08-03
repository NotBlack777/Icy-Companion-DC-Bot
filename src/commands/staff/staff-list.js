/**
 * /staff-list — List all staff members across all staff roles with attendance
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
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to check (default 7)').setRequired(false))
    .addRoleOption(opt => opt.setName('role').setDescription('Filter by specific staff role').setRequired(false)),

  async execute(interaction) {
    const days = Math.min(Math.max(interaction.options.getInteger('days') || 7, 1), 30);
    const filterRole = interaction.options.getRole('role');
    const config = getServerConfig(interaction.guild.id);
    const today = dateKey();

    const staffRoles = Array.isArray(config.staffRoles) && config.staffRoles.length
      ? config.staffRoles
      : config.staffRole ? [config.staffRole] : [];

    if (!staffRoles.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.amber).setTitle('⚠️ No Staff Roles').setDescription('No staff roles have been set. Run `/set-staff-role` first.').setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // If filter role is specified, only show that role
    const rolesToShow = filterRole
      ? (staffRoles.includes(filterRole.id) ? [filterRole.id] : [])
      : staffRoles;

    if (filterRole && !rolesToShow.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.lava).setTitle('❌ Not a Staff Role').setDescription(`${filterRole} is not configured as a staff role.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Collect all members across all staff roles (deduplicated)
    const memberMap = new Map();
    const roleNames = [];

    for (const roleId of rolesToShow) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) continue;
      roleNames.push(role.name);

      for (const [id, member] of role.members) {
        if (!memberMap.has(id)) {
          memberMap.set(id, { member, roles: [] });
        }
        memberMap.get(id).roles.push(role.name);
      }
    }

    const members = [...memberMap.values()];
    const users = config.attendance?.users || {};
    const streaks = getAllStreaks();

    if (!members.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.amber).setTitle('📋 No Staff Members').setDescription(`The staff role(s) have no members.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    const lines = members.map(({ member: m, roles }) => {
      const record = users[m.id];
      const markedToday = typeof record === 'string' && record.startsWith(today);
      const streak = streaks[`${interaction.guild.id}-${m.id}`]?.streak || 0;
      const status = markedToday ? '✅' : '❌';
      const roleTag = roles.length > 1 ? ` _(${roles.length} roles)_` : '';
      return `${status} ${m.user.tag}${roleTag} — 🔥 \`${streak}\` streak`;
    });

    const unmarked = members.filter(({ member: m }) => !users[m.id] || !(typeof users[m.id] === 'string' && users[m.id].startsWith(today)));

    const embed = new EmbedBuilder()
      .setColor(ICY.frost)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle(`👥 Staff List`)
      .setDescription([
        '```',
        `  Roles: ${roleNames.join(', ')}`,
        `  Total Staff: ${members.length}`,
        `  Checking last ${days} day(s) attendance`,
        '```',
        '',
        lines.join('\n') || '_No staff members._',
        '',
        unmarked.length
          ? `⚠️ **${unmarked.length}** not marked today: ${unmarked.map(({ member: m }) => m.user.tag).join(', ')}`
          : '✅ All staff marked today!',
      ].join('\n'))
      .setFooter({ text: `✦ ${unmarked.length} unmarked today • ${interaction.guild.name}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
