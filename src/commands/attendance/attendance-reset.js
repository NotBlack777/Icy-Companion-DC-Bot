const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('attendance-reset')
    .setDescription('Reset attendance (owner only)'),

  async execute(interaction) {

    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        content: '❌ Owner only',
        ephemeral: true
      });
    }

    const file = path.join(__dirname, '../../../server-config', `${interaction.guild.id}.json`);
    const streakFile = path.join(__dirname, '../../../server-config', 'attendance-streak.json');

    const config = JSON.parse(fs.readFileSync(file, 'utf8'));

    config.attendance = {};

    fs.writeFileSync(file, JSON.stringify(config, null, 2));

    if (fs.existsSync(streakFile)) {
      const streaks = JSON.parse(fs.readFileSync(streakFile, 'utf8'));

      for (const key in streaks) {
        if (key.startsWith(interaction.guild.id)) {
          delete streaks[key];
        }
      }

      fs.writeFileSync(streakFile, JSON.stringify(streaks, null, 2));
    }

    return interaction.reply('✅ Attendance reset done');
  }
};