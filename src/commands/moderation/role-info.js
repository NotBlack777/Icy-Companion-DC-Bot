/**
 * /role-info — View detailed info about a role
 */
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e, COLORS, BRAND } = require('../../utils/uiHelper');
const {
  getDisplayRolePosition,
  formatRolePosition,
  roleHexColor
} = require('../../utils/rolePosition');

const NOTABLE_PERMISSIONS = [
  'Administrator',
  'ManageGuild',
  'ManageRoles',
  'ManageChannels',
  'ManageMessages',
  'KickMembers',
  'BanMembers',
  'ModerateMembers',
  'MentionEveryone'
];

function formatPermissionName(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2');
}

module.exports = {
  category: 'moderation',

  data: new SlashCommandBuilder()
    .setName('role-info')
    .setDescription('View detailed info about a role')
    .addRoleOption(opt => opt.setName('role').setDescription('The role to inspect').setRequired(true)),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const perms = role.permissions.toArray();
    const notable = NOTABLE_PERMISSIONS.filter(permission => perms.includes(permission));
    const hierarchy = getDisplayRolePosition(interaction.guild, role);
    const roleIcon = role.iconURL?.({ size: 256 }) || null;
    const roleMention = role.id === interaction.guild.id ? '@everyone' : `<@&${role.id}>`;

    const embed = createEmbed({
      author: {
        name: `${interaction.guild.name} • Role Matrix`,
        iconURL: interaction.guild.iconURL?.() || interaction.client.user?.displayAvatarURL?.() || undefined
      },
      title: `${e('shard')} Role Status: ${role.name}`,
      description: [
        `${e('security')} **Identity:** ${roleMention}`,
        `${e('premium')} **Hierarchy Position:** \`${formatRolePosition(hierarchy)}\``,
        `${e('ice')} **Top means #1** — higher roles are counted from the top, not Discord's raw bottom-up number.`,
        '',
        `${e('settings')} **Color:** \`${roleHexColor(role)}\``,
        `${e('staff')} **Members:** \`${role.members.size}\``,
        `${e('commands')} **Permissions:** \`${perms.length}\` total`,
        `${e('uptime')} **Created:** <t:${Math.floor(role.createdAt.getTime() / 1000)}:D>`
      ].join('\n'),
      fields: [
        {
          name: 'Hierarchy',
          value: [
            `**Position:** \`${hierarchy.position || '?'}\``,
            `**Total roles:** \`${hierarchy.total}\``,
            `**Above:** ${hierarchy.above ? `<@&${hierarchy.above.id}>` : '`None`'}`,
            `**Below:** ${hierarchy.below ? `<@&${hierarchy.below.id}>` : '`None`'}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Toggles',
          value: [
            `**Hoisted:** ${role.hoist ? '`Yes`' : '`No`'}`,
            `**Mentionable:** ${role.mentionable ? '`Yes`' : '`No`'}`,
            `**Managed:** ${role.managed ? '`Yes`' : '`No`'}`,
            `**Unicode Icon:** ${role.unicodeEmoji ? role.unicodeEmoji : '`None`'}`
          ].join('\n'),
          inline: true
        },
        {
          name: notable.length ? 'Notable Permissions' : 'Permissions',
          value: notable.length
            ? notable.map(permission => `\`${formatPermissionName(permission)}\``).join(' ')
            : (perms.length ? perms.slice(0, 12).map(formatPermissionName).join(', ') + (perms.length > 12 ? ` +${perms.length - 12} more` : '') : '`None`'),
          inline: false
        }
      ],
      thumbnail: roleIcon || interaction.guild.iconURL?.({ size: 512 }) || undefined,
      color: role.color || COLORS.orange,
      footer: { text: `${BRAND.footer} • Role ID: ${role.id}` },
      compact: true
    });

    return interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
