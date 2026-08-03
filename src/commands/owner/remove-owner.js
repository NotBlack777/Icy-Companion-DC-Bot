const { SlashCommandBuilder } = require('discord.js');
const {
  getServerConfig,
  saveServerConfig
} = require('../../utils/configManager');

module.exports = {
  category: 'owner',

  data: new SlashCommandBuilder()
    .setName('remove-owner')
    .setDescription('Remove an extra bot owner')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to remove')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
    }

    const config = getServerConfig(interaction.guild.id);
    const primaryOwner = config.owner || interaction.guild.ownerId;

    if (interaction.user.id !== primaryOwner && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        content: '❌ Owner only.',
        ephemeral: true
      });
    }

    const user = interaction.options.getUser('user');

    if (!user) {
      return interaction.reply({
        content: '❌ User not found.',
        ephemeral: true
      });
    }

    config.owner = primaryOwner;
    config.extraOwners = Array.isArray(config.extraOwners) ? config.extraOwners : [];

    if (!config.extraOwners.includes(user.id)) {
      return interaction.reply({
        content: '⚠️ That user is not an extra owner.',
        ephemeral: true
      });
    }

    config.extraOwners = config.extraOwners.filter(id => id !== user.id);
    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({
      content: `✅ Removed extra owner: **${user.tag}**`
    });
  }
};
