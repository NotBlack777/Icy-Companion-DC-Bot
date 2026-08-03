const { SlashCommandBuilder } = require('discord.js');
const {
  getServerConfig,
  saveServerConfig
} = require('../../utils/configManager');
const { clearGuildStreaks } = require('../../utils/streakSystem');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('attendance-reset')
    .setDescription('Reset attendance and streaks for this server'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
    }

    const config = getServerConfig(interaction.guild.id);
    const primaryOwner = config.owner || interaction.guild.ownerId;
    const allowed = interaction.user.id === interaction.guild.ownerId || isOwner({ ...config, owner: primaryOwner }, interaction.user.id);

    if (!allowed) {
      return interaction.reply({
        content: '❌ Owner only.',
        ephemeral: true
      });
    }

    config.owner = config.owner || interaction.guild.ownerId;
    config.attendance = { users: {} };
    saveServerConfig(interaction.guild.id, config);

    const removedStreaks = clearGuildStreaks(interaction.guild.id);

    return interaction.reply({
      content: `✅ Attendance reset complete. Removed ${removedStreaks} streak record(s).`,
      ephemeral: true
    });
  }
};
