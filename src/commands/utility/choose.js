const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, e } = require('../../utils/uiHelper');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Choose between multiple options')
    .addStringOption(option =>
      option.setName('choices').setDescription('Separate choices with commas').setRequired(true).setMaxLength(1000)),

  async execute(interaction) {
    const input = interaction.options.getString('choices');
    const choices = input.split(',').map(choice => choice.trim()).filter(Boolean);

    if (choices.length < 2) {
      return interaction.reply({ content: '❌ Please provide at least 2 choices separated by commas.', ephemeral: true });
    }

    const selected = choices[Math.floor(Math.random() * choices.length)];
    const formattedChoices = choices.map((c, i) => `**${i + 1}.** ${c}`).join('\n');

    const embed = createEmbed({
      description: `### 🤔 Decision Maker\n` +
                   `**Choices Provided:**\n${formattedChoices.slice(0, 500)}\n\n` +
                   `> ${e('success')} **I have chosen:** **${selected}**`,
      footer: { text: `Decided for ${interaction.user.tag}` },
      timestamp: true
    });

    await interaction.reply({ embeds: [embed] });
  }
};
