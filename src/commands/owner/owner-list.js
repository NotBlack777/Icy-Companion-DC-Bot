const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('owner-list')
    .setDescription('Show all owners'),

  async execute(interaction, client, config) {

    const owners = [
      config.owner,
      ...(config.extraOwners || [])
    ];

    const list = owners.map(id => `<@${id}>`).join('\n');

    return interaction.reply({
      content: `👑 Owners:\n${list || 'None'}`
    });
  }
};