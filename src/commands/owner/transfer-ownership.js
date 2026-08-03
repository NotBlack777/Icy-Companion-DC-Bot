const { SlashCommandBuilder } = require('discord.js');
const {
  getServerConfig,
  saveServerConfig
} = require('../../utils/configManager');

module.exports = {
  category: 'owner',

  data: new SlashCommandBuilder()
    .setName('transfer-ownership')
    .setDescription('Transfer primary bot ownership')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to transfer ownership to')
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
    const currentOwner = config.owner || interaction.guild.ownerId;

    if (interaction.user.id !== currentOwner && interaction.user.id !== interaction.guild.ownerId) {
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

    if (user.id === currentOwner) {
      return interaction.reply({
        content: '⚠️ That user is already the primary owner.',
        ephemeral: true
      });
    }

    config.owner = user.id;
    config.extraOwners = (Array.isArray(config.extraOwners) ? config.extraOwners : [])
      .filter(id => id !== user.id);

    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({
      content: `✅ Ownership transferred to **${user.tag}**.`
    });
  }
};
