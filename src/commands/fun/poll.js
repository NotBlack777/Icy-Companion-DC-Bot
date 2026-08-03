const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Regional indicator letters A-J, used for multi-option polls.
const LETTERS = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯'];
const YES_NO = ['✅', '❌'];

module.exports = {
  category: 'fun',

  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a reaction poll')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('The poll question')
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption(option =>
      option
        .setName('options')
        .setDescription('Comma-separated options (2-10). Leave empty for a yes/no poll.')
        .setRequired(false)
        .setMaxLength(1000)
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question').trim();
    const rawOptions = interaction.options.getString('options');

    const choices = rawOptions
      ? rawOptions.split(',').map(part => part.trim()).filter(Boolean)
      : [];

    if (rawOptions && choices.length < 2) {
      return interaction.reply({
        content: '❌ Give at least 2 options, separated by commas.',
        ephemeral: true
      });
    }

    if (choices.length > 10) {
      return interaction.reply({
        content: '❌ A poll can have at most 10 options.',
        ephemeral: true
      });
    }

    const isYesNo = choices.length === 0;
    const emojis = isYesNo ? YES_NO : LETTERS.slice(0, choices.length);

    const body = isYesNo
      ? '✅ **Yes**\n❌ **No**'
      : choices.map((choice, i) => `${emojis[i]} **${choice}**`).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x7dd3fc)
      .setTitle('📊 ' + question)
      .setDescription(`${body}\n\n> React below to vote.`)
      .setAuthor({
        name: `Poll by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setFooter({ text: isYesNo ? 'Yes / No poll' : `${choices.length} options` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Reactions must go on the sent message, so fetch it back.
    const message = await interaction.fetchReply();

    for (const emoji of emojis) {
      try {
        await message.react(emoji);
      } catch (err) {
        console.warn(`[POLL] Could not react with ${emoji}: ${err.message}`);
        break;
      }
    }
  }
};
