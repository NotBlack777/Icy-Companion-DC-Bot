const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/uiHelper');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a random number')
    .addIntegerOption(option =>
      option.setName('max').setDescription('Maximum number (default 100)').setRequired(false).setMinValue(1).setMaxValue(1000000)),

  async execute(interaction) {
    const max = interaction.options.getInteger('max') || 100;
    const result = Math.floor(Math.random() * max) + 1;

    const embed = createEmbed({
      description: `### 🎲 Dice Roll\n> Range: \`1 - ${max}\`\n> Result: **${result}**`,
      footer: { text: `Rolled by ${interaction.user.tag}` },
      timestamp: true
    });

    await interaction.reply({ embeds: [embed] });
  }
};
