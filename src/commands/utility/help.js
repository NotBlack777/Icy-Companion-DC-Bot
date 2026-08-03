const { SlashCommandBuilder } = require('discord.js');
const {
  buildHelpEmbed,
  buildHelpComponents
} = require('../../ui/help/HelpSystem');

module.exports = {
  category: 'utility',

  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all bot commands'),

  async execute(interaction, client) {
    const activeClient = client || interaction.client;

    return interaction.reply({
      embeds: [buildHelpEmbed(0, activeClient, interaction.guild)],
      components: buildHelpComponents(0),
      ephemeral: false
    });
  }
};
