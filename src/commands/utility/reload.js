const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');

const loadCommands = require('../../handlers/loadCommands');

module.exports = {
  category: 'utility',

  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Reload all command files')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    try {
      await interaction.reply({
        content: '⏳ Reloading commands...',
        ephemeral: true
      });

      const result = loadCommands(client || interaction.client);

      const embed = new EmbedBuilder()
        .setColor(result.failed > 0 ? 0xffcc00 : 0x57f287)
        .setTitle('✅ Reload Complete')
        .setDescription(`📜 Loaded ${result.loaded} command(s).\n${result.failed ? `⚠️ Failed ${result.failed} command(s).` : 'No failures.'}`)
        .setTimestamp();

      return interaction.editReply({
        content: null,
        embeds: [embed]
      });
    } catch (err) {
      console.error('[RELOAD ERROR]', err);

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: '❌ Failed to reload commands.',
          embeds: []
        }).catch(() => null);
      }

      return interaction.reply({
        content: '❌ Failed to reload commands.',
        ephemeral: true
      }).catch(() => null);
    }
  }
};
