/**
 * /staff-info — Detailed info about a staff member
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');
const { getAllStreaks } = require('../../utils/streakSystem');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00, glacier: 0x0096c7 };

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

module.exports = {
  category: 'staff',

  data: new SlashCommandBuilder()
    .setName('staff-info')
    .setDescription('View detailed info about a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to check').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const config = getServerConfig(interaction.guild.id);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.error).setTitle('❌ Not in Server').setDescription(`${target} is not a member of this server.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Gather staff role info
    const staffRoles = Array.isArray(config.staffRoles) && config.staffRoles.length
      ? config.staffRoles
      : config.staffRole ? [config.staffRole] : [];

    const memberStaffRoles = staffRoles
      .map(id => interaction.guild.roles.cache.get(id))
      .filter(r => r && member.roles.cache.has(r.id));

    // Virtual staff info
    const virtualStaff = Array.isArray(config.virtualStaff) ? config.virtualStaff : [];
    const virtualEntry = virtualStaff.find(s => s.id === target.id);

    const isStaffMember = memberStaffRoles.length > 0 || !!virtualEntry;

    if (!isStaffMember) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(ICY.warn).setTitle('⚠️ Not Staff').setDescription(`${target} is not a staff member.`).setFooter({ text: '✦ Icy Companion' }).setTimestamp()],
        ephemeral: true
      });
    }

    // Attendance info
    const today = dateKey();
    const users = config.attendance?.users || {};
    const record = users[target.id];
    const markedToday = typeof record === 'string' && record.startsWith(today);
    const streaks = getAllStreaks();
    const streak = streaks[`${interaction.guild.id}-${target.id}`]?.streak || 0;

    // Warning info
    const warnings = config.warnings?.[target.id] || [];

    // Build description
    const lines = [
      `**User:** ${target} (\`${target.id}\`)`,
      `**Joined Server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
      `**Account Created:** <t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
      '',
      '**━━━ Staff Status ━━━**',
    ];

    if (memberStaffRoles.length) {
      lines.push(`**Roles:** ${memberStaffRoles.map(r => r.toString()).join(', ')}`);
    }
    if (virtualEntry) {
      lines.push(`**Virtual Staff:** ✅ (added <t:${Math.floor(new Date(virtualEntry.addedAt).getTime() / 1000)}:R>)`);
      if (virtualEntry.note) lines.push(`**Note:** _${virtualEntry.note}_`);
      lines.push(`**Added by:** <@${virtualEntry.addedBy}>`);
    }

    lines.push('');
    lines.push('**━━━ Attendance ━━━**');
    lines.push(`**Today:** ${markedToday ? '✅ Marked' : '❌ Not marked'}`);
    lines.push(`**Streak:** 🔥 \`${streak}\` day(s)`);

    if (warnings.length) {
      lines.push('');
      lines.push('**━━━ Warnings ━━━**');
      lines.push(`**Total:** \`${warnings.length}\` warning(s)`);
      const recent = warnings.slice(-3).reverse();
      for (const w of recent) {
        lines.push(`> ⚠️ \`${w.reason}\` — by ${w.byTag} (<t:${Math.floor(w.id / 1000)}:R>)`);
      }
      if (warnings.length > 3) lines.push(`> _...and ${warnings.length - 3} more_`);
    }

    const embed = new EmbedBuilder()
      .setColor(ICY.frost)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle(`📋 Staff Info — ${target.tag}`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setDescription(lines.join('\n'))
      .setFooter({ text: `✦ ${interaction.guild.name}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
