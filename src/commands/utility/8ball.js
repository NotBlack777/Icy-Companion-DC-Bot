const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/uiHelper');

const responses = [
  'Yes.', 'No.', 'Maybe.', 'Definitely.', 'Absolutely not.',
  'Most likely.', 'Very doubtful.', 'Without a doubt.',
  'Ask again later.', 'Signs point to yes.', 'I don’t think so.',
  'It is certain.', 'Concentrate and ask again.'
];

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(option =>
      option.setName('question').setDescription('Your question').setRequired(true).setMaxLength(1024)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const response = responses[Math.floor(Math.random() * responses.length)];

    const embed = createEmbed({
      description: `### 🎱 Magic 8-Ball\n> **Question:** ${question}\n> **Answer:** ${response}`,
      footer: { text: `Asked by ${interaction.user.tag}` },
      timestamp: true
    });

    await interaction.reply({ embeds: [embed] });
  }
};
