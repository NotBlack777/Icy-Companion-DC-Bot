const { SlashCommandBuilder } = require('discord.js');
const {
  getServerConfig,
  saveServerConfig
} = require('../../utils/configManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-owner')
    .setDescription('Add extra owner')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to add')
        .setRequired(true)
    ),

  async execute(interaction) {

    const config = getServerConfig(
      interaction.guild.id
    );

    if (!config.owner) {
      return interaction.reply({
        content: '❌ No owner has been set for this server yet.',
        ephemeral: true
      });
    }

    if (config.owner !== interaction.user.id) {
      return interaction.reply({
        content: '❌ Owner only.',
        ephemeral: true
      });
    }

    const user =
      interaction.options.getUser('user');

    if (!config.extraOwners) {
      config.extraOwners = [];
    }

    if (config.extraOwners.includes(user.id)) {
      return interaction.reply({
        content: '❌ User is already an extra owner.',
        ephemeral: true
      });
    }

    config.extraOwners.push(user.id);

    saveServerConfig(
      interaction.guild.id,
      config
    );

    return interaction.reply({
      content: `👑 Added extra owner: **${user.tag}**`
    });
  }
};