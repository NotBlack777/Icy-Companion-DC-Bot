const { Events, MessageFlags } = require('discord.js');
const { getServerConfig } = require('../utils/configManager');
const { canUseCommand } = require('../utils/permissions');
const safeRun = require('../utils/safeRunner');
const { safeUpdate, safeReply } = require('../utils/interactionResponder');

const {
  buildHelpEmbed,
  buildHelpComponents,
  buildThinkingEmbed,
  buildDisabledComponents,
  HELP_CATEGORIES,
  clampPage
} = require('../ui/help/HelpSystem');

function getCurrentHelpPage(interaction) {
  const footer = interaction.message?.embeds?.[0]?.footer?.text;
  const match = footer?.match(/Page (\d+)\//);
  return match ? clampPage(Number(match[1]) - 1) : 0;
}

/**
 * Render a help page through the safe responder.
 *
 * Fast path is a silent, instant swap. If anything is slow the responder
 * acknowledges first (falling back to a visible "Thinking..." embed) so
 * the user never sees "Icy Companion took too long to respond".
 */
function renderHelpPage(interaction, client, page) {
  return safeUpdate(
    interaction,
    () => ({
      embeds: [buildHelpEmbed(page, client, interaction.guild)],
      components: buildHelpComponents(page)
    }),
    {
      thinking: () => ({
        embeds: [buildThinkingEmbed(client)],
        components: buildDisabledComponents(page)
      }),
      errorMessage: 'Could not open that help page. Try running /help again.'
    }
  );
}

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    const activeClient = client || interaction.client;

    try {
      /* ---------------- BUTTONS ---------------- */

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

        return renderHelpPage(interaction, activeClient, page);
      }

      /* ---------------- SELECT MENUS ---------------- */

      if (interaction.isStringSelectMenu()) {
        // Current help menu.
        if (interaction.customId === 'help_select') {
          const page = clampPage(Number(interaction.values[0]));
          return renderHelpPage(interaction, activeClient, page);
        }

        // Backwards compatibility for old help messages that used help-menu.
        if (interaction.customId === 'help-menu') {
          const requested = interaction.values[0];
          const page = Math.max(0, HELP_CATEGORIES.findIndex(category => category.id === requested));

          return renderHelpPage(interaction, activeClient, page);
        }

        return;
      }

      /* ---------------- SLASH COMMANDS ---------------- */

      if (!interaction.isChatInputCommand()) return;

      const command = activeClient.commands.get(interaction.commandName.toLowerCase());

      if (!command) {
        return safeReply(interaction, {
          content: '❌ Command not found.',
          flags: MessageFlags.Ephemeral
        });
      }

      // DM commands manage their own permissions and work outside guilds.
      if (!interaction.guild) {
        if (command.category === 'dm' || command.dmCommand) {
          return safeRun(command, interaction, activeClient, null);
        }

        return safeReply(interaction, {
          content: '❌ That command only works in a server. Use `/dm-help` to see DM commands.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = getServerConfig(interaction.guild.id);

      if (!canUseCommand(config, interaction)) {
        return safeReply(interaction, {
          content: '🚫 You cannot use commands in this ignored context.',
          flags: MessageFlags.Ephemeral
        });
      }

      return safeRun(command, interaction, activeClient, config);
    } catch (err) {
      console.error('[INTERACTION ERROR]', err);

      return safeReply(interaction, {
        content: '❌ Something broke.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
