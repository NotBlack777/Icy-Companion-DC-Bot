const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a number')
    .addIntegerOption(option =>
      option
        .setName('max')
        .setDescription('Maximum number')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const max =
      interaction.options.getInteger('max') || 100;

    const result =
      Math.floor(Math.random() * max) + 1;

    const embed = new EmbedBuilder()
      .setColor(0x7DD3FC)
      .setTitle('🎲 Dice Roll')
      .addFields(
        {
          name: 'Maximum',
          value: `\`${max}\``,
          inline: true,
        },
        {
          name: 'Result',
          value: `\`${result}\``,
          inline: true,
        },
      )
      .setFooter({
        text: `Rolled by ${interaction.user.tag}`,
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });
  },
};