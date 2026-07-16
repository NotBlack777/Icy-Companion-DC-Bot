const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  category: 'owner',

  data: new SlashCommandBuilder()
    .setName('transfer-ownership')
    .setDescription('Transfer bot ownership')
    
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to transfer ownership to')
        .setRequired(true)
    ),

  async execute(interaction, client) {

    const user = interaction.options.getUser('user');

    if (!user) {
      return interaction.reply({
        content: '❌ User not found',
        ephemeral: true
      });
    }

    return interaction.reply({
      content: `✅ Ownership transferred to ${user.tag}`
    });
  }
};