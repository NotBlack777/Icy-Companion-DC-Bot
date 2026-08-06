const { SlashCommandBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

module.exports = {
  category: 'owner',

  data: new SlashCommandBuilder()
    .setName('remove-owner')
    .setDescription('Remove a server bot owner')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to remove')
        .setRequired(true)
    ),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const primaryOwner = config.owner || interaction.guild.ownerId;
    const user = interaction.options.getUser('user');

    if (!user) {
      return interaction.reply({
        content: '❌ User not found.',
        ephemeral: true
      });
    }

    if (user.id === primaryOwner || user.id === interaction.guild.ownerId) {
      return interaction.reply({
        content: '❌ The primary/server owner cannot be removed with this command. Use `/transfer-ownership` first.',
        ephemeral: true
      });
    }

    config.owner = primaryOwner;
    config.extraOwners = Array.isArray(config.extraOwners) ? config.extraOwners : [];

    if (!config.extraOwners.includes(user.id)) {
      return interaction.reply({
        content: '⚠️ That user is not a server owner.',
        ephemeral: true
      });
    }

    config.extraOwners = config.extraOwners.filter(id => id !== user.id);
    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({
      content: `✅ Removed server owner: **${user.tag}**`
    });
  }
};
