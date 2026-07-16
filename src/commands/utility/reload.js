const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

const {
  loadCommands
} = require('../../handlers/loadCommands');

const emojis = {
  success: '✅',
  settings: '⚙️',
  search: '🔍',
  rocket: '🚀',
  premium: '👑',
  loading: '⏳',
  home: '🏠',
  file: '📁',
  error: '❌',
  commands: '📜'
};

module.exports = {

  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Reload all commands'),

  async execute(interaction, client) {

    try {

      await interaction.reply({
        content:
          `${emojis.loading} Reloading commands...`
      });

      loadCommands(client);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(
          `${emojis.success} Reload Complete`
        )
        .setDescription(
          `${emojis.commands} Loaded ${client.commands.size} commands`
        )
        .setTimestamp();

      await interaction.editReply({
        content: null,
        embeds: [embed]
      });

    } catch (err) {

      console.log(err);

      await interaction.editReply({
        content:
          `${emojis.error} Failed to reload commands`
      });

    }
  }
};