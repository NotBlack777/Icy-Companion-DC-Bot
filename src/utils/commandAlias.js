/**
 * Command alias helper.
 *
 * The help panel uses hyphenated names (server-info, bot-info, ...), but
 * the original names (serverinfo, botinfo, ...) are already in people's
 * muscle memory and in older messages.
 *
 * makeAlias() wraps an existing command module so both names resolve to
 * the same execute(), without duplicating any logic.
 */

const { SlashCommandBuilder } = require('discord.js');

/**
 * Rebuild a SlashCommandBuilder under a new name, preserving options.
 *
 * Rebuilding from JSON keeps every option, type, choice and constraint
 * intact - safer than hand-copying option definitions.
 */
function rebuild(data, name, description) {
  const json = data.toJSON();

  const builder = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description || json.description);

  if (json.default_member_permissions) {
    builder.setDefaultMemberPermissions(json.default_member_permissions);
  }

  if (Array.isArray(json.contexts) && json.contexts.length) {
    builder.setContexts(json.contexts);
  }

  if (Array.isArray(json.integration_types) && json.integration_types.length) {
    builder.setIntegrationTypes(json.integration_types);
  }

  // Options are copied verbatim through the raw JSON payload.
  const rebuilt = builder.toJSON();
  rebuilt.options = json.options || [];

  return {
    ...builder,
    toJSON: () => rebuilt
  };
}

/**
 * Create an alias module for a command.
 *
 * @param {object} command      The original command module.
 * @param {string} name         Alias command name.
 * @param {object} [options]
 * @param {string} [options.description] Override the description.
 */
function makeAlias(command, name, options = {}) {
  return {
    category: command.category,
    aliasOf: command.data.name,

    data: rebuild(command.data, name, options.description),

    execute(interaction, client, config) {
      return command.execute(interaction, client, config);
    }
  };
}

module.exports = { makeAlias, rebuild };
