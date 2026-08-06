const { SlashCommandBuilder } = require('discord.js');
const { saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

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
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const currentOwner = config.owner || interaction.guild.ownerId;
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
