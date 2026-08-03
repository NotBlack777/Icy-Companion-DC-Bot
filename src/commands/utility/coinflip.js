const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  category: 'utility',

  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),

  async execute(interaction) {
    const result =
      Math.random() < 0.5
        ? 'Heads'
        : 'Tails';

    const emoji =
      result === 'Heads'
        ? '🪙'
        : '🎲';

    const embed = new EmbedBuilder()
      .setColor(0x7DD3FC)
      .setTitle('🪙 Coin Flip')
      .setDescription(
        `${emoji} Result: **${result}**`
      )
      .setFooter({
        text: `Flipped by ${interaction.user.tag}`,
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });
  },
};