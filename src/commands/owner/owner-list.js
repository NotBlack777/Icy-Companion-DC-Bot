const { SlashCommandBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');

module.exports = {
  category: 'owner',

  data: new SlashCommandBuilder()
    .setName('owner-list')
    .setDescription('Show all bot owners for this server'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
    }

    const config = getServerConfig(interaction.guild.id);
    const primaryOwner = config.owner || interaction.guild.ownerId;

    config.owner = primaryOwner;
    config.extraOwners = Array.isArray(config.extraOwners) ? config.extraOwners : [];
    saveServerConfig(interaction.guild.id, config);

    const owners = [...new Set([primaryOwner, ...config.extraOwners].filter(Boolean))];
    const list = owners.length
      ? owners.map((id, index) => `${index === 0 ? '👑 Primary' : '⭐ Extra'}: <@${id}>`).join('\n')
      : 'None';

    return interaction.reply({
      content: `👑 Owners:\n${list}`
    });
  }
};
