const { SlashCommandBuilder } = require('discord.js');
const {
  getServerConfig,
  saveServerConfig
} = require('../../utils/configManager');

function getPrimaryOwner(config, guild) {
  return config.owner || guild.ownerId;
}

module.exports = {
  category: 'owner',

  data: new SlashCommandBuilder()
    .setName('add-owner')
    .setDescription('Add an extra bot owner')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to add')
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
    const primaryOwner = getPrimaryOwner(config, interaction.guild);

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

    if (user.id === primaryOwner) {
      return interaction.reply({
        content: '⚠️ That user is already the primary owner.',
        ephemeral: true
      });
    }

    config.owner = primaryOwner;
    config.extraOwners = Array.isArray(config.extraOwners) ? config.extraOwners : [];

    if (config.extraOwners.includes(user.id)) {
      return interaction.reply({
        content: '❌ User is already an extra owner.',
        ephemeral: true
      });
    }

    config.extraOwners.push(user.id);
    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({
      content: `👑 Added extra owner: **${user.tag}**`
    });
  }
};
