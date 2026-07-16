const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription(
      'Choose between multiple options'
    )
    .addStringOption(option =>
      option
        .setName('choices')
        .setDescription(
          'Separate choices with commas'
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    const input =
      interaction.options.getString(
        'choices'
      );

    const choices = input
      .split(',')
      .map(choice => choice.trim())
      .filter(Boolean);

    if (choices.length < 2) {
      return interaction.reply({
        content:
          '❌ Please provide at least 2 choices separated by commas.',
        ephemeral: true,
      });
    }

    const selected =
      choices[
        Math.floor(
          Math.random() * choices.length
        )
      ];

    const formattedChoices =
      choices
        .map(
          (choice, index) =>
            `${index + 1}. ${choice}`
        )
        .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x7DD3FC)
      .setTitle('🤔 Choice Picker')
      .addFields(
        {
          name: '📋 Choices',
          value: formattedChoices,
          inline: false,
        },
        {
          name: '✅ Selected',
          value: `**${selected}**`,
          inline: false,
        },
      )
      .setFooter({
        text:
          `Requested by ${interaction.user.tag}`,
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });
  },
};