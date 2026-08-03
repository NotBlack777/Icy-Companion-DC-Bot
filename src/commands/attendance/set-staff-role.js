const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('set-staff-role')
    .setDescription('Add or remove a staff role (supports multiple roles)')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Staff role to add/remove')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Add or remove this role from staff roles')
        .setRequired(false)
        .addChoices(
          { name: 'Add', value: 'add' },
          { name: 'Remove', value: 'remove' }
        )
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const role = interaction.options.getRole('role');
    const action = interaction.options.getString('action') || 'add';

    if (role.managed) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.error)
          .setTitle('❌ Managed Role')
          .setDescription('That role is managed by an integration and cannot be used.')
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    // Ensure staffRoles array exists
    config.staffRoles = Array.isArray(config.staffRoles) ? config.staffRoles : [];

    if (action === 'remove') {
      if (!config.staffRoles.includes(role.id)) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(ICY.warn)
            .setTitle('⚠️ Not a Staff Role')
            .setDescription(`${role} is not configured as a staff role.`)
            .setFooter({ text: '✦ Icy Companion' })
            .setTimestamp()
          ],
          ephemeral: true
        });
      }

      config.staffRoles = config.staffRoles.filter(id => id !== role.id);
      config.staffRole = config.staffRoles[0] || null;
      saveServerConfig(interaction.guild.id, config);

      const remaining = config.staffRoles.map(id => `<@&${id}>`).join(', ') || '_None_';

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.warn)
          .setTitle('🗑️ Staff Role Removed')
          .setDescription([
            `> **Removed:** ${role}`,
            `> **Members affected:** \`${role.members.size}\``,
            '',
            `**Remaining staff roles:**`,
            remaining,
          ].join('\n'))
          .setFooter({ text: '✦ Icy Companion — Staff' })
          .setTimestamp()
        ]
      });
    }

    // Add action
    if (config.staffRoles.includes(role.id)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.warn)
          .setTitle('⚠️ Already Added')
          .setDescription(`${role} is already a staff role.`)
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    config.staffRoles.push(role.id);
    config.staffRole = config.staffRoles[0];
    saveServerConfig(interaction.guild.id, config);

    const allRoles = config.staffRoles.map(id => {
      const r = interaction.guild.roles.cache.get(id);
      return r ? `${r} (\`${r.members.size}\` members)` : `<@&${id}> _(deleted)_`;
    });

    const embed = new EmbedBuilder()
      .setColor(ICY.success)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle('✅ Staff Role Added')
      .setDescription([
        `> **Added:** ${role}`,
        `> **Members:** \`${role.members.size}\``,
        '',
        `**All staff roles (${config.staffRoles.length}):**`,
        ...allRoles.map((r, i) => `> ${i + 1}. ${r}`),
        '',
        '> Members with any of these roles can use staff commands.',
      ].join('\n'))
      .setFooter({ text: '✦ Icy Companion — Staff' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
