const { Events } = require('discord.js');
const { getServerConfig } = require('../utils/configManager');
const safeRun = require('../utils/safeRunner');

const {
  buildHelpEmbed,
  buildHelpComponents,
  HELP_CATEGORIES
} = require('../ui/help/HelpSystem');

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {

    try {

      // =========================
      // HELP BUTTONS
      // =========================

      if (interaction.isButton()) {

        if (!interaction.customId.startsWith('help_'))
          return;

        let page = 0;

        const footer =
          interaction.message.embeds[0]?.footer?.text;

        const match =
          footer?.match(/Page (\d+)\//);

        if (match) {
          page = Number(match[1]) - 1;
        }

        switch (interaction.customId) {

          case 'help_first':
            page = 0;
            break;

          case 'help_previous':
            page = Math.max(0, page - 1);
            break;

          case 'help_home':
            page = 0;
            break;

          case 'help_next':
            page = Math.min(
              HELP_CATEGORIES.length - 1,
              page + 1
            );
            break;

          case 'help_last':
            page = HELP_CATEGORIES.length - 1;
            break;
        }

        return interaction.update({
          embeds: [
            buildHelpEmbed(
              page,
              client,
              interaction.guild
            )
          ],
          components:
            buildHelpComponents(page)
        });
      }

      // =========================
      // HELP DROPDOWN
      // =========================

      if (interaction.isStringSelectMenu()) {

        if (interaction.customId !== 'help_select')
          return;

        const page =
          Number(interaction.values[0]);

        return interaction.update({
          embeds: [
            buildHelpEmbed(
              page,
              client,
              interaction.guild
            )
          ],
          components:
            buildHelpComponents(page)
        });
      }

      // =========================
      // SLASH COMMANDS
      // =========================

      if (!interaction.isChatInputCommand())
        return;

      if (!interaction.guild) {
        return interaction.reply({
          content: '❌ Only works in servers.',
          ephemeral: true
        });
      }

      const command =
        client.commands.get(
          interaction.commandName.toLowerCase()
        );

      if (!command) {
        return interaction.reply({
          content: '❌ Command not found.',
          ephemeral: true
        });
      }

      const config =
        getServerConfig(interaction.guild.id);

      await safeRun(
        command,
        interaction,
        client,
        config
      );

    } catch (err) {

      console.error(err);

      if (!interaction.replied &&
          !interaction.deferred) {

        interaction.reply({
          content: '❌ Something broke.',
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};