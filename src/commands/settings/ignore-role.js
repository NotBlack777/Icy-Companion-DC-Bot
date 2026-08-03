const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

module.exports = {
  category: 'settings',

  data: new SlashCommandBuilder()
    .setName('ignore-role')
    .setDescription('Toggle whether a role is ignored by the bot')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role to ignore or un-ignore')
        .setRequired(true)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const role = interaction.options.getRole('role');

    config.ignoreRoles = Array.isArray(config.ignoreRoles) ? config.ignoreRoles : [];

    // Toggle: adding an already-ignored role removes it again.
    const wasIgnored = config.ignoreRoles.includes(role.id);

    config.ignoreRoles = wasIgnored
      ? config.ignoreRoles.filter(id => id !== role.id)
      : [...config.ignoreRoles, role.id];

    saveServerConfig(interaction.guild.id, config);

    const embed = new EmbedBuilder()
      .setColor(wasIgnored ? 0x57f287 : 0xed4245)
      .setTitle(wasIgnored ? '✅ Role Un-ignored' : '🚫 Role Ignored')
      .setDescription([
        `> **Role:** ${role}`,
        wasIgnored
          ? '> Members with this role can use the bot again.'
          : '> Members with this role can no longer use bot commands.',
        '',
        `> **Total ignored roles:** \`${config.ignoreRoles.length}\``
      ].join('\n'))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
