/**
 * /role-info — View detailed info about a role
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ICY = { frost: 0x00d4ff, glacier: 0x0096c7, violet: 0x9b5de5, neon: 0x7df9ff, amber: 0xffd60a, success: 0x00f5a0, error: 0xff3d71 };

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('role-info')
    .setDescription('View detailed info about a role')
    .addRoleOption(opt => opt.setName('role').setDescription('The role to inspect').setRequired(true)),

  async execute(interaction) {
    const role = interaction.options.getRole('role');

    const perms = role.permissions.toArray();
    const hasManage = perms.includes('ManageChannels') || perms.includes('Administrator');
    const highlight = ['Administrator','ManageChannels','ManageMessages','KickMembers','BanMembers','ManageRoles'].filter(p => perms.includes(p));

    const embed = new EmbedBuilder()
      .setColor(role.color || ICY.frost)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle(`${role.name}`)
      .setDescription([
        '```',
        `  ╭─ Role Info`,
        `  │  Name      : ${role.name}`,
        `  │  ID        : ${role.id}`,
        `  │  Color     : ${role.color ? `#${role.color.toString(16).toUpperCase().padStart(6,'0')}` : 'default'}`,
        `  │  Hoisted   : ${role.hoist ? '✅ Yes' : '❌ No'}`,
        `  │  Mentionable: ${role.mentionable ? '✅ Yes' : '❌ No'}`,
        `  │  Position  : ${role.position} / ${interaction.guild.roles.cache.size}`,
        `  ╰────────────────────────`,
        '```',
        '',
        highlight.length
          ? `**⚠️ Notable Permissions:** ${highlight.map(p => `\`${p}\``).join(', ')}`
          : `**ℹ️ Permissions:** ${perms.length ? perms.slice(0,10).join(', ') + (perms.length > 10 ? ` +${perms.length-10}` : '') : 'none'}`,
        '',
        `**👥 Members:** ${role.members.size}`,
        `**📅 Created:** <t:${Math.floor(role.createdAt.getTime()/1000)}:D>`,
      ].join('\n'))
      .setFooter({ text: '✦ Icy Companion — Role Info' })
      .setTimestamp();

    if (role.iconURL()) embed.setThumbnail(role.iconURL());

    return interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
