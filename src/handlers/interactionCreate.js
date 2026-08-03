const { Events } = require('discord.js');
const { getServerConfig } = require('../utils/configManager');
const { canUseCommand } = require('../utils/permissions');
const safeRun = require('../utils/safeRunner');

const {
  buildHelpEmbed,
  buildHelpComponents,
  HELP_CATEGORIES,
  clampPage
} = require('../ui/help/HelpSystem');

function getCurrentHelpPage(interaction) {
  const footer = interaction.message?.embeds?.[0]?.footer?.text;
  const match = footer?.match(/Page (\d+)\//);
  return match ? clampPage(Number(match[1]) - 1) : 0;
}

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    try {
      if (interaction.isButton()) {
        if (!interaction.customId.startsWith('help_')) return;

        let page = getCurrentHelpPage(interaction);

        switch (interaction.customId) {
          case 'help_first':
          case 'help_home':
            page = 0;
            break;
          case 'help_previous':
            page = clampPage(page - 1);
            break;
          case 'help_next':
            page = clampPage(page + 1);
            break;
          case 'help_last':
            page = HELP_CATEGORIES.length - 1;
            break;
          default:
            return;
        }

        return interaction.update({
          embeds: [buildHelpEmbed(page, client, interaction.guild)],
          components: buildHelpComponents(page)
        });
      }

      if (interaction.isStringSelectMenu()) {
        // Current help menu.
        if (interaction.customId === 'help_select') {
          const page = clampPage(Number(interaction.values[0]));

          return interaction.update({
            embeds: [buildHelpEmbed(page, client, interaction.guild)],
            components: buildHelpComponents(page)
          });
        }

        // Backwards compatibility for old help messages that used help-menu.
        if (interaction.customId === 'help-menu') {
          const requested = interaction.values[0];
          const page = Math.max(0, HELP_CATEGORIES.findIndex(category => category.id === requested));

          return interaction.update({
            embeds: [buildHelpEmbed(page, client, interaction.guild)],
            components: buildHelpComponents(page)
          });
        }

        return;
      }

      if (!interaction.isChatInputCommand()) return;

      if (!interaction.guild) {
        return interaction.reply({
          content: '❌ Only works in servers.',
          ephemeral: true
        });
      }

      const command = client.commands.get(interaction.commandName.toLowerCase());

      if (!command) {
        return interaction.reply({
          content: '❌ Command not found.',
          ephemeral: true
        });
      }

      const config = getServerConfig(interaction.guild.id);

      if (!canUseCommand(config, interaction)) {
        return interaction.reply({
          content: '🚫 You cannot use commands in this ignored context.',
          ephemeral: true
        });
      }

      return safeRun(command, interaction, client, config);
    } catch (err) {
      console.error('[INTERACTION ERROR]', err);

      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: '❌ Something broke.',
          ephemeral: true
        }).catch(() => null);
      }

      return interaction.followUp({
        content: '❌ Something broke.',
        ephemeral: true
      }).catch(() => null);
    }
  }
};
