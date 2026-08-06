/**
 * Slash bridge
 * ------------
 * Turns every registry command into a real slash command so the exact
 * same feature set is available as `/servers`, `/kick`, `/dm-mode-server`, ...
 *
 * Multi-word names like "report weekly" become "report-weekly", and
 * "turn on privacy mode" becomes "privacy-on", because Discord command
 * names cannot contain spaces.
 *
 * All of these are DM-capable (InteractionContextType.BotDM) and are
 * hidden from non-owners by a runtime permission check in the executor.
 */

const {
  SlashCommandBuilder,
  InteractionContextType,
  MessageFlags
} = require('discord.js');

const registry = require('./registry');
const executor = require('./executor');
const loadDmCommands = require('./loadCommands');
const { safeDefer, safeEdit } = require('../utils/interactionResponder');

/**
 * Explicit slash names where the auto-generated one would be poor.
 */
const SLASH_NAME_OVERRIDES = {
  'report weekly': 'report-weekly',
  'report monthly': 'report-monthly',
  'dm blacklist add': 'dm-blacklist-add',
  'dm blacklist remove': 'dm-blacklist-remove',
  'dm blacklist list': 'dm-blacklist-list',
  'dm mode dm': 'dm-mode-dm',
  'dm mode server': 'dm-mode-server',
  'dm status': 'dm-status',
  'turn on privacy mode': 'privacy-on',
  'turn off privacy mode': 'privacy-off',
  'turn on otjoin mode': 'otjoin-on',
  'turn off otjoin mode': 'otjoin-off',
  'force restart': 'force-restart',
  addsuperowner: 'add-super-owner',
  removesuperowner: 'remove-super-owner',
  'serverowner add': 'server-owner-add',
  'serverowner remove': 'server-owner-remove',
  'serverowner list': 'server-owner-list',

  // These names already exist as guild commands - prefix to avoid a clash.
  help: 'dm-help',
  attendance: 'dm-attendance',
  config: 'dm-config',
  invite: 'dm-invite',
  status: 'dm-status-bot',
  remind: 'dm-remind'
};

function slashName(command) {
  return SLASH_NAME_OVERRIDES[command.name] || command.name.replace(/\s+/g, '-');
}

/**
 * Map a registry arg type to an option builder call.
 */
function addOption(builder, arg) {
  const name = arg.name.toLowerCase();
  const required = Boolean(arg.required);

  const describe = option => option
    .setName(name)
    .setDescription(arg.desc || describeArg(arg))
    .setRequired(required);

  if (arg.type === 'int') {
    return builder.addIntegerOption(describe);
  }

  // Everything else takes a string: user/channel/server IDs are given as
  // raw IDs or #N, which the parser already understands.
  return builder.addStringOption(option => {
    const opt = describe(option);
    if (arg.type === 'rest') opt.setMaxLength(1800);
    return opt;
  });
}

function describeArg(arg) {
  switch (arg.type) {
    case 'server': return 'Config number (#1) or server ID';
    case 'user': return 'User ID or mention';
    case 'channel': return 'Channel ID';
    case 'int': return 'A number';
    case 'rest': return 'Message text';
    default: return arg.name;
  }
}

/**
 * Build a loadable command module for one registry entry.
 */
function buildSlashCommand(command) {
  const builder = new SlashCommandBuilder()
    .setName(slashName(command))
    .setDescription(command.desc.slice(0, 100))
    // Usable in servers, bot DMs and group DMs.
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    );

  for (const arg of command.args || []) {
    addOption(builder, arg);
  }

  return {
    category: 'dm',
    dmCommand: command.name,
    data: builder,

    async execute(interaction, client) {
      // Owner-only surface: never leak internals to a normal member.
      const args = {};

      for (const arg of command.args || []) {
        const value = interaction.options.get(arg.name.toLowerCase())?.value;
        args[arg.name] = value ?? null;
      }

      // Long-running commands (broadcast, remind, find) need a defer.
      await safeDefer(interaction, { ephemeral: true });

      const ctx = {
        client: client || interaction.client,
        user: interaction.user,
        channel: interaction.channel,
        guild: interaction.guild,
        interaction,
        message: null,
        source: 'slash'
      };

      const payload = await executor.execute(command, ctx, args, []);

      if (!payload) {
        return safeEdit(interaction, {
          content: '🚫 You do not have access to this command.',
          flags: MessageFlags.Ephemeral
        });
      }

      return safeEdit(interaction, payload);
    }
  };
}

/**
 * Every registry command as a slash-ready module.
 *
 * Loads the registry first, so this works even when slash.js is
 * required before src/dm/index.js.
 */
function buildAll() {
  loadDmCommands();
  return registry.all().map(buildSlashCommand);
}

module.exports = { buildAll, buildSlashCommand, slashName, SLASH_NAME_OVERRIDES };
