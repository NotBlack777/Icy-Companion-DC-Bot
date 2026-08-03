const { SlashCommandBuilder } = require('discord.js');
const globalStore = require('../../utils/globalStore');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('store-emoji')
    .setDescription('Store a custom emoji for the bot UI')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the emoji key (e.g. success, error, info)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('emoji')
        .setDescription('The emoji to store (format: <:name:id> or raw emoji)')
        .setRequired(true)),

  async execute(interaction) {
    if (!globalStore.isSuperOwner(interaction.user.id)) {
      return interaction.reply({
        content: '❌ This command is restricted to the bot owner.',
        ephemeral: true
      });
    }

    const name = interaction.options.getString('name');
    const emoji = interaction.options.getString('emoji');

    globalStore.setEmoji(name, emoji);

    return interaction.reply({
      content: `✅ Stored emoji **${name}**: ${emoji}`,
      ephemeral: true
    });
  }
};
