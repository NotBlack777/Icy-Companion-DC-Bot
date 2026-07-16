const { SlashCommandBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-owner')
    .setDescription('Remove extra owner')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),

  async execute(interaction, client, config) {

    if (config.owner !== interaction.user.id) {
      return interaction.reply({ content: '❌ Owner only.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');

    config.extraOwners = config.extraOwners.filter(id => id !== user.id);

    saveServerConfig(interaction.guild.id, config);

    return interaction.reply({
      content: `❌ Removed extra owner: **${user.tag}**`
    });
  }
};