const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  category: 'attendance',

  data: new SlashCommandBuilder()
    .setName('attendance-log')
    .setDescription('View attendance logs'),

  async execute(interaction) {

    const file = path.join(__dirname, '../../../server-config', `${interaction.guild.id}.json`);

    if (!fs.existsSync(file)) {
      return interaction.reply({ content: '❌ No config found', ephemeral: true });
    }

    const config = JSON.parse(fs.readFileSync(file, 'utf8'));

    const logs = config.attendance || {};

    const entries = Object.entries(logs)
      .slice(0, 10)
      .map(([k, v]) => `👤 ${k.split('-')[1]} → ${v}`);

    return interaction.reply({
      content: entries.length ? entries.join('\n') : 'No logs found'
    });
  }
};