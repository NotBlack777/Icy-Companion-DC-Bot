const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

const responses = [
  'Yes.',
  'No.',
  'Maybe.',
  'Definitely.',
  'Absolutely not.',
  'Most likely.',
  'Very doubtful.',
  'Without a doubt.',
  'Ask again later.',
  'Signs point to yes.',
  'I don’t think so.',
  'It is certain.',
  'Concentrate and ask again.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your question')
        .setRequired(true)
    ),

  async execute(interaction) {
    const question =
      interaction.options.getString(
        'question'
      );

    const response =
      responses[
        Math.floor(
          Math.random() * responses.length
        )
      ];

    const embed = new EmbedBuilder()
      .setColor(0x7DD3FC)
      .setTitle('🎱 Magic 8-Ball')
      .addFields(
        {
          name: '❓ Question',
          value: question,
        },
        {
          name: '🎱 Answer',
          value: response,
        },
      )
      .setFooter({
        text: `Asked by ${interaction.user.tag}`,
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });
  },
};