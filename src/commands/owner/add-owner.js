const { SlashCommandBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

function getPrimaryOwner(config, guild) {
  return config.owner || guild.ownerId;
}

module.exports = {
  category: 'owner',

  data: new SlashCommandBuilder()
    .setName('add-owner')
    .setDescription('Add a server bot owner')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to add')
        .setRequired(true)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const primaryOwner = getPrimaryOwner(config, interaction.guild);
    const user = interaction.options.getUser('user');

    if (!user) {
      return interaction.reply({
        content: '❌ User not found.',
        ephemeral: true
      });
    }

    if (user.id === primaryOwner || user.id === interaction.guild.ownerId) {
      return interaction.reply({
        content: '⚠️ That user is already the primary/server owner.',
        ephemeral: true
      });
    }

    config.owner = primaryOwner;
    config.extraOwners = Array.isArray(config.extraOwners) ? config.extraOwners : [];

    if (config.extraOwners.includes(user.id)) {
      return interaction.reply({
        content: '❌ User is already a server owner.',
        ephemeral: true
      });
    }

    config.extraOwners.push(user.id);
    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({
      content: `👑 Added server owner: **${user.tag}**`
    });
  }
};
