const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('set-staff-role')
    .setDescription('Set the staff role used for attendance and staff commands')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Staff role (leave empty to clear)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const role = interaction.options.getRole('role');
    const previous = config.staffRole;

    // No role given = clear the setting.
    if (!role) {
      config.staffRole = null;
      saveServerConfig(interaction.guild.id, config);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle('🧹 Staff Role Cleared')
          .setDescription(
            previous
              ? `> Removed: <@&${previous}>\n> Only owners can use staff commands now.`
              : '> No staff role was set.'
          )
          .setTimestamp()]
      });
    }

    if (role.managed) {
      return interaction.reply({
        content: '❌ That role is managed by an integration and cannot be used.',
        ephemeral: true
      });
    }

    config.staffRole = role.id;
    saveServerConfig(interaction.guild.id, config);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('✅ Staff Role Set')
      .setDescription([
        `> **Role:** ${role}`,
        `> **Members:** \`${role.members.size}\``,
        previous && previous !== role.id ? `> **Previous:** <@&${previous}>` : null,
        '',
        '> Members with this role can use staff-level commands.'
      ].filter(Boolean).join('\n'))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
