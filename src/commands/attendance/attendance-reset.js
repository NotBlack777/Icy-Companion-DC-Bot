const { SlashCommandBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { clearGuildStreaks } = require('../../utils/streakSystem');
const { guard } = require('../../utils/guildAuth');

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('attendance-reset')
    .setDescription('Reset attendance and streaks for this server'),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

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
