const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/uiHelper');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),

  async execute(interaction) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '🪙' : '🪙';

    const embed = createEmbed({
      description: `### ${emoji} Coin Flip\n> The coin landed on: **${result}**`,
      footer: { text: `Flipped by ${interaction.user.tag}` },
      timestamp: true
    });

    await interaction.reply({ embeds: [embed] });
  }
};
